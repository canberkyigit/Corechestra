// Retro board categories (keys match `retrospectiveItems` in the store).
export const COLUMNS = [
  {
    key: "wentWell",
    label: "Went Well",
    icon: "✓",
    header: "bg-green-500",
    card: "border-green-100 dark:border-green-900/30",
    badge: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    addBtn: "hover:bg-green-50 dark:hover:bg-green-900/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  {
    key: "wentWrong",
    label: "Went Wrong",
    icon: "✗",
    header: "bg-red-500",
    card: "border-red-100 dark:border-red-900/30",
    badge: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    addBtn: "hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  {
    key: "canImprove",
    label: "Can Improve",
    icon: "💡",
    header: "bg-blue-500",
    card: "border-blue-100 dark:border-blue-900/30",
    badge: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    addBtn: "hover:bg-blue-50 dark:hover:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  {
    key: "actionItems",
    label: "Action Items",
    icon: "🎯",
    header: "bg-violet-500",
    card: "border-violet-100 dark:border-violet-900/30",
    badge: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
    addBtn: "hover:bg-violet-50 dark:hover:bg-violet-900/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  },
];
