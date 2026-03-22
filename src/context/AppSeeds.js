import { generateSubtasks } from "../utils/helpers";

// ─── Seed Projects ────────────────────────────────────────────────────────────
export const SEED_PROJECTS = [
  { id: "proj-1", name: "Corechestra", key: "CY", color: "#2563eb" },
  { id: "proj-2", name: "Mobile App", key: "MB", color: "#7c3aed" },
];

export const SEED_EPICS = [
  { id: "epic-1", title: "Authentication", color: "#7c3aed", projectId: "proj-1", description: "Login, SSO, user management" },
  { id: "epic-2", title: "UI Overhaul", color: "#0891b2", projectId: "proj-1", description: "New design system rollout" },
  { id: "epic-3", title: "Testing Suite", color: "#059669", projectId: "proj-1", description: "E2E and regression tests" },
  { id: "epic-4", title: "Performance", color: "#d97706", projectId: "proj-1", description: "Speed & optimization" },
];

export const SEED_LABELS = [
  { id: "lbl-1", name: "Frontend", color: "#3b82f6" },
  { id: "lbl-2", name: "Backend", color: "#10b981" },
  { id: "lbl-3", name: "Bug", color: "#ef4444" },
  { id: "lbl-4", name: "Enhancement", color: "#8b5cf6" },
  { id: "lbl-5", name: "Design", color: "#f59e0b" },
  { id: "lbl-6", name: "Urgent", color: "#dc2626" },
];

export const SEED_SPRINT = {
  id: "sprint-1",
  name: "Sprint 86",
  goal: "Complete authentication overhaul and UI refinements",
  startDate: "2026-03-10",
  endDate: "2026-03-28",
  status: "active",
};

export const SEED_PROJ2_SPRINT = {
  id: "sprint-mb-13",
  name: "Sprint 13",
  goal: "Ship iOS login screen and stabilize crash reporting",
  startDate: "2026-03-17",
  endDate: "2026-03-31",
  status: "active",
};

export const SEED_ACTIVE_TASKS = [
  // ── Corechestra (proj-1) ──
  { id: "1",  title: "Login bug fix",            description: "Fix double SSO login.",                   status: "blocked",    priority: "critical", type: "defect",        assignedTo: "alice", storyPoint: 3,  dueDate: "2026-03-19", epicId: "epic-1", labels: ["lbl-3"],        timeEstimate: 4,  timeSpent: 2, watchers: ["alice", "bob"], projectId: "proj-1" },
  { id: "2",  title: "UWP Regression Test",      description: "APAC UWP regression test.",               status: "review",     priority: "high",     type: "defect",        assignedTo: "bob",   storyPoint: 5,  dueDate: "2026-03-22", epicId: "epic-3", labels: ["lbl-2"],        timeEstimate: 8,  timeSpent: 5, watchers: ["bob"],          projectId: "proj-1" },
  { id: "3",  title: "Translation update",       description: "Essity Finland translations.",            status: "inprogress", priority: "medium",   type: "task",          assignedTo: "carol", storyPoint: 2,  dueDate: "2026-03-24", epicId: null,     labels: ["lbl-1"],        timeEstimate: 3,  timeSpent: 1, watchers: [],               projectId: "proj-1" },
  { id: "4",  title: "Mail Scroll",              description: "Fix email preview scroll.",               status: "done",       priority: "low",      type: "feature",       assignedTo: "dave",  storyPoint: 1,  dueDate: "2026-03-15", epicId: "epic-2", labels: ["lbl-1","lbl-5"], timeEstimate: 2,  timeSpent: 2, watchers: [],               projectId: "proj-1" },
  { id: "5",  title: "Test Payment Flow",        description: "Test the new payment integration.",       status: "todo",       priority: "medium",   type: "test",          assignedTo: "alice", storyPoint: 8,  dueDate: "2026-03-25", epicId: "epic-3", labels: ["lbl-2"],        timeEstimate: 12, timeSpent: 0, watchers: ["alice","carol"], projectId: "proj-1" },
  { id: "6",  title: "Set Up Test Set",          description: "Create a test set for regression.",       status: "awaiting",   priority: "low",      type: "testset",       assignedTo: "bob",   storyPoint: 3,  dueDate: "2026-03-28", epicId: "epic-3", labels: [],               timeEstimate: 4,  timeSpent: 0, watchers: [],               projectId: "proj-1" },
  { id: "7",  title: "Execute Regression Suite", description: "Run all regression tests.",               status: "inprogress", priority: "high",     type: "testexecution", assignedTo: "carol", storyPoint: 13, dueDate: "2026-03-27", epicId: "epic-3", labels: ["lbl-6"],        timeEstimate: 16, timeSpent: 8, watchers: ["carol","dave"],  projectId: "proj-1" },
  { id: "8",  title: "Precondition Setup",       description: "Prepare preconditions for E2E.",          status: "todo",       priority: "medium",   type: "precondition",  assignedTo: "dave",  storyPoint: 2,  dueDate: "2026-04-02", epicId: null,     labels: [],               timeEstimate: 3,  timeSpent: 0, watchers: [],               projectId: "proj-1" },
  { id: "9",  title: "UI Polish",                description: "Polish UI for better UX.",                status: "review",     priority: "low",      type: "feature",       assignedTo: "alice", storyPoint: 1,  dueDate: "2026-03-26", epicId: "epic-2", labels: ["lbl-1","lbl-5"], timeEstimate: 4,  timeSpent: 3, watchers: [],               projectId: "proj-1" },
  // ── Mobile App (proj-2) ──
  { id: "m1", title: "Push notification service",description: "Integrate FCM for push alerts.",          status: "todo",       priority: "high",     type: "feature",       assignedTo: "bob",   storyPoint: 8,  dueDate: "2026-04-05", epicId: null,     labels: [],               timeEstimate: 12, timeSpent: 0, watchers: ["bob"],          projectId: "proj-2" },
  { id: "m2", title: "iOS login screen",         description: "Build the native iOS auth UI.",           status: "inprogress", priority: "medium",   type: "task",          assignedTo: "alice", storyPoint: 5,  dueDate: "2026-03-28", epicId: null,     labels: [],               timeEstimate: 8,  timeSpent: 3, watchers: ["alice"],        projectId: "proj-2" },
  { id: "m3", title: "Android dashboard UI",     description: "Design the main dashboard view.",         status: "review",     priority: "high",     type: "feature",       assignedTo: "carol", storyPoint: 8,  dueDate: "2026-03-30", epicId: null,     labels: [],               timeEstimate: 10, timeSpent: 8, watchers: ["carol","bob"],  projectId: "proj-2" },
  { id: "m4", title: "Crash reporting",          description: "Integrate Sentry for crash reporting.",   status: "blocked",    priority: "critical", type: "bug",           assignedTo: "bob",   storyPoint: 3,  dueDate: "2026-03-25", epicId: null,     labels: [],               timeEstimate: 4,  timeSpent: 1, watchers: ["bob","dave"],   projectId: "proj-2" },
  { id: "m5", title: "App store metadata",       description: "Write descriptions & screenshots.",       status: "todo",       priority: "low",      type: "task",          assignedTo: "dave",  storyPoint: 2,  dueDate: "2026-04-10", epicId: null,     labels: [],               timeEstimate: 3,  timeSpent: 0, watchers: [],               projectId: "proj-2" },
  { id: "m6", title: "Beta testing plan",        description: "Define beta cohort and test strategy.",   status: "inprogress", priority: "medium",   type: "test",          assignedTo: "alice", storyPoint: 5,  dueDate: "2026-04-01", epicId: null,     labels: [],               timeEstimate: 6,  timeSpent: 2, watchers: ["alice"],        projectId: "proj-2" },
  { id: "m7", title: "Offline mode support",     description: "Cache API responses for offline use.",    status: "todo",       priority: "high",     type: "feature",       assignedTo: "carol", storyPoint: 13, dueDate: "2026-04-15", epicId: null,     labels: [],               timeEstimate: 20, timeSpent: 0, watchers: [],               projectId: "proj-2" },
  { id: "m8", title: "Biometric authentication", description: "Add Face ID / fingerprint login.",        status: "done",       priority: "medium",   type: "feature",       assignedTo: "dave",  storyPoint: 5,  dueDate: "2026-03-20", epicId: null,     labels: [],               timeEstimate: 6,  timeSpent: 6, watchers: ["dave"],         projectId: "proj-2" },
].map((t) => ({ ...t, subtasks: generateSubtasks(t.title, t.type), comments: [], activityLog: [] }));

const SEED_BACKLOG_TASKS = [
  { id: "b1", title: "Refactor authentication", description: "Improve login security and UX.", epicId: "epic-1", labels: ["lbl-1", "lbl-4"] },
  { id: "b2", title: "Add dark mode", description: "Theme support for dark mode.", epicId: "epic-2", labels: ["lbl-1", "lbl-5"] },
  { id: "b3", title: "Mobile responsive UI", description: "Make app fully responsive.", epicId: "epic-2", labels: ["lbl-1"] },
  { id: "b4", title: "Integrate Google Calendar", description: "Sync events with Google Calendar.", epicId: null, labels: ["lbl-2"] },
  { id: "b5", title: "Bulk task actions", description: "Allow multi-select and bulk actions.", epicId: null, labels: ["lbl-4"] },
  { id: "b6", title: "Export tasks to CSV", description: "Download board as CSV.", epicId: null, labels: [] },
  { id: "b7", title: "Add notifications panel", description: "Centralize all notifications.", epicId: null, labels: ["lbl-1", "lbl-4"] },
  { id: "b8", title: "Custom fields for tasks", description: "Support custom fields per project.", epicId: null, labels: ["lbl-4"] },
  { id: "b9", title: "Recurring tasks", description: "Allow tasks to repeat on schedule.", epicId: null, labels: [] },
  { id: "b10", title: "API rate limiting", description: "Protect backend from abuse.", epicId: null, labels: ["lbl-2"] },
];

const makeBacklogTask = (t) => ({
  ...t,
  status: "todo",
  storyPoint: 1,
  dueDate: "",
  assignedTo: "unassigned",
  priority: "medium",
  subtasks: generateSubtasks(t.title),
  comments: [],
  activityLog: [],
  timeEstimate: 0,
  timeSpent: 0,
  watchers: [],
});

export const SEED_BACKLOG_SECTIONS = [
  { id: 1, title: "Backlog", tasks: SEED_BACKLOG_TASKS.map(makeBacklogTask) },
];

const SEED_PROJ2_BACKLOG_TASKS = [
  { id: "mb1", title: "Dark mode theme",               description: "Support system-level dark mode toggle.",       epicId: null, labels: [], projectId: "proj-2" },
  { id: "mb2", title: "Push notification preferences", description: "Let users manage notification settings.",      epicId: null, labels: [], projectId: "proj-2" },
  { id: "mb3", title: "App localization",              description: "Add i18n support for 5 languages.",             epicId: null, labels: [], projectId: "proj-2" },
  { id: "mb4", title: "Deep link integration",         description: "Handle deep links for share URLs.",             epicId: null, labels: [], projectId: "proj-2" },
  { id: "mb5", title: "Analytics integration",         description: "Integrate Mixpanel for user events.",           epicId: null, labels: [], projectId: "proj-2" },
  { id: "mb6", title: "Onboarding flow",               description: "Build welcome screens for new users.",          epicId: null, labels: [], projectId: "proj-2" },
  { id: "mb7", title: "In-app payment",                description: "Integrate Stripe SDK for mobile payments.",     epicId: null, labels: [], projectId: "proj-2" },
  { id: "mb8", title: "Performance profiling",         description: "Identify and fix render bottlenecks.",          epicId: null, labels: [], projectId: "proj-2" },
];

export const SEED_PROJ2_BACKLOG_SECTIONS = [
  { id: 101, title: "Mobile Backlog", tasks: SEED_PROJ2_BACKLOG_TASKS.map(makeBacklogTask) },
];

export const SEED_TEAMS = [
  { id: "team-1", name: "Frontend Team", color: "#3b82f6", description: "UI/UX development", memberNames: ["alice", "carol"], projectIds: ["proj-1"] },
  { id: "team-2", name: "Backend Team", color: "#10b981", description: "API and infrastructure", memberNames: ["bob", "dave"], projectIds: ["proj-1", "proj-2"] },
];

export const SEED_RETRO = {
  wentWell: [
    { id: 1, text: "Team collaboration was excellent", checked: false, score: 0 },
    { id: 2, text: "Sprint goals were achieved on time", checked: false, score: 0 },
    { id: 3, text: "Code quality improved significantly", checked: false, score: 0 },
  ],
  wentWrong: [
    { id: 1, text: "Some bugs were not caught in testing", checked: false, score: 0 },
    { id: 2, text: "Communication gaps between team members", checked: false, score: 0 },
  ],
  canImprove: [
    { id: 1, text: "Implement better testing practices", checked: false, score: 0 },
    { id: 2, text: "Improve daily standup efficiency", checked: false, score: 0 },
    { id: 3, text: "Better documentation practices", checked: false, score: 0 },
  ],
  actionItems: [
    { id: 1, text: "Set up automated testing pipeline", checked: false, score: 0 },
    { id: 2, text: "Schedule team communication workshop", checked: false, score: 0 },
  ],
};

export const SEED_PROJ2_RETRO = {
  wentWell: [],
  wentWrong: [],
  canImprove: [],
  actionItems: [],
};

export const SEED_USERS = [
  { id: "user-1", name: "Alice Johnson",  email: "alice@corechestra.io", username: "alice", role: "admin",  status: "active",   color: "#3b82f6", joinedAt: "2025-01-10" },
  { id: "user-2", name: "Bob Smith",      email: "bob@corechestra.io",   username: "bob",   role: "member", status: "active",   color: "#7c3aed", joinedAt: "2025-02-14" },
  { id: "user-3", name: "Carol Davis",    email: "carol@corechestra.io", username: "carol", role: "member", status: "active",   color: "#10b981", joinedAt: "2025-02-20" },
  { id: "user-4", name: "Dave Wilson",    email: "dave@corechestra.io",  username: "dave",  role: "viewer", status: "inactive", color: "#f59e0b", joinedAt: "2025-03-05" },
];

export const SEED_CUSTOM_FIELDS = [
  { id: "cf-1", name: "Customer",      type: "text",     required: false, description: "Customer this task relates to",  options: [] },
  { id: "cf-2", name: "Environment",   type: "dropdown", required: false, description: "Target deployment environment",  options: ["Production", "Staging", "Development", "Local"] },
  { id: "cf-3", name: "External Link", type: "url",      required: false, description: "Link to external resource",      options: [] },
];

export const DEFAULT_SPRINT_DEFAULTS = {
  duration: 14,
  namingFormat: "Sprint {n}",
  autoStart: false,
  workingDays: ["mon", "tue", "wed", "thu", "fri"],
  startDay: "mon",
  velocity: 0,
};

export const DEFAULT_BOARD_SETTINGS = {
  showBadges: true,
  showPriorityColors: true,
  showTaskIds: true,
  showSubtaskButtons: true,
  boardName: "Corechestra",
  projectKey: "CY",
  taskViewMode: "panel",
};

export const DEFAULT_COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "awaiting", title: "Awaiting Customer" },
  { id: "blocked", title: "Blocked" },
  { id: "done", title: "Done" },
];

// ─── Documentation Spaces ─────────────────────────────────────────────────────
export const SEED_SPACES = [
  {
    id: "space-1",
    name: "Corechestra Docs",
    key: "CD",
    projectId: "proj-1",
    color: "#2563eb",
    description: "Main documentation for the Corechestra project management platform.",
    icon: "📘",
    createdAt: "2026-01-15T10:00:00.000Z",
  },
  {
    id: "space-2",
    name: "Mobile App Docs",
    key: "MD",
    projectId: "proj-2",
    color: "#7c3aed",
    description: "Documentation for the Corechestra Mobile App.",
    icon: "📱",
    createdAt: "2026-02-01T10:00:00.000Z",
  },
];

// ─── Documentation Pages ──────────────────────────────────────────────────────
export const SEED_DOC_PAGES = [
  // ── Space 1: Corechestra Docs ──
  {
    id: "page-1",
    spaceId: "space-1",
    parentId: null,
    title: "Home",
    emoji: "🏠",
    position: 0,
    author: "alice",
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-03-10T09:00:00.000Z",
    labels: ["documentation", "overview"],
    content: `# 🏠 Corechestra Documentation

Welcome to the **Corechestra** documentation hub! This is your central knowledge base for everything related to the Corechestra project management platform.

## Overview

Corechestra is a modern, full-featured project management tool built with React, designed to help engineering teams plan, track, and ship software faster.

## Table of Contents

- [Getting Started](./getting-started) — Set up the project locally
  - [Installation Guide](./installation-guide) — Step-by-step install
  - [Development Setup](./development-setup) — Environment configuration
- [Architecture](./architecture) — Understand how the system works
  - [Frontend Architecture](./frontend-architecture) — React component structure
  - [API Reference](./api-reference) — Available endpoints
- [Team Guidelines](./team-guidelines) — Standards and conventions
  - [Code Standards](./code-standards) — Formatting and quality rules
  - [Git Workflow](./git-workflow) — Branching and commit conventions

## Quick Links

| Resource | Description |
|---|---|
| GitHub Repo | Source code and issues |
| Staging | Pre-production environment |
| Production | Live application |
| CI/CD Dashboard | Build and deployment status |

## Key Features

- **Kanban Board** — Drag-and-drop task management
- **Sprint Planning** — Agile sprint tracking with burndown charts
- **Roadmap / Timeline** — Visual project timeline using Gantt-style view
- **Reports & Analytics** — Velocity, burndown, and custom reports
- **Planning Poker** — Collaborative story point estimation
- **Retrospectives** — Structured team retrospective meetings
`,
  },
  {
    id: "page-2",
    spaceId: "space-1",
    parentId: "page-1",
    title: "Getting Started",
    emoji: "🚀",
    position: 0,
    author: "alice",
    createdAt: "2026-01-16T10:00:00.000Z",
    updatedAt: "2026-03-05T14:00:00.000Z",
    labels: ["onboarding"],
    content: `# 🚀 Getting Started

This section will walk you through everything you need to get Corechestra running on your local machine and understand the project structure.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18 or higher
- **npm** v9 or higher (or **yarn** v1.22+)
- **Git** v2.30+
- A modern browser (Chrome, Firefox, Edge, or Safari)

## Repository Structure

\`\`\`
corechestra/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable UI components
│   ├── context/         # React context providers
│   ├── pages/           # Top-level page components
│   ├── services/        # API and storage services
│   ├── utils/           # Utility helpers
│   └── App.js           # Root application component
├── package.json
└── tailwind.config.js
\`\`\`

## Next Steps

1. Follow the [Installation Guide](./installation-guide) to clone and install dependencies
2. Read [Development Setup](./development-setup) to configure your environment
3. Review [Frontend Architecture](./frontend-architecture) to understand the codebase

> **Tip:** If you run into any issues, check the troubleshooting section at the bottom of each page.
`,
  },
  {
    id: "page-3",
    spaceId: "space-1",
    parentId: "page-2",
    title: "Installation Guide",
    emoji: "⚙️",
    position: 0,
    author: "bob",
    createdAt: "2026-01-17T10:00:00.000Z",
    updatedAt: "2026-02-20T11:00:00.000Z",
    labels: ["setup", "installation"],
    content: `# ⚙️ Installation Guide

Follow these steps to get Corechestra running on your local development machine.

## Step 1: Clone the Repository

\`\`\`bash
git clone https://github.com/your-org/corechestra.git
cd corechestra
\`\`\`

## Step 2: Install Dependencies

Using npm:

\`\`\`bash
npm install
\`\`\`

Or using yarn:

\`\`\`bash
yarn install
\`\`\`

## Step 3: Copy Environment Variables

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit \`.env.local\` with your local configuration values (see [Development Setup](./development-setup) for details).

## Step 4: Start the Development Server

\`\`\`bash
npm start
\`\`\`

The application will open at [http://localhost:3000](http://localhost:3000).

## Step 5: Verify the Install

Once the app loads, you should see:
- The Corechestra sidebar on the left
- The Board page with sample tasks
- Dark mode toggle in the sidebar

## Troubleshooting

| Issue | Solution |
|---|---|
| Port 3000 already in use | Run \`PORT=3001 npm start\` |
| Module not found errors | Delete \`node_modules\` and reinstall |
| Blank white screen | Check the browser console for errors |
| Tailwind styles missing | Ensure PostCSS config is correct |

## Building for Production

\`\`\`bash
npm run build
\`\`\`

The optimized build will be in the \`build/\` directory.
`,
  },
  {
    id: "page-4",
    spaceId: "space-1",
    parentId: "page-2",
    title: "Development Setup",
    emoji: "🛠️",
    position: 1,
    author: "carol",
    createdAt: "2026-01-18T10:00:00.000Z",
    updatedAt: "2026-02-25T16:00:00.000Z",
    labels: ["setup", "environment"],
    content: `# 🛠️ Development Setup

This guide covers the environment configuration and tooling needed for effective local development.

## Environment Variables

Create a \`.env.local\` file in the project root with the following variables:

\`\`\`env
# Application
REACT_APP_NAME=Corechestra
REACT_APP_VERSION=2.0.0
REACT_APP_ENV=development

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:8080/api
REACT_APP_API_TIMEOUT=10000

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_POKER=true

# Auth (if applicable)
REACT_APP_AUTH_DOMAIN=your-auth-domain.auth0.com
REACT_APP_AUTH_CLIENT_ID=your-client-id
\`\`\`

## Recommended VSCode Extensions

Install the following extensions for the best development experience:

- **ESLint** — JavaScript linting
- **Prettier** — Code formatting
- **Tailwind CSS IntelliSense** — Autocomplete for Tailwind classes
- **GitLens** — Enhanced Git integration
- **React Developer Tools** — Browser extension for debugging

## VSCode Settings

Add the following to your \`.vscode/settings.json\`:

\`\`\`json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "'([^']*)'"]
  ]
}
\`\`\`

## Code Quality Tools

### ESLint

Run linting manually:

\`\`\`bash
npm run lint
npm run lint:fix  # Auto-fix issues
\`\`\`

### Prettier

Format all files:

\`\`\`bash
npm run format
\`\`\`

## Development Workflow

1. Pull the latest changes from \`main\`
2. Create a feature branch (see [Git Workflow](./git-workflow))
3. Make your changes
4. Run \`npm run lint\` and fix any issues
5. Commit following the [commit conventions](./git-workflow#commits)
6. Open a pull request
`,
  },
  {
    id: "page-5",
    spaceId: "space-1",
    parentId: "page-1",
    title: "Architecture",
    emoji: "🏗️",
    position: 1,
    author: "alice",
    createdAt: "2026-01-20T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    labels: ["architecture"],
    content: `# 🏗️ Architecture Overview

This section describes the high-level architecture of the Corechestra platform, including the frontend structure, state management, and integration points.

## Technology Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Styling | Tailwind CSS v3 |
| Routing | React Router DOM v7 |
| State Management | React Context API |
| Persistence | localStorage (via storage service) |
| Icons | react-icons/fa |
| UI Components | @headlessui/react |
| Date Handling | date-fns |
| Markdown | @uiw/react-md-editor |

## High-Level Architecture

\`\`\`
Browser
  └── App.js (BrowserRouter)
       ├── AppProvider (global state)
       ├── ToastProvider (notifications)
       └── AppInner
            ├── Layout (sidebar + topbar)
            └── Routes
                 ├── /board      → BoardPage
                 ├── /dashboard  → DashboardPage
                 ├── /roadmap    → TimelinePage
                 ├── /calendar   → CalendarPage
                 ├── /reports    → ReportsPage
                 ├── /projects   → ProjectsPage
                 ├── /docs       → DocsPage
                 └── /admin      → AdminPage
\`\`\`

## State Management

All application state lives in \`AppContext\`. The context is persisted to \`localStorage\` on every state change via the \`saveState\` service.

See child pages for detailed architecture documentation.
`,
  },
  {
    id: "page-6",
    spaceId: "space-1",
    parentId: "page-5",
    title: "Frontend Architecture",
    emoji: "🎨",
    position: 0,
    author: "alice",
    createdAt: "2026-01-21T10:00:00.000Z",
    updatedAt: "2026-02-28T12:00:00.000Z",
    labels: ["frontend", "architecture"],
    content: `# 🎨 Frontend Architecture

## Component Tree

The Corechestra frontend is structured as a single-page application with a centralized layout component.

\`\`\`
<App>
  <BrowserRouter>
    <AppProvider>          ← Global state (context)
      <ToastProvider>      ← Toast notifications
        <AppInner>
          <Layout>         ← Sidebar + Topbar shell
            <BoardPage />      ← /board
            <DashboardPage />  ← /dashboard
            <TimelinePage />   ← /roadmap
            <CalendarPage />   ← /calendar
            <ReportsPage />    ← /reports
            <ProjectsPage />   ← /projects
            <DocsPage />       ← /docs
            <AdminPage />      ← /admin
            <ProfilePage />    ← /profile
          </Layout>
          <CommandPalette />   ← Global search overlay
          <TaskSidePanel />    ← Slide-in task detail
          <TaskDetailModal />  ← Create/edit task modal
        </AppInner>
      </ToastProvider>
    </AppProvider>
  </BrowserRouter>
</App>
\`\`\`

## Context Architecture

### AppContext

The main data store. Contains:
- Projects, epics, labels
- Sprint data (per-project)
- Active tasks and backlog
- Board settings (per-project)
- Documentation spaces and pages
- Teams, users, custom fields
- Notifications and activity log

### ToastContext

Lightweight context for displaying toast notifications. Exposes \`addToast(message, type)\`.

## Key Design Patterns

### Per-Project State

State that varies by project (sprint, backlog, settings, burndown) is stored as a map keyed by project ID:

\`\`\`js
perProjectSprint: {
  "proj-1": { id: "sprint-1", name: "Sprint 86", ... },
  "proj-2": { id: "sprint-mb-13", name: "Sprint 13", ... },
}
\`\`\`

### Persistence

State is automatically persisted to \`localStorage\` via a \`useEffect\` that runs whenever any piece of state changes. The \`loadState\` and \`saveState\` functions in \`src/services/storage.js\` handle serialization.

## Styling Conventions

The app uses Tailwind CSS with a custom dark mode palette:

\`\`\`
Outer bg:    bg-[#141720]
Sidebar bg:  bg-[#1a1f2e]
Card bg:     bg-[#1c2030]
Input bg:    bg-[#232838]
Borders:     border-[#2a3044] / border-[#252b3b]
\`\`\`
`,
  },
  {
    id: "page-7",
    spaceId: "space-1",
    parentId: "page-5",
    title: "API Reference",
    emoji: "🔌",
    position: 1,
    author: "bob",
    createdAt: "2026-01-22T10:00:00.000Z",
    updatedAt: "2026-02-22T09:00:00.000Z",
    labels: ["api", "reference"],
    content: `# 🔌 API Reference

> **Note:** Corechestra currently operates as a client-side application with localStorage persistence. This document describes the planned REST API for future backend integration.

## Base URL

\`\`\`
https://api.corechestra.io/v1
\`\`\`

## Authentication

All API requests require a Bearer token:

\`\`\`
Authorization: Bearer <your-api-token>
\`\`\`

## Endpoints

### Projects

| Method | Endpoint | Description |
|---|---|---|
| GET | \`/projects\` | List all projects |
| POST | \`/projects\` | Create a new project |
| GET | \`/projects/:id\` | Get a project by ID |
| PUT | \`/projects/:id\` | Update a project |
| DELETE | \`/projects/:id\` | Delete a project |

### Tasks

| Method | Endpoint | Description |
|---|---|---|
| GET | \`/projects/:id/tasks\` | List tasks for a project |
| POST | \`/projects/:id/tasks\` | Create a task |
| GET | \`/tasks/:id\` | Get a task by ID |
| PUT | \`/tasks/:id\` | Update a task |
| DELETE | \`/tasks/:id\` | Delete a task |
| POST | \`/tasks/:id/comments\` | Add a comment |

### Sprints

| Method | Endpoint | Description |
|---|---|---|
| GET | \`/projects/:id/sprint\` | Get active sprint |
| POST | \`/projects/:id/sprint\` | Create a sprint |
| PUT | \`/projects/:id/sprint\` | Update sprint |
| POST | \`/projects/:id/sprint/complete\` | Complete sprint |

## Error Responses

\`\`\`json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found.",
    "details": {}
  }
}
\`\`\`

## Rate Limiting

- **Default limit:** 1000 requests per hour per API key
- **Burst limit:** 100 requests per minute
- Rate limit headers: \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`
`,
  },
  {
    id: "page-8",
    spaceId: "space-1",
    parentId: "page-1",
    title: "Team Guidelines",
    emoji: "📋",
    position: 2,
    author: "carol",
    createdAt: "2026-01-25T10:00:00.000Z",
    updatedAt: "2026-03-08T14:00:00.000Z",
    labels: ["guidelines", "team"],
    content: `# 📋 Team Guidelines

This section contains our team's agreed-upon guidelines for code quality, collaboration, and delivery standards.

## Core Principles

1. **Write code for humans first** — Clarity over cleverness
2. **Keep PRs small** — Aim for under 400 lines of change per PR
3. **Test what matters** — Cover business logic, not implementation details
4. **Document decisions** — Use ADRs for significant architectural choices
5. **Review constructively** — Feedback is about code, not people

## Sections

- [Code Standards](./code-standards) — Formatting, naming conventions, ESLint rules
- [Git Workflow](./git-workflow) — Branching strategy and commit message format

## Team Meetings

| Meeting | Frequency | Duration |
|---|---|---|
| Daily Standup | Every weekday | 15 min |
| Sprint Planning | Start of sprint | 2 hours |
| Sprint Review | End of sprint | 1 hour |
| Retrospective | End of sprint | 1 hour |
| Architecture Review | Monthly | 1 hour |

## On-Call Rotation

The on-call engineer is responsible for:
- Monitoring production alerts
- Triaging and responding to incidents
- Documenting post-mortems for P0/P1 incidents

Rotation schedule is maintained in the team calendar.
`,
  },
  {
    id: "page-9",
    spaceId: "space-1",
    parentId: "page-8",
    title: "Code Standards",
    emoji: "📝",
    position: 0,
    author: "alice",
    createdAt: "2026-01-26T10:00:00.000Z",
    updatedAt: "2026-03-02T10:00:00.000Z",
    labels: ["standards", "quality"],
    content: `# 📝 Code Standards

## JavaScript / React

### Naming Conventions

\`\`\`js
// Components: PascalCase
function TaskCard({ task }) { ... }

// Hooks: camelCase starting with "use"
function useTaskFilters() { ... }

// Constants: SCREAMING_SNAKE_CASE
const MAX_TASKS_PER_SPRINT = 50;

// Variables and functions: camelCase
const activeTasks = [];
function createTask(data) { ... }
\`\`\`

### Component Structure

Order code within a component file like this:

1. Imports
2. Constants / config
3. Helper functions
4. Component definition
5. Exports

### Hooks Rules

- Never call hooks inside loops or conditions
- Always declare all dependencies in the dependency array
- Prefer \`useCallback\` for event handlers passed as props
- Prefer \`useMemo\` for expensive computed values

## Tailwind CSS

- Use dark mode prefix \`dark:\` for all color overrides
- Group related utility classes together
- Extract repeated class combos into component variables:

\`\`\`js
const inputClass = "w-full px-3 py-2 rounded-lg border bg-slate-50 dark:bg-[#232838] border-slate-200 dark:border-[#2a3044]";
\`\`\`

## File Organization

- One component per file
- Co-locate tests with the component (\`ComponentName.test.js\`)
- Place page-level components in \`src/pages/\`
- Place reusable components in \`src/components/\`

## Code Review Checklist

- [ ] No console.log statements left in code
- [ ] All new functions have JSDoc comments
- [ ] No hardcoded strings (use constants or i18n keys)
- [ ] Accessibility attributes present (aria-label, role, etc.)
- [ ] Error states handled
- [ ] Loading states handled
`,
  },
  {
    id: "page-10",
    spaceId: "space-1",
    parentId: "page-8",
    title: "Git Workflow",
    emoji: "🔀",
    position: 1,
    author: "dave",
    createdAt: "2026-01-27T10:00:00.000Z",
    updatedAt: "2026-03-05T11:00:00.000Z",
    labels: ["git", "workflow"],
    content: `# 🔀 Git Workflow

## Branching Strategy

We follow a **trunk-based development** approach with short-lived feature branches.

### Branch Types

\`\`\`
main                  ← Production-ready code, always deployable
├── feature/xxx       ← New features (from main)
├── fix/xxx           ← Bug fixes (from main)
├── hotfix/xxx        ← Critical production fixes (from main)
└── chore/xxx         ← Maintenance tasks (from main)
\`\`\`

### Branch Naming

\`\`\`
feature/task-id-short-description
fix/task-id-short-description
hotfix/critical-fix-description
chore/dependency-updates

# Examples:
feature/cy-123-add-kanban-swimlanes
fix/cy-456-login-redirect-loop
hotfix/payment-processing-null-error
\`\`\`

## Commit Message Convention

We follow the **Conventional Commits** specification:

\`\`\`
<type>(<scope>): <short summary>

[optional body]

[optional footer]
\`\`\`

### Types

| Type | When to use |
|---|---|
| \`feat\` | New feature |
| \`fix\` | Bug fix |
| \`docs\` | Documentation changes |
| \`style\` | Formatting (no logic change) |
| \`refactor\` | Code restructure (no feature/fix) |
| \`test\` | Adding or fixing tests |
| \`chore\` | Build, tooling, dependencies |
| \`perf\` | Performance improvements |

### Examples

\`\`\`
feat(board): add swimlane grouping by assignee

fix(auth): prevent double SSO redirect on session timeout

docs(api): document rate limiting headers

chore(deps): upgrade react-router-dom to v7
\`\`\`

## Pull Request Process

1. Create a branch from \`main\`
2. Make your changes in small, focused commits
3. Open a PR with a clear title and description
4. Request review from at least one team member
5. Address all review comments
6. Squash and merge once approved
7. Delete the branch after merge

## Protected Branches

- \`main\` — Requires 1 approved review, all CI checks passing
- Direct pushes to \`main\` are **not allowed**
`,
  },

  // ── Space 2: Mobile App Docs ──
  {
    id: "page-11",
    spaceId: "space-2",
    parentId: null,
    title: "Home",
    emoji: "🏠",
    position: 0,
    author: "carol",
    createdAt: "2026-02-01T10:00:00.000Z",
    updatedAt: "2026-03-15T10:00:00.000Z",
    labels: ["overview"],
    content: `# 🏠 Mobile App Documentation

Welcome to the **Corechestra Mobile App** documentation. This space covers everything related to our iOS and Android applications.

## About the Mobile App

The Corechestra Mobile App brings the full power of Corechestra project management to your smartphone. Built with React Native, it shares business logic with the web app while delivering a native mobile experience.

## Supported Platforms

| Platform | Minimum Version | Status |
|---|---|---|
| iOS | 15.0+ | In Development |
| Android | API 26 (8.0+) | In Development |

## Table of Contents

- [iOS Guidelines](./ios-guidelines) — iOS-specific development standards
- [Android Guidelines](./android-guidelines) — Android-specific patterns
- [Release Process](./release-process) — How we ship new versions

## Key Features (Planned)

- **Offline Mode** — Full functionality without internet
- **Push Notifications** — Real-time alerts via FCM / APNs
- **Biometric Auth** — Face ID and fingerprint login
- **Dark Mode** — System-level dark mode support

## Team Contacts

| Role | Name |
|---|---|
| iOS Lead | Alice Johnson |
| Android Lead | Carol Davis |
| QA Mobile | Bob Smith |
| Product Mobile | Dave Wilson |
`,
  },
  {
    id: "page-12",
    spaceId: "space-2",
    parentId: "page-11",
    title: "iOS Guidelines",
    emoji: "🍎",
    position: 0,
    author: "alice",
    createdAt: "2026-02-05T10:00:00.000Z",
    updatedAt: "2026-03-10T13:00:00.000Z",
    labels: ["ios", "guidelines"],
    content: `# 🍎 iOS Guidelines

## Development Environment

### Required Tools

- **Xcode** 15.2 or higher
- **CocoaPods** 1.14+
- **Ruby** 3.1+ (for CocoaPods)
- **Fastlane** (for automated builds and deployments)

### Setup

\`\`\`bash
# Install dependencies
cd ios
pod install

# Open in Xcode
open CorechestraMobile.xcworkspace
\`\`\`

## iOS-Specific Conventions

### Swift Style Guide

- Follow the [Swift API Design Guidelines](https://swift.org/documentation/api-design-guidelines/)
- Use \`guard\` for early returns instead of deeply nested \`if\`
- Prefer \`struct\` over \`class\` for value types
- Use \`@MainActor\` for UI-related async operations

### View Architecture

We use **MVVM** for iOS screens:

\`\`\`
Views/
  TaskListView.swift       ← SwiftUI View
  TaskListViewModel.swift  ← ObservableObject ViewModel
  TaskListModel.swift      ← Data Model
\`\`\`

## Human Interface Guidelines Compliance

All iOS screens must comply with Apple's HIG:

- [ ] Support Dynamic Type (font scaling)
- [ ] Support VoiceOver (accessibility labels)
- [ ] Support Dark Mode
- [ ] Support iPad (at minimum slide-over)
- [ ] No custom navigation patterns that conflict with iOS conventions

## App Store Requirements

- Privacy Nutrition Labels must be updated for each release
- All permissions must have a usage description string
- App must not use any private APIs
- Screenshots required for all supported device sizes

## Testing

\`\`\`bash
# Run unit tests
xcodebuild test -scheme CorechestraMobile -destination 'platform=iOS Simulator,name=iPhone 15 Pro'

# Run UI tests
xcodebuild test -scheme CorechestraMobileUITests -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
\`\`\`
`,
  },
  {
    id: "page-13",
    spaceId: "space-2",
    parentId: "page-11",
    title: "Android Guidelines",
    emoji: "🤖",
    position: 1,
    author: "carol",
    createdAt: "2026-02-08T10:00:00.000Z",
    updatedAt: "2026-03-12T11:00:00.000Z",
    labels: ["android", "guidelines"],
    content: `# 🤖 Android Guidelines

## Development Environment

### Required Tools

- **Android Studio** Hedgehog (2023.1.1) or newer
- **JDK** 17 or higher
- **Android SDK** API 34 (compile target)
- **Gradle** 8.2+

### Setup

\`\`\`bash
# Open in Android Studio
File > Open > select /android folder

# Or build from CLI
cd android
./gradlew assembleDebug
\`\`\`

## Android-Specific Conventions

### Kotlin Style Guide

- Follow the [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html)
- Use coroutines for async operations (no callbacks)
- Use \`StateFlow\` / \`SharedFlow\` for reactive state
- Prefer data classes for models

### Architecture

We use **MVVM + Clean Architecture**:

\`\`\`
feature/
  tasklist/
    data/
      TaskRepository.kt
      TaskRemoteDataSource.kt
    domain/
      GetTasksUseCase.kt
    presentation/
      TaskListViewModel.kt
      TaskListFragment.kt
      TaskListAdapter.kt
\`\`\`

## Material Design 3 Compliance

All Android screens must follow Material Design 3:

- [ ] Use Material 3 color scheme (dynamic color on Android 12+)
- [ ] Support dark theme via \`DayNight\` theme
- [ ] Use M3 components (not legacy AppCompat)
- [ ] Respect system font scale

## Testing

\`\`\`bash
# Run unit tests
./gradlew test

# Run instrumented tests
./gradlew connectedAndroidTest

# Run with specific device
./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.corechestra.TaskListTest
\`\`\`

## ProGuard / R8

Ensure the following are kept in \`proguard-rules.pro\`:

\`\`\`proguard
# Keep data classes
-keep class com.corechestra.data.model.** { *; }

# Keep Retrofit interfaces
-keep interface com.corechestra.data.api.** { *; }
\`\`\`
`,
  },
  {
    id: "page-14",
    spaceId: "space-2",
    parentId: "page-11",
    title: "Release Process",
    emoji: "🚀",
    position: 2,
    author: "dave",
    createdAt: "2026-02-10T10:00:00.000Z",
    updatedAt: "2026-03-18T09:00:00.000Z",
    labels: ["release", "deployment"],
    content: `# 🚀 Release Process

## Release Cadence

We ship a new version of the mobile app every **2 weeks**, aligned with our sprint cycle.

| Release Type | Frequency | Approval Required |
|---|---|---|
| Major (x.0.0) | Quarterly | Director sign-off |
| Minor (x.y.0) | Every sprint | Team lead sign-off |
| Patch (x.y.z) | As needed | Engineer sign-off |

## Pre-Release Checklist

### 1 Week Before Release

- [ ] Feature freeze: no new features merged
- [ ] QA regression testing begins
- [ ] Update \`CHANGELOG.md\`
- [ ] Update app version in \`package.json\`, \`Info.plist\`, \`build.gradle\`
- [ ] Review Privacy Nutrition Labels (iOS)

### 3 Days Before Release

- [ ] All P0/P1 bugs resolved
- [ ] Smoke test on physical devices (iPhone 15, Pixel 8)
- [ ] Performance profiling completed
- [ ] App Store / Google Play screenshots updated (if UI changed)

### Release Day

- [ ] Create git tag: \`v2.3.0\`
- [ ] Run automated build via Fastlane
- [ ] Submit to App Store Connect (iOS)
- [ ] Upload to Google Play Console (Android)
- [ ] Notify #releases Slack channel

## Automated Build with Fastlane

### iOS

\`\`\`bash
# Build and upload to TestFlight
fastlane ios beta

# Build and submit to App Store
fastlane ios release
\`\`\`

### Android

\`\`\`bash
# Build and upload to Play Store internal track
fastlane android beta

# Promote to production
fastlane android release
\`\`\`

## Rollback Procedure

If a critical bug is discovered post-release:

1. Immediately notify the team in #incidents
2. Assess severity: Can it be hotfixed? Is a rollback needed?
3. For App Store: Request an expedited review from Apple
4. For Play Store: Use the staged rollout slider to stop at current %
5. Deploy hotfix build
6. Document the incident in the post-mortem template

## Version Naming

\`\`\`
v2.3.1
 ^ ^ ^
 | | └── Patch: bug fixes only
 | └──── Minor: new features, backward compatible
 └────── Major: breaking changes or significant redesigns
\`\`\`
`,
  },
];

// ─── Seed Releases ────────────────────────────────────────────────────────────
export const SEED_RELEASES = [
  {
    id: "rel-1", version: "v2.0.0", name: "Platform Foundation", status: "released",
    releaseDate: "2026-01-15",
    description: "Initial stable platform release. Kanban board, backlog management, sprint lifecycle, and epic tracking.",
    taskIds: [],
    changelog: [
      { id: "cl-1", type: "feature", text: "Kanban board with drag-and-drop columns", createdAt: "2026-01-10T10:00:00Z" },
      { id: "cl-2", type: "feature", text: "Sprint start / complete lifecycle with backlog promotion", createdAt: "2026-01-10T10:01:00Z" },
      { id: "cl-3", type: "feature", text: "Epic management with color coding and task linking", createdAt: "2026-01-10T10:02:00Z" },
      { id: "cl-4", type: "feature", text: "Planning Poker with Fibonacci sequence and reveal animations", createdAt: "2026-01-10T10:03:00Z" },
      { id: "cl-5", type: "improvement", text: "Dark mode support across all pages", createdAt: "2026-01-10T10:04:00Z" },
      { id: "cl-6", type: "bugfix", text: "Fixed task card z-index overlap in board view", createdAt: "2026-01-12T09:00:00Z" },
    ],
  },
  {
    id: "rel-2", version: "v2.1.0", name: "Analytics & Reporting", status: "released",
    releaseDate: "2026-02-20",
    description: "Comprehensive analytics suite including burndown charts, sprint reviews, and retrospectives.",
    taskIds: [],
    changelog: [
      { id: "cl-7", type: "feature", text: "Real-time burndown chart with daily auto-snapshots", createdAt: "2026-02-15T10:00:00Z" },
      { id: "cl-8", type: "feature", text: "Sprint Review tab with velocity and completion metrics", createdAt: "2026-02-15T10:01:00Z" },
      { id: "cl-9", type: "feature", text: "Retrospective board with voting and action items", createdAt: "2026-02-15T10:02:00Z" },
      { id: "cl-10", type: "feature", text: "URL routing with browser history support", createdAt: "2026-02-15T10:03:00Z" },
      { id: "cl-11", type: "improvement", text: "Notification system with event-driven updates", createdAt: "2026-02-16T10:00:00Z" },
      { id: "cl-12", type: "bugfix", text: "Fixed burndown snapshot deduplication on same-day saves", createdAt: "2026-02-18T14:00:00Z" },
    ],
  },
  {
    id: "rel-3", version: "v2.2.0", name: "Documentation Hub", status: "in-progress",
    releaseDate: "2026-04-10",
    description: "Confluence-like documentation module with rich text editing, page hierarchies, and collaborative features.",
    taskIds: [],
    changelog: [
      { id: "cl-13", type: "feature", text: "Docs module with per-project spaces and hierarchical page tree", createdAt: "2026-03-01T10:00:00Z" },
      { id: "cl-14", type: "feature", text: "TipTap WYSIWYG editor with full toolbar", createdAt: "2026-03-01T10:01:00Z" },
      { id: "cl-15", type: "feature", text: "Page templates: Meeting Notes, RFC, How-To, API Reference, Runbook", createdAt: "2026-03-01T10:02:00Z" },
      { id: "cl-16", type: "feature", text: "Global search across all documentation spaces", createdAt: "2026-03-01T10:03:00Z" },
      { id: "cl-17", type: "feature", text: "@mention support with user autocomplete dropdown", createdAt: "2026-03-01T10:04:00Z" },
      { id: "cl-18", type: "feature", text: "Image upload via URL or base64 file picker", createdAt: "2026-03-01T10:05:00Z" },
    ],
  },
  {
    id: "rel-4", version: "v2.3.0", name: "QA & Release Ops", status: "planned",
    releaseDate: "2026-06-01",
    description: "Sprint Planning tab, Test Management module, and Release tracking with changelog.",
    taskIds: [],
    changelog: [
      { id: "cl-19", type: "feature", text: "Sprint Planning tab with team capacity and velocity reference", createdAt: "2026-03-23T10:00:00Z" },
      { id: "cl-20", type: "feature", text: "Releases & Changelog page with version tracking", createdAt: "2026-03-23T10:01:00Z" },
      { id: "cl-21", type: "feature", text: "Test Management: suites, cases, runs, and analytics", createdAt: "2026-03-23T10:02:00Z" },
    ],
  },
];

// ─── Seed Test Suites ─────────────────────────────────────────────────────────
export const SEED_TEST_SUITES = [
  { id: "ts-1", name: "Authentication Tests", description: "Login, signup, session, and password reset flows", projectId: "proj-1" },
  { id: "ts-2", name: "Task Management Tests", description: "CRUD operations for tasks, sprints, and backlog", projectId: "proj-1" },
  { id: "ts-3", name: "Mobile Core Tests", description: "Core mobile app functionality and performance", projectId: "proj-2" },
];

// ─── Seed Test Cases ──────────────────────────────────────────────────────────
export const SEED_TEST_CASES = [
  { id: "tc-1", suiteId: "ts-1", title: "Login with valid credentials", priority: "high",
    description: "Verify a registered user can log in with correct credentials.",
    steps: ["Navigate to /login", "Enter valid email and password", "Click 'Login'"],
    expectedResult: "User redirected to dashboard with welcome message.", status: "passed", taskId: null },
  { id: "tc-2", suiteId: "ts-1", title: "Login with invalid password", priority: "high",
    description: "Verify error message shown for wrong password.",
    steps: ["Navigate to /login", "Enter valid email but wrong password", "Click 'Login'"],
    expectedResult: "Error message 'Invalid credentials' shown. User stays on login page.", status: "failed", taskId: null },
  { id: "tc-3", suiteId: "ts-1", title: "Password reset email delivery", priority: "medium",
    description: "Verify reset email is sent within 60 seconds.",
    steps: ["Click 'Forgot password?'", "Enter registered email", "Click 'Send Reset Link'", "Check inbox"],
    expectedResult: "Confirmation shown, reset email received with valid link.", status: "passed", taskId: null },
  { id: "tc-4", suiteId: "ts-1", title: "Session timeout after inactivity", priority: "medium",
    description: "Session should expire after 30 minutes of inactivity.",
    steps: ["Log in", "Remain idle for 30 minutes", "Attempt any action"],
    expectedResult: "Redirected to login. 'Session expired' message shown.", status: "untested", taskId: null },
  { id: "tc-5", suiteId: "ts-1", title: "Concurrent session detection", priority: "low",
    description: "Login on second device should invalidate first session.",
    steps: ["Log in on Device A", "Log in on Device B (same credentials)", "Return to Device A"],
    expectedResult: "Device A session invalidated. Re-authentication required.", status: "untested", taskId: null },
  { id: "tc-6", suiteId: "ts-2", title: "Create task from board view", priority: "high",
    description: "Verify task creation from board opens modal and saves correctly.",
    steps: ["Click 'Create' in top bar", "Fill title, description, assignee, story points", "Click 'Save'"],
    expectedResult: "Task appears in To Do column with correct data.", status: "passed", taskId: null },
  { id: "tc-7", suiteId: "ts-2", title: "Drag task between columns", priority: "high",
    description: "Verify drag-and-drop updates task status.",
    steps: ["Open board view", "Drag task from To Do to In Progress"],
    expectedResult: "Task moves to In Progress. Status updated in detail view.", status: "passed", taskId: null },
  { id: "tc-8", suiteId: "ts-2", title: "Delete task with confirmation", priority: "medium",
    description: "Verify deletion requires confirmation and is permanent.",
    steps: ["Open task detail", "Click Delete", "Confirm in dialog"],
    expectedResult: "Task removed from all views. Cannot be undone.", status: "untested", taskId: null },
  { id: "tc-9", suiteId: "ts-2", title: "Sprint start and complete lifecycle", priority: "high",
    description: "Verify full sprint lifecycle from start to completion.",
    steps: ["Click Start Sprint", "Complete all tasks", "Click Complete Sprint"],
    expectedResult: "Sprint marked complete. Unfinished tasks moved to backlog.", status: "failed", taskId: null },
  { id: "tc-10", suiteId: "ts-2", title: "Custom fields persist across sessions", priority: "medium",
    description: "Custom fields defined in Admin should save and reload correctly.",
    steps: ["Add custom field in Admin", "Open task, fill custom field", "Refresh page"],
    expectedResult: "Custom field value persists after refresh.", status: "passed", taskId: null },
  { id: "tc-11", suiteId: "ts-3", title: "App cold start time", priority: "high",
    description: "App should reach interactive state in < 3s on mid-range device.",
    steps: ["Force-close app", "Tap icon", "Measure time to interactive"],
    expectedResult: "Interactive in < 3000ms on mid-range Android.", status: "passed", taskId: null },
  { id: "tc-12", suiteId: "ts-3", title: "Offline mode graceful degradation", priority: "medium",
    description: "App should show cached data and offline banner with no network.",
    steps: ["Load app with internet", "Enable airplane mode", "Scroll task list"],
    expectedResult: "Cached tasks shown. 'Offline — changes will sync' banner displayed.", status: "untested", taskId: null },
  { id: "tc-13", suiteId: "ts-3", title: "Push notification deep-link", priority: "medium",
    description: "Tapping push notification should open the correct task.",
    steps: ["Assign task to test user", "Tap the push notification", "Check which screen opens"],
    expectedResult: "Task detail screen opens directly for the assigned task.", status: "untested", taskId: null },
];

// ─── Seed Test Runs ───────────────────────────────────────────────────────────
export const SEED_TEST_RUNS = [
  {
    id: "tr-1", suiteId: "ts-1", name: "Auth Regression — Sprint 85",
    status: "completed", createdAt: "2026-03-08T10:00:00Z", completedAt: "2026-03-08T11:45:00Z",
    results: [
      { caseId: "tc-1", status: "passed", notes: "" },
      { caseId: "tc-2", status: "failed", notes: "Error message not shown in Firefox 122. Works in Chrome." },
      { caseId: "tc-3", status: "passed", notes: "" },
      { caseId: "tc-4", status: "skipped", notes: "Timeout testing not available in CI environment" },
      { caseId: "tc-5", status: "skipped", notes: "Out of scope for this run" },
    ],
  },
  {
    id: "tr-2", suiteId: "ts-1", name: "Auth Regression — Sprint 86",
    status: "in-progress", createdAt: "2026-03-20T09:00:00Z", completedAt: null,
    results: [
      { caseId: "tc-1", status: "passed", notes: "" },
      { caseId: "tc-2", status: "untested", notes: "" },
      { caseId: "tc-3", status: "untested", notes: "" },
      { caseId: "tc-4", status: "untested", notes: "" },
      { caseId: "tc-5", status: "untested", notes: "" },
    ],
  },
  {
    id: "tr-3", suiteId: "ts-2", name: "Task CRUD — Sprint 85",
    status: "completed", createdAt: "2026-03-09T13:00:00Z", completedAt: "2026-03-09T15:00:00Z",
    results: [
      { caseId: "tc-6", status: "passed", notes: "" },
      { caseId: "tc-7", status: "passed", notes: "" },
      { caseId: "tc-8", status: "passed", notes: "" },
      { caseId: "tc-9", status: "failed", notes: "Sprint complete endpoint 500 when unfinished tasks exist." },
      { caseId: "tc-10", status: "passed", notes: "" },
    ],
  },
];
