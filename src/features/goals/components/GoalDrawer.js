import React, { useEffect, useState } from "react";
import { FaCheck, FaFlagCheckered, FaLink, FaPen, FaSlidersH, FaTrash } from "react-icons/fa";
import { Avatar } from "../../dashboard/components/DashboardPrimitives";
import {
  HEALTH_META,
  KR_TYPE_META,
  MANUAL_HEALTH_OPTIONS,
  daysLeftInPeriod,
  keyResultValueLabel,
  periodLabel,
} from "../utils/goalModel";
import { LevelBadge, goalScopeLabel } from "./GoalCard";
import {
  Drawer,
  DrawerClose,
  GHOST_BTN,
  HealthPill,
  INPUT_CLS,
  PRIMARY_BTN,
  ScoreRing,
  TrackBar,
  relativeDays,
} from "./StrategyPrimitives";

const KR_ICONS = { metric: FaSlidersH, milestone: FaFlagCheckered, work: FaLink };

function KeyResultRow({ kr, progress, workIndex, epicsById, canEdit, onUpdate }) {
  const current = kr.current;
  const [value, setValue] = useState(String(current ?? ""));
  useEffect(() => { setValue(String(current ?? "")); }, [current]);
  const Icon = KR_ICONS[kr.type] || FaSlidersH;
  const health = progress >= 100 ? "done" : "on-track";
  const commit = () => {
    if (value === "" || Number(value) === Number(kr.current)) return;
    onUpdate({ current: Number(value) });
  };

  return (
    <li className="rounded-xl border border-slate-200/80 p-3 dark:border-[#252b3b]" data-testid="key-result">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-[#232838] dark:text-slate-400" title={KR_TYPE_META[kr.type]?.label}>
          <Icon className="h-3 w-3" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{kr.title}</p>
            <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{progress}%</span>
          </div>
          <div className="mt-2">
            <TrackBar value={progress} health={health} className="h-1.5" label={`${kr.title} progress`} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{keyResultValueLabel(kr, workIndex)}</span>
            {canEdit && kr.type === "metric" && (
              <span className="inline-flex items-center gap-1.5">
                <span>Update to</span>
                <input
                  type="number"
                  aria-label={`Current value of ${kr.title}`}
                  className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-[#2a3044] dark:bg-[#141720] dark:text-slate-200"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  onBlur={commit}
                  onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                />
                {kr.unit && <span>{kr.unit}</span>}
              </span>
            )}
            {canEdit && kr.type === "milestone" && (
              <button type="button" className={`${GHOST_BTN} ${kr.done ? "text-emerald-600 dark:text-emerald-400" : ""}`} onClick={() => onUpdate({ done: !kr.done })}>
                <FaCheck className="h-2.5 w-2.5" /> {kr.done ? "Achieved" : "Mark achieved"}
              </button>
            )}
          </div>
          {kr.type === "work" && (kr.epicIds || []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {kr.epicIds.map((id) => {
                const epic = epicsById.get(String(id));
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-[#232838] dark:text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: epic?.color || "#6366f1" }} aria-hidden="true" />
                    {epic?.title || "Deleted epic"}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function CheckInForm({ goal, onSubmit }) {
  const [health, setHealth] = useState(goal.health || "");
  const [note, setNote] = useState("");
  const submit = () => {
    if (!note.trim() && !health) return;
    onSubmit({ health: health || null, note, progress: goal.progress });
    setNote("");
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-[#2a3044] dark:bg-[#1a1f2e]">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Check in</p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Reported health">
        {MANUAL_HEALTH_OPTIONS.map((key) => {
          const meta = HEALTH_META[key];
          const selected = health === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setHealth(selected ? "" : key)}
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
        rows={2}
        className={`${INPUT_CLS} mt-2 resize-none`}
        placeholder="What moved this week? Any risks or help needed?"
        aria-label="Check-in note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="mt-2 flex justify-end">
        <button type="button" className={PRIMARY_BTN} disabled={!note.trim() && !health} onClick={submit}>Post check-in</button>
      </div>
    </div>
  );
}

/** Detail drawer of one objective. */
export default function GoalDrawer({
  goal, goals, teams, projects, epicsById, workIndex, ownerName, canEdit, now,
  onClose, onEdit, onDelete, onUpdateKeyResult, onCheckIn, onOpenGoal,
}) {
  if (!goal) return null;
  const health = HEALTH_META[goal.healthKey] || HEALTH_META["no-data"];
  const parent = goal.parentId ? goals.find((item) => item.id === goal.parentId) : null;
  const children = goals.filter((item) => item.parentId === goal.id);
  const daysLeft = daysLeftInPeriod(goal.period, now);

  return (
    <Drawer open onClose={onClose} labelledBy="goal-drawer-title">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-[#2a3044]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <LevelBadge level={goal.level} />
            <span>{goalScopeLabel(goal, { teams, projects })}</span>
            <span>· {periodLabel(goal.period)}</span>
            {daysLeft !== null && daysLeft > 0 && <span>· {daysLeft} days left</span>}
          </div>
          <h2 id="goal-drawer-title" className="mt-1.5 text-lg font-semibold leading-snug text-slate-900 dark:text-white">{goal.title}</h2>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {canEdit && (
            <>
              <button type="button" className={GHOST_BTN} onClick={onEdit} aria-label="Edit goal"><FaPen className="h-3 w-3" /></button>
              <button type="button" className={`${GHOST_BTN} hover:text-red-600`} onClick={onDelete} aria-label="Delete goal"><FaTrash className="h-3 w-3" /></button>
            </>
          )}
          <DrawerClose onClose={onClose} />
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <section className="flex items-center gap-4 rounded-xl border border-slate-200/80 p-4 dark:border-[#252b3b]">
          <ScoreRing value={goal.progress} size={64} stroke={6} color={health.hex} label={`${goal.progress}% complete`}>
            <span className="text-sm">{goal.progress}%</span>
          </ScoreRing>
          <div className="min-w-0 flex-1 space-y-1.5">
            <HealthPill health={goal.healthKey} size="lg" suffix={goal.health && goal.healthKey !== "done" ? "reported" : null} />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {goal.expected !== null ? <>Expected <span className="font-medium text-slate-700 dark:text-slate-200">{goal.expected}%</span> by today based on time elapsed in {periodLabel(goal.period)}.</> : "No period set."}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              {goal.ownerId && <Avatar name={ownerName(goal.ownerId)} size={16} />}
              {goal.ownerId ? <>Owned by <span className="font-medium text-slate-700 dark:text-slate-200">{ownerName(goal.ownerId)}</span></> : "No owner yet"}
            </p>
          </div>
        </section>

        {goal.description && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{goal.description}</p>}

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Key results</h3>
          {(goal.keyResults || []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-[#2a3044] dark:text-slate-400">No key results yet. Edit the goal to add measurable outcomes.</p>
          ) : (
            <ul className="space-y-2">
              {goal.keyResults.map((kr, index) => (
                <KeyResultRow
                  key={kr.id}
                  kr={kr}
                  progress={goal.krProgress[index]}
                  workIndex={workIndex}
                  epicsById={epicsById}
                  canEdit={canEdit}
                  onUpdate={(patch) => onUpdateKeyResult(goal.id, kr.id, patch)}
                />
              ))}
            </ul>
          )}
        </section>

        {(parent || children.length > 0) && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Alignment</h3>
            <div className="space-y-1.5">
              {parent && (
                <button type="button" onClick={() => onOpenGoal(parent.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-[#1a1f2e]">
                  <span className="text-xs text-slate-400">Supports</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700 dark:text-slate-200">{parent.title}</span>
                  <HealthPill health={parent.healthKey} />
                </button>
              )}
              {children.map((child) => (
                <button key={child.id} type="button" onClick={() => onOpenGoal(child.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-[#1a1f2e]">
                  <span className="text-xs text-slate-400">Contributes</span>
                  <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{child.title}</span>
                  <span className="text-xs tabular-nums text-slate-500">{child.progress}%</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">Check-ins</h3>
          {canEdit && <CheckInForm goal={goal} onSubmit={(data) => onCheckIn(goal.id, data)} />}
          {(goal.checkIns || []).length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No check-ins yet. A weekly note keeps everyone aligned.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-slate-200 pl-4 dark:border-[#2a3044]">
              {goal.checkIns.map((checkIn) => (
                <li key={checkIn.id} className="relative">
                  <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-[#141720] ${(HEALTH_META[checkIn.health] || HEALTH_META["no-data"]).dot}`} aria-hidden="true" />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{ownerName(checkIn.by) || "Someone"}</span>
                    <span>{relativeDays(checkIn.at, now)}</span>
                    {checkIn.health && <HealthPill health={checkIn.health} />}
                    {checkIn.progress !== null && checkIn.progress !== undefined && <span className="tabular-nums">at {checkIn.progress}%</span>}
                  </div>
                  {checkIn.note && <p className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{checkIn.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {!canEdit && (
        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-[#2a3044] dark:text-slate-400">
          You can view this goal. Ask an admin for the “Create and edit goals” permission to update it.
        </div>
      )}
    </Drawer>
  );
}
