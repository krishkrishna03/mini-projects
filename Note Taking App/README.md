# notes.

A minimal, dark-themed notes app built with React. Supports folders, pinned notes, and a trash bin backed by a REST API.

---

## Features

- **Folder organization** — 4 built-in folders: Personal, Work, Ideas, Journal
- **Active / Trash tabs** — switch between live notes and deleted ones
- **Pin notes** — pinned notes appear at the top of the list
- **Trash bin** — soft-delete via `PATCH`, restore or permanently delete
- **Empty trash** — `DELETE /notes/trash` tells the backend to purge all deleted records
- **Optimistic updates** — UI responds instantly; rolls back on API failure
- **Error toast** — inline error banner if any API call fails
- **Search** — filters notes by title or body content
- **Auto-save** — notes save on blur; manual Save button also available
- **Collapsible sidebar** — toggle with the ☰ button

---

## Getting Started

### Prerequisites

- Node.js 18+
- A React project scaffold (e.g. Vite or Create React App)
- A running backend that implements the API contract below

### Installation

```bash
# 1. Create a new Vite + React project (if needed)
npm create vite@latest my-notes-app -- --template react
cd my-notes-app

# 2. Install dependencies
npm install

# 3. Drop notes-app.jsx into src/
cp notes-app.jsx src/NotesApp.jsx
```

### Usage

In `src/App.jsx`, replace the default content:

```jsx
import NotesApp from './NotesApp';

export default function App() {
  return <NotesApp />;
}
```

Then run:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## API Contract

The app talks to two endpoints. Both helpers live at the top of `NotesApp.jsx` and are easy to swap out.

### `PATCH /api/notes/:id`

Toggles the `isDeleted` flag on a note. Used for soft-delete, restore, and permanent-delete signalling.

**Request body**
```json
{ "isDeleted": true }
```
or
```json
{ "isDeleted": false }
```

**Response** — the updated note object:
```json
{
  "id": 1,
  "title": "Meeting Agenda",
  "isDeleted": true,
  ...
}
```

**Used by**

| Action | Payload |
|---|---|
| Move to Trash | `{ isDeleted: true }` |
| Restore from Trash | `{ isDeleted: false }` |
| Delete forever (single) | `{ isDeleted: true }` — backend purges on cleanup cycle |

> If your backend exposes a hard `DELETE /notes/:id` route, replace the `permanentDelete` function body with a `fetch(..., { method: 'DELETE' })` call instead.

---

### `DELETE /api/notes/trash`

Instructs the backend to permanently purge all records where `isDeleted = true`. The frontend removes them from local state optimistically before the request completes.

**Response** — either `204 No Content` or:
```json
{ "deleted": 6 }
```

---

### Changing the base URL

`API_BASE` is a constant at the top of `NotesApp.jsx`:

```js
const API_BASE = "/api"; // change to your backend origin, e.g. "https://api.example.com"
```

---

## Optimistic Updates & Error Handling

All three API-backed operations (trash, restore, empty trash) follow the same pattern:

1. Update local state immediately so the UI feels instant.
2. Fire the API call in the background.
3. On failure, roll back the local state to its previous value.
4. Surface the error message in a dismissible toast at the bottom of the editor.

While a request is in flight, the relevant note card fades slightly, action buttons are disabled, and a spinner appears inline.

---

## Project Structure

```
src/
└── NotesApp.jsx       # Single-file component — API helpers, state, and UI
```

---

## Component Overview

| Part | Description |
|---|---|
| **API helpers** | `apiPatch(id, body)` and `apiDeleteTrash()` at the top of the file |
| **Sidebar** | Folder list, note counts, New Note button, search input, Active/Trash tab switcher |
| **Note List** | Scrollable list filtered by folder/tab/search; pinned section; loading states per card |
| **Editor** | Title + body; folder selector; Save, Pin, Trash/Restore actions with spinner feedback |
| **Error Toast** | Appears at the bottom of the editor on any API failure; dismissible |
| **Confirm Modal** | Shown before permanent deletion of a single note or emptying trash |

---

## Data Model

Each note is a plain object in local state:

```js
{
  id: Number,        // unique identifier
  title: String,
  body: String,
  folder: String,    // one of the FOLDERS array values
  pinned: Boolean,
  created: String,   // "YYYY-MM-DD"
  deleted: Boolean   // mirrors isDeleted on the backend
}
```

The frontend uses `deleted` internally; the API sends and receives `isDeleted` — adjust either side if your field names differ.

---

## Customization

### Add or rename folders

Edit the `FOLDERS` array and `FOLDER_COLORS` map near the top of `NotesApp.jsx`:

```js
const FOLDERS = ["Personal", "Work", "Ideas", "Journal"];

const FOLDER_COLORS = {
  Personal: "#f9a26c",
  Work:     "#6cb6f9",
  Ideas:    "#b96cf9",
  Journal:  "#6cf9b2",
};
```

### Add auth headers

Wrap `apiPatch` and `apiDeleteTrash` to include a token:

```js
async function apiPatch(id, body) {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
  ...
}
```

### Persist initial notes from the backend

Replace `INITIAL_NOTES` with a `useEffect` fetch on mount:

```js
useEffect(() => {
  fetch(`${API_BASE}/notes`)
    .then(r => r.json())
    .then(data => setNotes(data.map(n => ({ ...n, deleted: n.isDeleted }))));
}, []);
```

---

## Fonts

Loaded from Google Fonts:

- **[Fraunces](https://fonts.google.com/specimen/Fraunces)** — app wordmark and note titles
- **[DM Mono](https://fonts.google.com/specimen/DM+Mono)** — all body text and UI

Requires an internet connection on first load. To use offline, download and self-host the font files.

---

## Known Limitations

- Initial notes are hardcoded in `INITIAL_NOTES` — wire up a `GET /notes` fetch on mount for real data
- `created` dates are static strings for new notes — replace with `new Date().toISOString().split("T")[0]`
- No markdown rendering in the editor body
- No note reordering (drag-and-drop)

---

## License

MIT — free to use, modify, and distribute.
