# Corechestra

> A full-featured project management and HR platform — Kanban boards, sprints, roadmaps, documentation, test management, and a complete HR module, all backed by Firebase Firestore with real-time sync.

**Repository:** [github.com/canberkyigit/Corechestra](https://github.com/canberkyigit/Corechestra)

---

## Features

### Project Management

| Module | Highlights |
|---|---|
| **Board** | Kanban columns with drag-and-drop, backlog, sprint management, task filters by assignee / priority / type |
| **Dashboard** | Project overview, activity feed, metrics at a glance |
| **Roadmap** | Timeline view of epics and tasks across projects |
| **Calendar** | Calendar view of scheduled work, time-off, and deadlines |
| **Reports** | Burndown charts, velocity, sprint analytics |
| **Projects** | Multi-project workspace; grid and list view; per-project settings (board name, key, columns) |
| **Docs** | Confluence-like spaces and pages — TipTap rich editor, Markdown editor, @mentions, image embeds, drag-and-drop page tree, per-page comments |
| **Releases** | Version management, changelog, tasks linked to releases |
| **Tests** | Test suites, cases, runs, and pass/fail analytics |
| **Archive** | Archived tasks, projects, and epics |
| **For You** | Personalized notifications and activity feed |
| **Planning Poker** | Async estimation sessions per project |

### HR Module (`/hr`)

A self-contained HR platform with 10 tabs, all live-synced to Firestore:

| Tab | What it does |
|---|---|
| **Overview** | Quick stats, who is away today (real-time), upcoming public holidays, balance, documents needing attention |
| **People** | Employee directory with search; admin can set manager relationships to build the org hierarchy |
| **Org Chart** | Live org chart built from `managerId` relationships; pan, zoom, download; shows empty state until hierarchy is configured |
| **Time Off** | Submit and track time-off requests; dynamic calendar with prev/next month navigation |
| **Time Tracking** | Submit hours per day; dynamic monthly view; approved/pending stats |
| **Documents** | Personal document library; Sign, Preview, Delete; admins can assign documents directly to specific users |
| **My Profile** | Personal info, employment details, manager lookup, admin-editable contract fields |
| **Contract** | Full contract details — job title, employment type, salary, national ID, work schedule, dates; admin-only editing |
| **Finance** | Expense tracking (add/delete with status); bank account management |
| **Interview Pipeline** | Hiring Kanban — job requisitions, candidate pipeline (Pool → Screen → Interview → Offer → Hired), scorecards, hire/reject actions |

#### Admin Document Assignment

Admins can push documents to specific users directly from the Documents tab. The document appears in the target user's Documents tab with a **"From admin"** badge and an optional signature requirement.

---

## Tech Stack

| Area | Choice |
|---|---|
| UI framework | React 19 |
| Routing | React Router 7 |
| Styling | Tailwind CSS (dark mode via `dark:` class strategy) |
| Animation | Framer Motion |
| App state | React Context — `AppContext` (projects, tasks, sprints, docs, releases, tests), `HRContext` (HR data), `AuthContext` (Firebase Auth + roles) |
| Rich text | TipTap (`@tiptap/react`) + `@uiw/react-md-editor` |
| Drag and drop | `@hello-pangea/dnd` |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query |
| Backend / DB | Firebase — Firestore + Auth |
| Icons | React Icons (Font Awesome subset) |
| UI primitives | Headless UI |

---

## Architecture

### Provider tree

```
AuthProvider          ← Firebase Auth state; role from Firestore `users/{uid}`
  └─ AuthGate
       └─ AppProvider ← All project data, debounced Firestore sync
            └─ ToastProvider
                 └─ HRProvider ← HR data from Firestore `hrData/*`
                      └─ AppInner ← Routing + global modals
```

- **`AuthContext`** — `user`, `role` (`admin` | `member` | `viewer`), `isAdmin`, `login`, `logout`, `updateProfile`
- **`AppContext`** — single source of truth for projects, tasks, sprints, teams, users, docs, releases, tests; writes are debounced 1500 ms via `saveDomain()`
- **`HRContext`** — reads/writes `hrData/{uid}` (per-user) and `hrData/hr_shared` (absences) and `hrData/pipeline` (hiring)

### Firestore data model

**`appData` collection** (project management):

| Document | Key fields |
|---|---|
| `config` | `currentUser`, `currentProjectId`, `darkMode`, sidebar state, board filters |
| `entities` | `projects`, `teams`, `users`, `epics`, `labels` |
| `tasks` | `activeTasks`, `perProjectBacklog` |
| `sprints` | `perProjectSprint`, `projectColumns`, burndown snapshots, planned/completed sprints |
| `activity` | `globalActivityLog`, `notifications` |
| `workspace` | `perProjectRetrospective`, `perProjectPokerHistory`, `perProjectNotes` |
| `docs` | `spaces`, `docPages` |
| `releases` | `releases` |
| `testing` | `testSuites`, `testCases`, `testRuns` |
| `archive` | `archivedTasks`, `archivedProjects`, `archivedEpics` |

**`hrData` collection** (HR module):

| Document | Key fields |
|---|---|
| `hrData/{uid}` | `timeOffRequests`, `timeEntries`, `documents`, `employeeProfile`, `expenses`, `bankAccounts` |
| `hrData/hr_shared` | `absences` (all users' time-off, for "who is away" view) |
| `hrData/pipeline` | `jobRequisitions`, `candidates`, `scorecards` |

**`users` collection** — `users/{uid}`: Auth profiles, roles, `name`, `color`, `managerId`

### Write path

All writes go through `saveDomain(domain, data)` in `src/shared/services/storage.js`. Writes are debounced 1500 ms. Never write to Firestore directly from components.

### Per-project state pattern

Most mutable data is stored as maps keyed by `currentProjectId`:

```js
perProjectSprint[currentProjectId]     // active sprint
perProjectBacklog[currentProjectId]    // backlog sections
projectColumns[currentProjectId]       // kanban columns
```

`AppContext` exposes scoped getters/setters that automatically scope to `currentProjectId`.

### Roles

| Role | Can do |
|---|---|
| `admin` | Full access; user management; HR contract/profile editing; assign documents to users; set manager hierarchy |
| `member` | Create and edit tasks, submit HR data |
| `viewer` | Read-only; cannot create or modify tasks |

---

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm
- A [Firebase](https://console.firebase.google.com/) project with:
  - **Firestore** enabled
  - **Authentication** enabled (Email/Password provider)

---

## Setup

```bash
git clone https://github.com/canberkyigit/Corechestra.git
cd Corechestra
npm install
```

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase web app keys in `.env`:

   ```env
   REACT_APP_FIREBASE_API_KEY=...
   REACT_APP_FIREBASE_AUTH_DOMAIN=...
   REACT_APP_FIREBASE_PROJECT_ID=...
   REACT_APP_FIREBASE_STORAGE_BUCKET=...
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
   REACT_APP_FIREBASE_APP_ID=...
   ```

   Keys are found in Firebase Console → Project Settings → Your apps → Web app → SDK config.

3. Configure Firestore security rules for your environment. For local development you can start with open rules; lock them down per-user before deploying to production.

4. Start the dev server:

   ```bash
   npm start
   ```

   Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Dev server on port 3000 with hot reload |
| `npm run build` | Production build → `build/` |
| `npm test` | Jest + Testing Library (interactive watch mode) |
| `npm test -- --watchAll=false` | Run tests once (CI mode) |

---

## Project structure

```
src/
├── app/
│   ├── App.js                 # Router, providers, top-level composition
│   └── styles/                # App-wide CSS entrypoints
├── features/
│   ├── board/                 # Board pages, tabs, task UI, planning poker
│   ├── roadmap/               # Roadmap page and related UI
│   ├── dashboard/             # Dashboard page
│   ├── calendar/              # Calendar page
│   ├── reports/               # Reports page
│   ├── docs/                  # Docs experience
│   ├── projects/              # Project switcher and settings
│   ├── releases/              # Releases module
│   ├── tests/                 # Test management module
│   ├── hr/                    # HR module
│   ├── admin/                 # Admin area
│   ├── archive/               # Archive page
│   ├── for-you/               # Personal feed
│   ├── profile/               # Profile page
│   └── auth/                  # Login/auth pages
├── shared/
│   ├── components/            # Cross-feature UI only
│   ├── context/               # Shared providers and current domain-state layer
│   ├── schemas/               # Zod schemas
│   ├── services/              # Firebase and storage services
│   └── test-utils/            # Shared test wrappers and helpers
├── assets/
│   └── logo.svg               # Brand asset
├── index.js                   # React entrypoint
├── reportWebVitals.js
└── setupTests.js
```

`landing/` and `functions/` intentionally remain at the repo root for now. If the repo grows into a multi-app workspace later, `apps/web`, `apps/landing`, and `apps/functions` would be a natural next step.

---

## License

Private project.
