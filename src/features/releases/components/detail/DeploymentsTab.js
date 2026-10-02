import React, { memo, useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { FaChevronRight, FaCloudUploadAlt, FaExclamationCircle, FaPlus, FaUndo } from "react-icons/fa";
import {
  ENV_STATUS_META,
  ENVIRONMENT_LABELS,
  FIELD_BASE, FIELD_CLASS,
  MANUAL_TIMELINE_TYPES,
  TIMELINE_TONE,
  TIMELINE_TYPE_LABELS,
} from "../../constants/releaseMeta";
import { sortedTimeline } from "../../utils/releaseModel";
import { formatDateTime, parseDate, userDisplayName } from "../../utils/releaseUtils";
import DetailCard, { SMALL_BTN_DANGER, SMALL_BTN_GHOST, SMALL_BTN_PRIMARY, SMALL_BTN_SECONDARY } from "./DetailCard";

function EnvironmentCard({ env, users, canManage, onAction }) {
  const meta = ENV_STATUS_META[env.status] || ENV_STATUS_META.pending;
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-200/80 bg-white/100 p-4 dark:border-[#252b3b] dark:bg-[#1a1f2e]" data-testid={`release-env-${env.key}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">{ENVIRONMENT_LABELS[env.key]}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.ring} ${meta.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
          {meta.label}
        </span>
      </div>
      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex justify-between gap-2"><dt className="text-slate-500">Version</dt><dd className="font-mono text-slate-800">{env.version || "—"}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-slate-500">Build</dt><dd className="font-mono text-slate-800">{env.build || "—"}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-slate-500">Updated</dt><dd className="text-slate-800">{env.deployedAt ? formatDateTime(env.deployedAt) : "—"}</dd></div>
        <div className="flex justify-between gap-2"><dt className="text-slate-500">By</dt><dd className="text-slate-800">{env.deployedBy ? userDisplayName(users, env.deployedBy) : "—"}</dd></div>
      </dl>
      {canManage && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-200/70 pt-3 dark:border-[#252b3b]">
          <button type="button" onClick={() => onAction("deploy")} className={SMALL_BTN_PRIMARY} aria-label={`Deploy to ${ENVIRONMENT_LABELS[env.key]}`}>
            <FaCloudUploadAlt className="h-3 w-3" /> Deploy
          </button>
          <button type="button" onClick={() => onAction("fail")} className={SMALL_BTN_GHOST} disabled={env.status === "pending"} aria-label={`Mark ${ENVIRONMENT_LABELS[env.key]} deployment failed`}>
            <FaExclamationCircle className="h-3 w-3" /> Failed
          </button>
          <button type="button" onClick={() => onAction("rollback")} className={SMALL_BTN_DANGER} disabled={env.status === "pending" || env.status === "rolled-back"} aria-label={`Roll back ${ENVIRONMENT_LABELS[env.key]}`}>
            <FaUndo className="h-3 w-3" /> Roll back
          </button>
        </div>
      )}
    </div>
  );
}

function relative(timestamp) {
  const date = parseDate(timestamp);
  if (!date) return "";
  try {
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch {
    return "";
  }
}

function DeploymentsTab({ release, users, canManage, actions }) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("deploy");
  const [text, setText] = useState("");
  const events = useMemo(() => sortedTimeline(release), [release]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-stretch">
        {release.environments.map((env, index) => (
          <React.Fragment key={env.key}>
            {index > 0 && (
              <div className="hidden items-center justify-center text-slate-400 lg:flex" aria-hidden="true">
                <FaChevronRight className="h-3 w-3" />
              </div>
            )}
            <EnvironmentCard env={env} users={users} canManage={canManage} onAction={(action) => actions.envAction(release, env.key, action)} />
          </React.Fragment>
        ))}
      </div>

      <DetailCard
        title="Activity timeline"
        subtitle={`${events.length} event${events.length !== 1 ? "s" : ""}`}
        action={canManage && !adding && (
          <button type="button" onClick={() => setAdding(true)} className={SMALL_BTN_SECONDARY}>
            <FaPlus className="h-2.5 w-2.5" /> Add event
          </button>
        )}
        testId="release-timeline"
      >
        {adding && canManage && (
          <form
            aria-label="Add timeline event"
            className="mb-4 flex flex-col gap-2 rounded-lg bg-slate-500/[0.04] p-3 sm:flex-row dark:bg-white/[0.02]"
            onSubmit={(event) => {
              event.preventDefault();
              if (actions.addTimelineEvent(release, { type, text })) {
                setText("");
                setAdding(false);
              }
            }}
          >
            <select aria-label="Event type" value={type} onChange={(event) => setType(event.target.value)} className={`${FIELD_BASE} h-8 w-auto py-0 text-xs`}>
              {MANUAL_TIMELINE_TYPES.map((value) => <option key={value} value={value}>{TIMELINE_TYPE_LABELS[value]}</option>)}
            </select>
            <input type="text" aria-label="Event description" value={text} onChange={(event) => setText(event.target.value)} placeholder="What happened?" className={`${FIELD_CLASS} h-8 py-1`} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding(false)} className={SMALL_BTN_GHOST}>Cancel</button>
              <button type="submit" disabled={!text.trim()} className={SMALL_BTN_PRIMARY}>Add</button>
            </div>
          </form>
        )}
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ol className="relative ml-1.5 border-l border-slate-200 dark:border-[#2a3044]">
            {events.map((event) => (
              <li key={event.id || `${event.type}-${event.timestamp}`} className="relative pb-4 pl-5 last:pb-0">
                <span className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-[#1a1f2e] ${TIMELINE_TONE[event.type] || "bg-slate-400"}`} aria-hidden="true" />
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xs font-semibold text-slate-700">{TIMELINE_TYPE_LABELS[event.type] || event.type}</span>
                  {event.environment && <span className="rounded bg-slate-500/10 px-1.5 text-[10px] font-medium text-slate-600">{ENVIRONMENT_LABELS[event.environment] || event.environment}</span>}
                  <span className="text-[11px] text-slate-500" title={formatDateTime(event.timestamp)}>{relative(event.timestamp)}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-800">{event.text}</p>
                {event.actor && <p className="mt-0.5 text-[11px] text-slate-500">by {userDisplayName(users, event.actor)}</p>}
              </li>
            ))}
          </ol>
        )}
      </DetailCard>
    </div>
  );
}

export default memo(DeploymentsTab);
