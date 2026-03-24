# Corechestra

Project and work tracking app: boards, sprints, docs, releases, and test management. Single-page React client with **Firebase Firestore** for persistence and real-time sync.

**Repository:** [github.com/canberkyigit/Corechestra](https://github.com/canberkyigit/Corechestra)

## Features

- **Board** — Kanban-style columns, drag-and-drop, backlog, filters
- **Dashboard** — Overview and metrics
- **Roadmap / Calendar** — Timeline and calendar views
- **Reports** — Burndown and reporting
- **Projects** — Multi-project workspace
- **Documentation** — Markdown spaces and pages (TipTap / MD editor)
- **Releases** — Versions, changelog, linked tasks
- **Tests** — Suites, cases, runs, analytics
- **Archive** — Archived work
- **Profile & Admin** — User and admin settings
- **Dark mode** — UI-wide theme toggle

## Tech stack

| Area | Choice |
|------|--------|
| UI | React 19, Create React App |
| Routing | React Router 7 |
| State | React Context (`AppContext`), Redux Toolkit where used |
| Styling | Tailwind CSS |
| Motion | Framer Motion |
| Rich text / docs | TipTap, `@uiw/react-md-editor`, tiptap-markdown |
| Data & sync | **Firebase** (Firestore + Auth client initialized) |
| DnD | `@hello-pangea/dnd` |
| Components | Headless UI |

Firestore stores domain-shaped documents under the `appData` collection (config, tasks, testing, releases, docs, etc.). See `src/services/storage.js` for the field layout.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm
- A [Firebase](https://console.firebase.google.com/) project with **Firestore** enabled

## Setup

```bash
git clone https://github.com/canberkyigit/Corechestra.git
cd Corechestra
npm install
```

1. Copy environment template and fill in your Firebase web app keys:

   ```bash
   cp .env.example .env
   ```

2. Set `REACT_APP_*` variables in `.env` (from Firebase project settings → Your apps → Web).

3. Configure Firestore security rules for your use case (the app expects read/write access to the collections your rules allow—typically locked down per user or environment for production).

4. Start the dev server:

   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Dev server (port 3000) |
| `npm run build` | Production build → `build/` |
| `npm test` | Jest / Testing Library (watch mode) |
| `npm run eject` | Eject CRA (irreversible) |

## Project layout (high level)

- `src/App.js` — Routes and shell
- `src/components/` — Shared UI (layout, modals, board, etc.)
- `src/context/AppContext.js` — App state, Firestore load/save hooks
- `src/pages/` — Top-level pages (Board, Tests, Releases, Docs, …)
- `src/services/firebase.js` — Firebase app + Firestore + Auth
- `src/services/storage.js` — Load/save domains, subscriptions

## License

Private project.
