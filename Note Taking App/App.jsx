import { useState, useRef } from "react";

const FOLDERS = ["Personal", "Work", "Ideas", "Journal"];

const INITIAL_NOTES = [
  { id: 1, title: "Meeting Agenda", body: "Discuss Q3 roadmap\nReview open PRs\nPlan sprint goals", folder: "Work", pinned: true, created: "2026-06-01", deleted: false },
  { id: 2, title: "Book List", body: "The Dispossessed\nKlara and the Sun\nPiranesi\nLeGuin's collected essays", folder: "Personal", pinned: false, created: "2026-05-28", deleted: false },
  { id: 3, title: "App Ideas", body: "Spatial audio journaling\nCollaborative recipe builder\nReverse calendar planner", folder: "Ideas", pinned: true, created: "2026-05-20", deleted: false },
  { id: 4, title: "Today's Reflection", body: "Slow morning. Coffee on the balcony. Wind from the east. Noticed how the light catches the dust on the shelves—maybe that's a metaphor.", folder: "Journal", pinned: false, created: "2026-06-07", deleted: false },
  { id: 5, title: "Old Draft", body: "This needs revision...", folder: "Work", pinned: false, created: "2026-04-10", deleted: true },
  { id: 6, title: "Grocery run", body: "Oat milk, sourdough, tahini, lemons", folder: "Personal", pinned: false, created: "2026-05-30", deleted: true },
];

let nextId = 7;

const FOLDER_COLORS = {
  Personal: "#f9a26c",
  Work: "#6cb6f9",
  Ideas: "#b96cf9",
  Journal: "#6cf9b2",
};

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date("2026-06-07");
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── API helpers ──────────────────────────────────────────────────────────────
const API_BASE = "/api"; // change to your backend origin if needed

async function apiPatch(id, body) {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH /notes/${id} failed: ${res.status}`);
  return res.json(); // expects the updated note object back
}

async function apiDeleteTrash() {
  const res = await fetch(`${API_BASE}/notes/trash`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /notes/trash failed: ${res.status}`);
  return res.status === 204 ? null : res.json(); // { deleted: number } or 204
}
// ─────────────────────────────────────────────────────────────────────────────

export default function NotesApp() {
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [selectedFolder, setSelectedFolder] = useState("All");
  const [tab, setTab] = useState("active");
  const [activeNote, setActiveNote] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editFolder, setEditFolder] = useState("Personal");
  const [search, setSearch] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiLoading, setApiLoading] = useState(null); // noteId | "trash" | null
  const [apiError, setApiError] = useState(null);
  const bodyRef = useRef(null);

  const visibleNotes = notes.filter(n => {
    if (tab === "active" && n.deleted) return false;
    if (tab === "trash" && !n.deleted) return false;
    if (selectedFolder !== "All" && n.folder !== selectedFolder) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pinned = visibleNotes.filter(n => n.pinned && !n.deleted);
  const unpinned = visibleNotes.filter(n => !n.pinned || n.deleted);

  function openNote(note) {
    setActiveNote(note.id);
    setEditTitle(note.title);
    setEditBody(note.body);
    setEditFolder(note.folder);
    setIsNew(false);
  }

  function saveNote() {
    if (!editTitle.trim() && !editBody.trim()) return;
    if (isNew) {
      const nn = { id: nextId++, title: editTitle || "Untitled", body: editBody, folder: editFolder, pinned: false, created: "2026-06-07", deleted: false };
      setNotes(prev => [nn, ...prev]);
      setActiveNote(nn.id);
      setIsNew(false);
    } else {
      setNotes(prev => prev.map(n => n.id === activeNote ? { ...n, title: editTitle || "Untitled", body: editBody, folder: editFolder } : n));
    }
  }

  function newNote() {
    setActiveNote(null);
    setEditTitle("");
    setEditBody("");
    setEditFolder(selectedFolder !== "All" ? selectedFolder : "Personal");
    setIsNew(true);
    setTab("active");
    setTimeout(() => bodyRef.current?.focus(), 50);
  }

  // PATCH /notes/:id  { isDeleted: true }
  async function trashNote(id) {
    setApiLoading(id);
    setApiError(null);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, deleted: true } : n));
    if (activeNote === id) { setActiveNote(null); setIsNew(false); }
    try {
      await apiPatch(id, { isDeleted: true });
    } catch (e) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, deleted: false } : n));
      setApiError(e.message);
    } finally {
      setApiLoading(null);
    }
  }

  // PATCH /notes/:id  { isDeleted: false }
  async function restoreNote(id) {
    setApiLoading(id);
    setApiError(null);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, deleted: false } : n));
    try {
      await apiPatch(id, { isDeleted: false });
    } catch (e) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, deleted: true } : n));
      setApiError(e.message);
    } finally {
      setApiLoading(null);
    }
  }

  // PATCH /notes/:id  { isDeleted: true }  — backend purges on next cleanup cycle.
  // Swap to DELETE /notes/:id if your API exposes a hard-delete route directly.
  async function permanentDelete(id) {
    setConfirmDelete(null);
    setApiLoading(id);
    setApiError(null);
    const removed = notes.find(n => n.id === id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeNote === id) setActiveNote(null);
    try {
      await apiPatch(id, { isDeleted: true });
    } catch (e) {
      if (removed) setNotes(prev => [...prev, removed]);
      setApiError(e.message);
    } finally {
      setApiLoading(null);
    }
  }

  function togglePin(id) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  }

  // DELETE /notes/trash  — backend purges all isDeleted records
  async function emptyTrash() {
    setConfirmDelete(null);
    setApiLoading("trash");
    setApiError(null);
    const removed = notes.filter(n => n.deleted);
    setNotes(prev => prev.filter(n => !n.deleted));
    setActiveNote(null);
    try {
      await apiDeleteTrash();
    } catch (e) {
      setNotes(prev => [...prev, ...removed]);
      setApiError(e.message);
    } finally {
      setApiLoading(null);
    }
  }

  const folderCounts = FOLDERS.reduce((acc, f) => {
    acc[f] = notes.filter(n => n.folder === f && !n.deleted).length;
    return acc;
  }, {});
  const allCount = notes.filter(n => !n.deleted).length;
  const trashCount = notes.filter(n => n.deleted).length;

  const currentNote = notes.find(n => n.id === activeNote);

  const isLoadingNote = id => apiLoading === id;

  return (
    <div style={{
      display: "flex", height: "100vh", background: "#0f0f0f",
      fontFamily: "'DM Mono', 'Courier New', monospace", color: "#e8e2d9",
      overflow: "hidden", position: "relative"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,300&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
        .note-card { transition: background 0.15s, transform 0.15s; cursor: pointer; }
        .note-card:hover { background: #1c1c1c !important; }
        .note-card.active-card { background: #1a1a1a !important; border-left: 2px solid #c9b99a !important; }
        .folder-btn { transition: all 0.15s; cursor: pointer; border: none; text-align: left; }
        .folder-btn:hover { background: #1c1c1c !important; }
        .folder-btn.active-folder { background: #1f1f1f !important; color: #e8e2d9 !important; }
        .tab-btn { transition: all 0.2s; cursor: pointer; border: none; }
        .icon-btn { transition: opacity 0.15s; cursor: pointer; opacity: 0.45; border: none; background: none; }
        .icon-btn:hover { opacity: 1; }
        .icon-btn:disabled { opacity: 0.2; cursor: not-allowed; }
        .note-card:hover .hover-actions { opacity: 1 !important; }
        .hover-actions { opacity: 0; transition: opacity 0.15s; }
        textarea { resize: none; outline: none; border: none; }
        input { outline: none; border: none; }
        .fade-in { animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .confirm-overlay { animation: fadeIn 0.15s ease; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { display: inline-block; width: 10px; height: 10px; border: 1.5px solid #555; border-top-color: #c9b99a; border-radius: 50%; animation: spin 0.6s linear infinite; }
        .error-toast { animation: fadeIn 0.2s ease; }
      `}</style>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div style={{ width: 200, background: "#111", borderRight: "1px solid #1e1e1e", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 500, color: "#c9b99a", letterSpacing: "-0.02em" }}>notes.</div>
          </div>

          <div style={{ padding: "12px 12px 8px" }}>
            <button onClick={newNote} style={{ width: "100%", padding: "8px 10px", background: "#c9b99a", color: "#0f0f0f", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 500, letterSpacing: "0.04em" }}>
              + NEW NOTE
            </button>
          </div>

          <div style={{ padding: "4px 12px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#181818", borderRadius: 6, padding: "6px 10px" }}>
              <span style={{ opacity: 0.4, fontSize: 11 }}>⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="search..." style={{ background: "none", color: "#e8e2d9", fontSize: 11, fontFamily: "inherit", width: "100%", letterSpacing: "0.02em" }} />
            </div>
          </div>

          <div style={{ display: "flex", padding: "4px 12px 8px", gap: 4 }}>
            {["active", "trash"].map(t => (
              <button key={t} className="tab-btn" onClick={() => { setTab(t); setActiveNote(null); setIsNew(false); }} style={{ flex: 1, padding: "5px 4px", background: tab === t ? "#1f1f1f" : "none", color: tab === t ? "#c9b99a" : "#555", borderRadius: 5, fontSize: 10, fontFamily: "inherit", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {t === "trash" ? `trash${trashCount ? ` (${trashCount})` : ""}` : "notes"}
              </button>
            ))}
          </div>

          {tab === "active" && (
            <div style={{ padding: "0 8px", flex: 1, overflowY: "auto" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "#444", padding: "4px 8px 6px", textTransform: "uppercase" }}>Folders</div>
              {[{ label: "All Notes", key: "All", count: allCount }, ...FOLDERS.map(f => ({ label: f, key: f, count: folderCounts[f] }))].map(({ label, key, count }) => (
                <button key={key} className={`folder-btn ${selectedFolder === key ? "active-folder" : ""}`} onClick={() => setSelectedFolder(key)} style={{ width: "100%", padding: "7px 10px", background: "none", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", color: selectedFolder === key ? "#e8e2d9" : "#555", fontSize: 12, fontFamily: "inherit", marginBottom: 1 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: key !== "All" ? FOLDER_COLORS[key] : "#333", display: "inline-block", flexShrink: 0 }} />
                    {label}
                  </span>
                  <span style={{ fontSize: 10, color: "#3a3a3a" }}>{count}</span>
                </button>
              ))}
            </div>
          )}

          {tab === "trash" && trashCount > 0 && (
            <div style={{ padding: "8px 12px" }}>
              <button onClick={() => setConfirmDelete("all")} disabled={apiLoading === "trash"} style={{ width: "100%", padding: "7px", background: "none", border: "1px solid #2a1a1a", borderRadius: 6, color: apiLoading === "trash" ? "#555" : "#a05050", fontSize: 11, fontFamily: "inherit", cursor: apiLoading === "trash" ? "not-allowed" : "pointer", letterSpacing: "0.04em", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {apiLoading === "trash" ? <><span className="spinner" /> Emptying…</> : "Empty Trash"}
              </button>
            </div>
          )}

          <div style={{ height: 16 }} />
        </div>
      )}

      {/* NOTE LIST */}
      <div style={{ width: 260, background: "#0f0f0f", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 10px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e2d9", letterSpacing: "-0.01em" }}>
              {tab === "trash" ? "Trash" : selectedFolder === "All" ? "All Notes" : selectedFolder}
            </div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{visibleNotes.length} note{visibleNotes.length !== 1 ? "s" : ""}</div>
          </div>
          <button className="icon-btn" onClick={() => setSidebarOpen(s => !s)} style={{ color: "#888", fontSize: 14, padding: 4 }}>☰</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {visibleNotes.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#333", fontSize: 12 }}>
              {tab === "trash" ? "Trash is empty" : "No notes found"}
            </div>
          )}

          {tab === "active" && pinned.length > 0 && (
            <div style={{ padding: "4px 14px 2px", fontSize: 9, letterSpacing: "0.1em", color: "#3a3a3a", textTransform: "uppercase" }}>Pinned</div>
          )}
          {[...pinned, ...unpinned].map(note => (
            <div key={note.id} className={`note-card ${activeNote === note.id ? "active-card" : ""}`}
              onClick={() => openNote(note)}
              style={{ padding: "10px 14px", borderLeft: "2px solid transparent", position: "relative", userSelect: "none", opacity: isLoadingNote(note.id) ? 0.5 : 1, transition: "opacity 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: activeNote === note.id ? "#e8e2d9" : "#bbb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                  {isLoadingNote(note.id) ? <span className="spinner" style={{ verticalAlign: "middle" }} /> : null}
                  {" "}{note.title}
                </div>
                <div className="hover-actions" style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  {tab === "active" && (
                    <>
                      <button className="icon-btn" onClick={e => { e.stopPropagation(); togglePin(note.id); }} title={note.pinned ? "Unpin" : "Pin"} style={{ color: note.pinned ? "#c9b99a" : "#666", fontSize: 11, padding: "2px 3px" }}>
                        {note.pinned ? "◆" : "◇"}
                      </button>
                      <button className="icon-btn" disabled={!!apiLoading} onClick={e => { e.stopPropagation(); trashNote(note.id); }} title="Move to Trash" style={{ color: "#a05050", fontSize: 11, padding: "2px 3px" }}>
                        ✕
                      </button>
                    </>
                  )}
                  {tab === "trash" && (
                    <>
                      <button className="icon-btn" disabled={!!apiLoading} onClick={e => { e.stopPropagation(); restoreNote(note.id); }} title="Restore" style={{ color: "#6cf9b2", fontSize: 11, padding: "2px 3px" }}>↩</button>
                      <button className="icon-btn" disabled={!!apiLoading} onClick={e => { e.stopPropagation(); setConfirmDelete(note.id); }} title="Delete Forever" style={{ color: "#a05050", fontSize: 11, padding: "2px 3px" }}>⊗</button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#3d3d3d", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {note.body.split("\n")[0]}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: FOLDER_COLORS[note.folder] || "#444", display: "inline-block" }} />
                  <span style={{ fontSize: 9, color: "#3a3a3a", letterSpacing: "0.04em" }}>{note.folder}</span>
                </span>
                <span style={{ fontSize: 9, color: "#2e2e2e" }}>{timeAgo(note.created)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDITOR */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0a0a0a", position: "relative" }}>
        {(activeNote || isNew) ? (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "16px 28px 12px", borderBottom: "1px solid #181818", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <select value={editFolder} onChange={e => { setEditFolder(e.target.value); if (!isNew) saveNote(); }}
                style={{ background: "#181818", color: FOLDER_COLORS[editFolder] || "#c9b99a", border: "1px solid #252525", borderRadius: 5, padding: "5px 10px", fontSize: 11, fontFamily: "inherit", cursor: "pointer", letterSpacing: "0.04em" }}>
                {FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {activeNote && !currentNote?.deleted && (
                  <button className="icon-btn" onClick={() => togglePin(activeNote)} style={{ color: currentNote?.pinned ? "#c9b99a" : "#555", fontSize: 13, padding: "4px 6px" }} title={currentNote?.pinned ? "Unpin" : "Pin"}>
                    {currentNote?.pinned ? "◆" : "◇"}
                  </button>
                )}
                <button onClick={saveNote} style={{ padding: "6px 14px", background: "#c9b99a", color: "#0f0f0f", border: "none", borderRadius: 5, fontSize: 11, fontFamily: "inherit", fontWeight: 500, cursor: "pointer", letterSpacing: "0.04em" }}>
                  SAVE
                </button>
                {activeNote && !currentNote?.deleted && (
                  <button className="icon-btn" disabled={!!apiLoading} onClick={() => trashNote(activeNote)} style={{ color: "#804040", fontSize: 13, padding: "4px 6px", display: "flex", alignItems: "center", gap: 4 }} title="Move to Trash">
                    {isLoadingNote(activeNote) ? <span className="spinner" /> : "✕"}
                  </button>
                )}
                {activeNote && currentNote?.deleted && (
                  <>
                    <button disabled={!!apiLoading} onClick={() => restoreNote(activeNote)} style={{ padding: "6px 12px", background: "none", border: "1px solid #2a4a3a", color: isLoadingNote(activeNote) ? "#555" : "#6cf9b2", borderRadius: 5, fontSize: 11, fontFamily: "inherit", cursor: apiLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                      {isLoadingNote(activeNote) ? <><span className="spinner" /> Restoring…</> : "↩ Restore"}
                    </button>
                    <button className="icon-btn" disabled={!!apiLoading} onClick={() => setConfirmDelete(activeNote)} style={{ color: "#804040", fontSize: 13 }} title="Delete Forever">⊗</button>
                  </>
                )}
              </div>
            </div>

            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} onBlur={saveNote} placeholder="Title"
              readOnly={currentNote?.deleted}
              style={{ padding: "24px 28px 8px", background: "none", color: "#e8e2d9", fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 300, fontStyle: "italic", letterSpacing: "-0.02em", width: "100%", cursor: currentNote?.deleted ? "default" : "text" }} />

            <textarea ref={bodyRef} value={editBody} onChange={e => setEditBody(e.target.value)} onBlur={saveNote}
              placeholder={isNew ? "Start writing..." : ""}
              readOnly={currentNote?.deleted}
              style={{ flex: 1, padding: "8px 28px 28px", background: "none", color: "#888", fontSize: 13, fontFamily: "inherit", lineHeight: 1.8, letterSpacing: "0.01em", cursor: currentNote?.deleted ? "default" : "text" }} />

            {currentNote?.deleted && (
              <div style={{ padding: "10px 28px", borderTop: "1px solid #181818", fontSize: 11, color: "#5a3a3a", letterSpacing: "0.04em" }}>
                This note is in Trash — restore it to edit.
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#222" }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 48, fontStyle: "italic", fontWeight: 300, marginBottom: 8 }}>notes.</div>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {tab === "active" ? "Select or create a note" : "Select a note from trash"}
            </div>
          </div>
        )}

        {/* API Error Toast */}
        {apiError && (
          <div className="error-toast" style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#2a1010", border: "1px solid #5a2020", borderRadius: 7, padding: "10px 18px", fontSize: 11, color: "#f9a2a2", display: "flex", alignItems: "center", gap: 10, maxWidth: 380, zIndex: 50 }}>
            <span>⚠ {apiError}</span>
            <button onClick={() => setApiError(null)} style={{ background: "none", border: "none", color: "#a06060", cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}>✕</button>
          </div>
        )}
      </div>

      {/* CONFIRM DELETE MODAL */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141414", border: "1px solid #2a2a2a", borderRadius: 10, padding: "28px 32px", maxWidth: 360, width: "90%", textAlign: "center" }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontStyle: "italic", marginBottom: 8, color: "#e8e2d9" }}>Delete forever?</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 24, lineHeight: 1.6 }}>
              {confirmDelete === "all"
                ? "All notes in Trash will be permanently deleted by the server. This cannot be undone."
                : "This note will be permanently deleted. This cannot be undone."}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "8px 20px", background: "none", border: "1px solid #2a2a2a", color: "#888", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => confirmDelete === "all" ? emptyTrash() : permanentDelete(confirmDelete)} style={{ padding: "8px 20px", background: "#4a1a1a", border: "1px solid #7a2a2a", color: "#f9a2a2", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
