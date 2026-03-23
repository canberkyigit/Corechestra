import {
  FaCheckSquare, FaBug, FaPlusSquare, FaExclamationCircle,
  FaUser, FaSearch, FaRocket, FaFlag, FaPlay, FaRegDotCircle,
} from "react-icons/fa";

export const TYPE_OPTIONS = [
  { value: "task",          label: "Task",           icon: FaCheckSquare,       color: "text-green-500"  },
  { value: "bug",           label: "Bug",            icon: FaBug,               color: "text-red-500"    },
  { value: "feature",       label: "Feature",        icon: FaPlusSquare,        color: "text-cyan-500"   },
  { value: "defect",        label: "Defect",         icon: FaExclamationCircle, color: "text-orange-500" },
  { value: "userstory",     label: "User Story",     icon: FaUser,              color: "text-blue-500"   },
  { value: "investigation", label: "Investigation",  icon: FaSearch,            color: "text-purple-500" },
  { value: "epic",          label: "Epic",           icon: FaRocket,            color: "text-violet-500" },
  { value: "test",          label: "Test",           icon: FaSearch,            color: "text-teal-500"   },
  { value: "testset",       label: "Test Set",       icon: FaFlag,              color: "text-indigo-500" },
  { value: "testexecution", label: "Test Execution", icon: FaPlay,              color: "text-lime-600"   },
  { value: "precondition",  label: "Precondition",   icon: FaRegDotCircle,      color: "text-sky-500"    },
];

export const STATUS_OPTIONS = [
  { value: "todo",       label: "To Do"             },
  { value: "inprogress", label: "In Progress"       },
  { value: "review",     label: "Review"            },
  { value: "awaiting",   label: "Awaiting Customer" },
  { value: "blocked",    label: "Blocked"           },
  { value: "done",       label: "Done"              },
];

// Subtask statuses — no awaiting/blocked
export const SUBTASK_STATUS_OPTIONS = [
  { value: "todo",       label: "To Do",      color: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"  },
  { value: "inprogress", label: "In Progress", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"  },
  { value: "review",     label: "Review",      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  { value: "done",       label: "Done",        color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"  },
];

export const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "text-red-600"    },
  { value: "high",     label: "High",     color: "text-orange-500" },
  { value: "medium",   label: "Medium",   color: "text-yellow-500" },
  { value: "low",      label: "Low",      color: "text-green-500"  },
];

export const ASSIGNEE_LIST = ["alice", "bob", "carol", "dave", "unassigned"];
