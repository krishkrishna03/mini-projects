# notes.

A minimal, dark-themed notes app built with React. Supports folders, pinned notes, and a trash bin with restore/permanent delete.

---

## Features

- **Folder organization** — 4 built-in folders: Personal, Work, Ideas, Journal
- **Active / Trash tabs** — switch between live notes and deleted ones
- **Pin notes** — pinned notes appear at the top of the list
- **Trash bin** — soft-delete notes, restore or permanently delete them
- **Empty trash** — bulk-delete all trashed notes with a confirmation modal
- **Search** — filters notes by title or body content
- **Auto-save** — notes save on blur; manual Save button also available
- **Collapsible sidebar** — toggle with the ☰ button

---

## Getting Started

### Prerequisites

- Node.js 18+
- A React project scaffold (e.g. Vite or Create React App)

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

## Project Structure

```
src/
└── NotesApp.jsx       # Single-file component — all logic and UI
```

All state is managed in-memory with React `useState`. There is no backend or localStorage persistence by default (see Customization below).

---

## Component Overview

| Part | Description |
|---|---|
| **Sidebar** | Folder list, note counts, New Note button, search input, Active/Trash tab switcher |
| **Note List** | Scrollable list of notes filtered by folder/tab/search; shows pinned section |
| **Editor** | Title (Fraunces italic) + body (DM Mono); folder selector; Save, Pin, Trash/Restore actions |
| **Confirm Modal** | Shown before permanent deletion of a single note or emptying trash |

---

## Data Model

Each note is a plain object:

```js
{
  id: Number,        // unique identifier
  title: String,
  body: String,
  folder: String,    // one of the FOLDERS array values
  pinned: Boolean,
  created: String,   // "YYYY-MM-DD"
  deleted: Boolean   // true = in Trash
}
```

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

### Persist notes to localStorage

Swap the `useState` initializer and add an effect:

```js
const [notes, setNotes] = useState(() => {
  const saved = localStorage.getItem("notes");
  return saved ? JSON.parse(saved) : INITIAL_NOTES;
});

useEffect(() => {
  localStorage.setItem("notes", JSON.stringify(notes));
}, [notes]);
```

### Change the color theme

All colors are inline CSS values. A future refactor could extract them into CSS variables at the top of the component for easier theming.

---

## Fonts

Loaded from Google Fonts:

- **[Fraunces](https://fonts.google.com/specimen/Fraunces)** — used for the app wordmark and note titles
- **[DM Mono](https://fonts.google.com/specimen/DM+Mono)** — used for all body text and UI

Requires an internet connection on first load. To use offline, download and self-host the font files.

---

## Known Limitations

- State is in-memory only — notes reset on page refresh (unless localStorage is added per above)
- `created` dates are static strings; new notes get today's hardcoded date (`"2026-06-07"`) — replace with `new Date().toISOString().split("T")[0]` for real dates
- No markdown rendering in the editor body
- No note reordering (drag-and-drop)

---

## License

MIT — free to use, modify, and distribute.
