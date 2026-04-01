import { FaColumns, FaList, FaTable } from "react-icons/fa";

export const BOARD_TABS = [
  { id: "active", label: "Active Sprint" },
  { id: "backlog", label: "Backlog" },
  { id: "epics", label: "Epics" },
  { id: "refinement", label: "Refinement" },
  { id: "review", label: "Sprint Review" },
  { id: "retrospective", label: "Retrospective" },
  { id: "planning", label: "Planning" },
  { id: "allsprints", label: "All Sprints" },
  { id: "settings", label: "Board Settings" },
];

export const BOARD_VIEW_MODES = [
  { id: "kanban", icon: FaColumns, title: "Kanban" },
  { id: "list", icon: FaList, title: "List" },
  { id: "table", icon: FaTable, title: "Table" },
];

export const BOARD_STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "inprogress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "awaiting", label: "Awaiting Customer" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];
