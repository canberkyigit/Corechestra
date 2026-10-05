/** Health palette of the Portfolio tab. */
export const HEALTH_META = {
  "on-track":  { label: "On track",  hex: "#10b981", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30" },
  "at-risk":   { label: "At risk",   hex: "#f59e0b", dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30" },
  "off-track": { label: "Off track", hex: "#ef4444", dot: "bg-red-500",     pill: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30" },
  "no-data":   { label: "No data",   hex: "#94a3b8", dot: "bg-slate-300",   pill: "bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30" },
};

/** Health values a person can report in a status update. */
export const MANUAL_HEALTH_OPTIONS = ["on-track", "at-risk", "off-track"];
