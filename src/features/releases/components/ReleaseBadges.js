import React from "react";
import { AppBadge, getReleaseStatusTone } from "../../../shared/components/AppPrimitives";
import { TASK_STATUS_SHORT_LABELS } from "../../../shared/constants/taskMeta";
import { STATUS_META, TASK_STATUS_CHIP, TASK_STATUS_CHIP_FALLBACK } from "../constants/releaseMeta";

export function StatusDot({ status }) {
  const meta = STATUS_META[status] || STATUS_META.planned;
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />;
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.planned;
  return (
    <AppBadge tone={getReleaseStatusTone(status)}>
      {meta.label}
    </AppBadge>
  );
}

export function VersionBadge({ version, status, size = "sm" }) {
  const meta = STATUS_META[status] || STATUS_META.planned;
  const sz = size === "lg" ? "text-sm px-3 py-1 rounded-lg font-bold" : "text-xs px-2 py-0.5 rounded font-semibold";
  return (
    <span className={`${meta.versionBg} text-white ${sz} font-mono`}>{version || "—"}</span>
  );
}

export function ReleaseStatCard({ label, value, sub }) {
  return (
    <div className="app-surface px-4 py-4 flex flex-col gap-1.5">
      <span className="app-kicker">{label}</span>
      <span className="text-slate-800 dark:text-white text-2xl font-bold leading-none">{value}</span>
      {sub && <span className="app-subtle-copy text-xs">{sub}</span>}
    </div>
  );
}

/** Task status chip used in release task pickers and the linked-task list. */
export function TaskStatusChip({ status, className = "" }) {
  return (
    <span className={`${className} ${TASK_STATUS_CHIP[status] || TASK_STATUS_CHIP_FALLBACK}`}>
      {TASK_STATUS_SHORT_LABELS[status] || status}
    </span>
  );
}
