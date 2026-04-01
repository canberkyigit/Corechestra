// ─── Default Constants ───────────────────────────────────────────────────────
// These are structural defaults used when creating new projects.
// All seed/dummy data has been migrated to Firestore.

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
