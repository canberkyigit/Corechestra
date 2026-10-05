import React, { useState } from "react";
import { FaArrowRight, FaCheckCircle, FaColumns, FaExclamationCircle, FaMinusCircle, FaTachometerAlt, FaTrash } from "react-icons/fa";
import { Avatar } from "../../dashboard/components/DashboardPrimitives";
import { HEALTH_META, MANUAL_HEALTH_OPTIONS } from "../utils/healthMeta";
import {
  Drawer,
  DrawerClose,
  GHOST_BTN,
  HealthPill,
  INPUT_CLS,
  PRIMARY_BTN,
  ScoreRing,
  SECONDARY_BTN,
  TrackBar,
  relativeDays,
} from "./PortfolioPrimitives";
import { STATUS_UPDATE_FRESH_DAYS } from "../utils/portfolioMetrics";
import { ProjectMark, sprintTimeLabel } from "./PortfolioViews";

const SIGNAL_ICON = {
  good: { icon: FaCheckCircle, cls: "text-emerald-500" },
  warn: { icon: FaMinusCircle, cls: "text-amber-500" },
  bad: { icon: FaExclamationCircle, cls: "text-red-500" },
};

function StatusUpdateForm({ initialHealth, onSubmit }) {
  const [health, setHealth] = useState(initialHealth || "on-track");
  const [summary, setSummary] = useState("");
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-[#2a3044] dark:bg-[#1a1f2e]">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Post a status update</p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Project health">
        {MANUAL_HEALTH_OPTIONS.map((key) => {
          const meta = HEALTH_META[key];
          const selected = health === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setHealth(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                selected ? meta.pill : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300 dark:bg-[#141720] dark:text-slate-300 dark:ring-[#2a3044]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
              {meta.label}
            </button>
          );
        })}
      </div>
      <textarea
        rows={3}
        className={`${INPUT_CLS} mt-2 resize-none`}
        placeholder="Highlights, risks and asks for stakeholders…"
        aria-label="Status update summary"
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">Shown as the project health for {STATUS_UPDATE_FRESH_DAYS} days</span>
        <button type="button" className={PRIMARY_BTN} disabled={!summary.trim()} onClick={() => { onSubmit({ health, summary }); setSummary(""); }}>
          Post update
        </button>
      </div>
    </div>
  );
}

/** Explains one project's health and collects status updates. */
export default function ProjectHealthDrawer({ row, updates, ownerName, canUpdate, now, onClose, onPostUpdate, onDeleteUpdate, onOpenDashboard, onOpenBoard }) {
  if (!row) return null;
  const { project, pace, counts, nextRelease } = row;
  const calculated = HEALTH_META[row.calculatedHealth] || HEALTH_META["no-data"];

  return (
    <Drawer open onClose={onClose} labelledBy="project-health-title">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-[#2a3044]">
        <div className="flex min-w-0 items-center gap-3">
          <ProjectMark project={project} size={40} />
          <div className="min-w-0">
            <h2 id="project-health-title" className="truncate text-lg font-semibold text-slate-900 dark:text-white">{project.name}</h2>
            <div className="mt-0.5 flex items-center gap-1.5">
              <HealthPill health={row.health} suffix={row.healthSource === "reported" ? "reported" : "calculated"} />
            </div>
          </div>
        </div>
        <DrawerClose onClose={onClose} />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <section className="flex items-center gap-4 rounded-xl border border-slate-200/80 p-4 dark:border-[#252b3b]">
          <ScoreRing value={row.score} size={64} stroke={6} color={calculated.hex} label={row.score === null ? "No health score" : `Health score ${row.score}`}>
            <span className="text-base">{row.score ?? "—"}</span>
          </ScoreRing>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Calculated health: {calculated.label}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Scored from sprint pace, overdue and blocked work, high-priority bugs, release readiness and test results.
            </p>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Why this health</h3>
          {row.signals.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Not enough data yet. Add work to a sprint or plan a release to see signals.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 dark:divide-[#232838] dark:border-[#252b3b]">
              {row.signals.map((signal) => {
                const meta = SIGNAL_ICON[signal.tone] || SIGNAL_ICON.warn;
                return (
                  <li key={signal.key} className="flex items-start gap-3 px-3 py-2.5">
                    <meta.icon className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${meta.cls}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{signal.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{signal.detail}</p>
                    </div>
                    {signal.impact < 0 && <span className="flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600 dark:bg-[#232838] dark:text-slate-300">{signal.impact}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200/80 p-3 dark:border-[#252b3b]">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Sprint</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{row.sprint?.active ? row.sprint.name : "No active sprint"}</p>
            {row.sprint?.active && (
              <>
                <div className="mt-2"><TrackBar value={pace.progress} expected={pace.elapsed} health={row.calculatedHealth} className="h-1.5" label="Sprint progress" /></div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{pace.done}/{pace.total} items · {pace.progress}% done{pace.daysLeft !== null ? ` · ${sprintTimeLabel(pace)}` : ""}</p>
              </>
            )}
          </div>
          <div className="rounded-xl border border-slate-200/80 p-3 dark:border-[#252b3b]">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Next release</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{nextRelease ? `${nextRelease.version}${nextRelease.name ? ` · ${nextRelease.name}` : ""}` : "Nothing planned"}</p>
            {nextRelease && (
              <>
                <div className="mt-2"><TrackBar value={nextRelease.readiness ?? 0} health={nextRelease.readiness >= 60 ? "on-track" : "at-risk"} className="h-1.5" label="Release readiness" /></div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{nextRelease.readiness ?? 0}% ready{nextRelease.date ? ` · ${nextRelease.date}` : ""}</p>
              </>
            )}
          </div>
          <div className="col-span-2 grid grid-cols-4 gap-2 rounded-xl border border-slate-200/80 p-3 dark:border-[#252b3b]">
            {[
              ["Open", counts.open],
              ["Overdue", counts.overdue],
              ["Blocked", counts.blocked],
              ["Test pass", row.passRate === null ? "—" : `${row.passRate}%`],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Status updates</h3>
          {canUpdate && <StatusUpdateForm initialHealth={row.calculatedHealth !== "no-data" ? row.calculatedHealth : "on-track"} onSubmit={(data) => onPostUpdate({ ...data, projectId: project.id })} />}
          {updates.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No updates yet. A short weekly update keeps stakeholders in the loop.</p>
          ) : (
            <ol className="space-y-3">
              {updates.map((update) => (
                <li key={update.id} className="group rounded-xl border border-slate-200/80 p-3 dark:border-[#252b3b]">
                  <div className="flex items-center gap-2">
                    <Avatar name={ownerName(update.createdBy) || "?"} size={22} />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{ownerName(update.createdBy) || "Someone"}</span>
                    <span className="text-xs text-slate-400">{relativeDays(update.createdAt, now)}</span>
                    <span className="ml-auto"><HealthPill health={update.health} /></span>
                    {canUpdate && (
                      <button type="button" className={`${GHOST_BTN} opacity-0 group-hover:opacity-100 focus:opacity-100`} onClick={() => onDeleteUpdate(update.id)} aria-label="Delete status update">
                        <FaTrash className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                  {update.summary && <p className="mt-2 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{update.summary}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-[#2a3044]">
        <button type="button" className={SECONDARY_BTN} onClick={onOpenBoard}><FaColumns className="h-3 w-3" /> Open board</button>
        <button type="button" className={PRIMARY_BTN} onClick={onOpenDashboard}><FaTachometerAlt className="h-3 w-3" /> Project dashboard <FaArrowRight className="h-2.5 w-2.5" /></button>
      </div>
    </Drawer>
  );
}
