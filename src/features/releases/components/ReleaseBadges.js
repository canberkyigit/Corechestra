import React, { memo } from "react";
import {
  ENV_STATUS_META,
  ENVIRONMENT_LABELS,
  ENVIRONMENT_SHORT,
  RISK_META,
  STATUS_META,
} from "../constants/releaseMeta";
import { TASK_STATUS_BADGE_STYLES, TASK_STATUS_SHORT_LABELS } from "../../../shared/constants/taskMeta";
import { describeTargetDate, findUser, formatDate, initialsOf } from "../utils/releaseUtils";

export const StatusPill = memo(function StatusPill({ status, size = "sm" }) {
  const meta = STATUS_META[status] || STATUS_META.planned;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset font-medium whitespace-nowrap ${meta.pill} ${
        size === "lg" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
});

export const VersionBadge = memo(function VersionBadge({ version, status, size = "sm" }) {
  const meta = STATUS_META[status] || STATUS_META.planned;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-mono font-semibold whitespace-nowrap bg-slate-900/[0.04] text-slate-900 ring-1 ring-inset ring-slate-900/10 dark:bg-white/[0.06] dark:text-slate-100 dark:ring-white/10 ${
        size === "lg" ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-xs"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-sm ${meta.dot}`} aria-hidden="true" />
      {version}
    </span>
  );
});

export const RiskBadge = memo(function RiskBadge({ level }) {
  const meta = RISK_META[level] || RISK_META.none;
  if (level === "none" || !level) {
    return <span className="text-xs text-slate-500">—</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ring-1 ring-inset px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}>
      {meta.label}
    </span>
  );
});

function readinessColor(score) {
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export const ReadinessRing = memo(function ReadinessRing({ score = 0, size = 34, stroke = 4, label = true, muted = false }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);
  const color = muted ? "#94a3b8" : readinessColor(clamped);
  return (
    <span className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Readiness ${clamped}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-200 dark:stroke-[#2a3044]" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {label && (
        <span className={`absolute inset-0 flex items-center justify-center font-semibold tabular-nums text-slate-700 dark:text-slate-200 ${size >= 70 ? "text-xl" : size >= 48 ? "text-sm" : "text-[10px]"}`}>
          {clamped}
        </span>
      )}
    </span>
  );
});

export const ProgressBar = memo(function ProgressBar({ value = 0, tone = "blue", className = "h-1.5" }) {
  const toneClass = {
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    slate: "bg-slate-400",
  }[tone] || "bg-blue-500";
  return (
    <div className={`w-full rounded-full overflow-hidden bg-slate-900/[0.07] dark:bg-white/[0.08] ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${toneClass} transition-[width] duration-300`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
});

/** Dev → Staging → Production mini pipeline. */
export const EnvPipeline = memo(function EnvPipeline({ environments = [], compact = true }) {
  return (
    <div className="flex items-center gap-1" aria-label="Environment pipeline">
      {environments.map((env, index) => {
        const meta = ENV_STATUS_META[env.status] || ENV_STATUS_META.pending;
        const title = `${ENVIRONMENT_LABELS[env.key] || env.key}: ${meta.label}${env.version ? ` · ${env.version}` : ""}`;
        return (
          <React.Fragment key={env.key}>
            {index > 0 && <span className="w-2 h-px bg-slate-300 dark:bg-[#334155]" aria-hidden="true" />}
            <span
              title={title}
              aria-label={title}
              className={`inline-flex items-center gap-1 rounded-md ring-1 ring-inset px-1.5 py-0.5 text-[10px] font-semibold ${meta.ring} ${meta.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
              {compact ? ENVIRONMENT_SHORT[env.key] : ENVIRONMENT_LABELS[env.key]}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
});

export const OwnerAvatar = memo(function OwnerAvatar({ users, owner, size = "sm", showName = false }) {
  const user = findUser(users, owner);
  const name = user?.name || user?.username || owner;
  if (!owner) {
    return <span className="text-xs text-slate-500">Unassigned</span>;
  }
  const dim = size === "lg" ? "w-8 h-8 text-xs" : size === "md" ? "w-7 h-7 text-[11px]" : "w-6 h-6 text-[10px]";
  return (
    <span className="inline-flex items-center gap-2 min-w-0" title={name}>
      <span
        className={`${dim} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ring-2 ring-white dark:ring-[#1c2030]`}
        style={{ backgroundColor: user?.color || "#4f46e5" }}
        aria-hidden={showName ? "true" : undefined}
        aria-label={showName ? undefined : name}
      >
        {initialsOf(name)}
      </span>
      {showName && <span className="text-sm text-slate-700 truncate">{name}</span>}
    </span>
  );
});

export function TaskStatusChip({ status }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${TASK_STATUS_BADGE_STYLES[status] || TASK_STATUS_BADGE_STYLES.todo}`}>
      {TASK_STATUS_SHORT_LABELS[status] || status || "To Do"}
    </span>
  );
}

const DATE_TONE = {
  muted: "text-slate-500",
  warn: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400 font-medium",
};

export const TargetDate = memo(function TargetDate({ date, active, now, stacked = true }) {
  const rel = describeTargetDate(date, { active, now });
  if (!date) return <span className="text-xs text-slate-500">No date</span>;
  return (
    <span className={`flex ${stacked ? "flex-col" : "items-center gap-2"} min-w-0`}>
      <span className="text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatDate(date, "MMM d, yyyy")}</span>
      <span className={`text-[11px] whitespace-nowrap ${DATE_TONE[rel.tone]}`}>{rel.text}</span>
    </span>
  );
});
