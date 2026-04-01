import React, { useState } from "react";
import {
  FaRocket, FaCalendarAlt, FaCheckCircle, FaChevronDown, FaChevronRight,
  FaClock, FaArrowRight, FaTasks, FaFlag, FaTrash,
} from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { format, parseISO, differenceInDays } from "date-fns";

const fmt = (d) => {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
};

const daysDiff = (start, end) => {
  try { return differenceInDays(parseISO(end), parseISO(start)); } catch { return null; }
};

function StatusBadge({ status }) {
  if (status === "active")
    return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-500/15 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30 uppercase tracking-wide">Active</span>;
  if (status === "planned")
    return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 uppercase tracking-wide">Planned</span>;
  if (status === "completed")
    return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/30 uppercase tracking-wide">Completed</span>;
  return null;
}

function SprintCard({ sprint, taskCount, doneCount, onGoTo, goToLabel, large, onDelete }) {
  const duration = sprint.startDate && sprint.endDate ? daysDiff(sprint.startDate, sprint.endDate) : null;
  const totalPoints = sprint.totalPoints ?? null;
  const completedPoints = sprint.completedPoints ?? null;
  const pct = sprint.completionRate ?? (taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : null);

  const accentColor =
    sprint.status === "active"  ? "bg-green-500" :
    sprint.status === "planned" ? "bg-indigo-500" :
    "bg-slate-300 dark:bg-slate-600";

  const btnClass =
    sprint.status === "active"  ? "bg-green-600 hover:bg-green-700 text-white" :
    sprint.status === "planned" ? "bg-indigo-600 hover:bg-indigo-700 text-white" :
    "bg-slate-100 dark:bg-[#232838] hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-700 dark:text-slate-300";

  return (
    <div className="border border-slate-200 dark:border-[#2a3044] rounded-2xl bg-white dark:bg-[#1a1f2e] hover:border-slate-300 dark:hover:border-[#3a4460] transition-all duration-200 overflow-hidden flex flex-col h-full shadow-sm dark:shadow-none">
      {/* Accent bar */}
      <div className={`h-1 w-full ${accentColor}`} />

      <div className={`flex flex-col flex-1 ${large ? "p-6" : "p-5"}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <StatusBadge status={sprint.status} />
            </div>
            <h3 className={`font-bold text-slate-800 dark:text-slate-100 leading-tight ${large ? "text-xl" : "text-base"}`}>
              {sprint.name}
            </h3>
            {sprint.goal && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 italic line-clamp-2">"{sprint.goal}"</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onDelete && (
              <button
                className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                onClick={onDelete}
                title="Delete sprint"
              >
                <FaTrash className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${btnClass}`}
              onClick={onGoTo}
            >
              {goToLabel} <FaArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-[#252b3b] mb-4" />

        {/* Dates + duration */}
        <div className="flex items-center gap-5 text-sm text-slate-500 dark:text-slate-400 mb-4">
          <span className="flex items-center gap-2">
            <FaCalendarAlt className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            {fmt(sprint.startDate)} → {fmt(sprint.endDate)}
          </span>
          {duration !== null && (
            <span className="flex items-center gap-1.5">
              <FaClock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              {duration} days
            </span>
          )}
        </div>

        {/* Stats */}
        {(taskCount !== null || totalPoints !== null) && (
          <div className="flex items-center gap-5 mb-4">
            {taskCount !== null && (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <FaTasks className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>
                  {sprint.status === "completed"
                    ? `${sprint.doneTasks ?? doneCount} / ${sprint.totalTasks ?? taskCount} tasks`
                    : `${taskCount} task${taskCount !== 1 ? "s" : ""}`}
                </span>
              </div>
            )}
            {totalPoints !== null && (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <FaFlag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>
                  {sprint.status === "completed"
                    ? `${completedPoints} / ${totalPoints} pts`
                    : `${totalPoints} pts`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        {pct !== null && sprint.status !== "planned" && (
          <div className="mt-auto">
            <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-1.5">
              <span>{doneCount ?? sprint.doneTasks ?? 0} done</span>
              <span className="font-semibold text-slate-500 dark:text-slate-400">{pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-[#232838] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-400"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AllSprintsTab({ onNavigate }) {
  const { sprint, plannedSprints, completedSprints, activeTasks, deletePlannedSprint } = useApp();
  const [completedOpen, setCompletedOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const activeTaskCount = activeTasks.length;
  const activeDone = activeTasks.filter((t) => t.status === "done").length;

  const sortedPlanned = [...plannedSprints].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate)
  );

  const hasActive    = sprint && sprint.status === "active";
  const hasPlanned   = sortedPlanned.length > 0;
  const hasCompleted = completedSprints.length > 0;

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 w-full">

      {/* Active Sprint */}
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <FaRocket className="w-4 h-4 text-green-500" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Active Sprint</h2>
        </div>
        {hasActive ? (
          <SprintCard
            sprint={{ ...sprint, status: "active" }}
            taskCount={activeTaskCount}
            doneCount={activeDone}
            goToLabel="Go to Board"
            onGoTo={() => onNavigate("active")}
            large
          />
        ) : (
          <div className="border border-dashed border-slate-200 dark:border-[#2a3044] rounded-2xl p-8 text-center text-sm text-slate-400 dark:text-slate-500">
            No active sprint. Start one from the Active Sprint tab.
          </div>
        )}
      </section>

      {/* Planned Future Sprints */}
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <FaCalendarAlt className="w-4 h-4 text-indigo-500" />
          <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Planned Future Sprints</h2>
          {hasPlanned && (
            <span className="text-[11px] bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/30">
              {sortedPlanned.length}
            </span>
          )}
        </div>
        {hasPlanned ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedPlanned.map((s) => (
              <div key={s.id} className="relative">
                {confirmDeleteId === s.id && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-[#1a1f2e]/90 backdrop-blur-sm rounded-2xl border border-red-200 dark:border-red-700/40">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center px-4">
                      Delete <span className="text-red-500">"{s.name}"</span>?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        onClick={() => { deletePlannedSprint(s.id); setConfirmDeleteId(null); }}
                      >
                        Delete
                      </button>
                      <button
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-[#252b3b] hover:bg-slate-200 dark:hover:bg-[#2a3044] text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <SprintCard
                  sprint={{ ...s, status: "planned" }}
                  taskCount={null}
                  doneCount={null}
                  goToLabel="Go to Backlog"
                  onGoTo={() => onNavigate("backlog", s.backlogSectionId)}
                  onDelete={() => setConfirmDeleteId(s.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 dark:border-[#2a3044] rounded-2xl p-8 text-center text-sm text-slate-400 dark:text-slate-500">
            No future sprints planned yet. Use the{" "}
            <span className="text-indigo-500 dark:text-indigo-400 font-medium">Plan a future sprint</span>{" "}
            button to add one.
          </div>
        )}
      </section>

      {/* Completed Sprints */}
      {hasCompleted && (
        <section>
          <button
            className="flex items-center gap-2.5 mb-4 w-full text-left group"
            onClick={() => setCompletedOpen((v) => !v)}
          >
            {completedOpen
              ? <FaChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              : <FaChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />}
            <FaCheckCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
              Completed Sprints
            </h2>
            <span className="text-[11px] bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600/30">
              {completedSprints.length}
            </span>
          </button>
          {completedOpen && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {completedSprints.map((s) => (
                <SprintCard
                  key={s.id}
                  sprint={{ ...s, status: "completed" }}
                  taskCount={s.totalTasks}
                  doneCount={s.doneTasks}
                  goToLabel="Sprint Review"
                  onGoTo={() => onNavigate("review")}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!hasActive && !hasPlanned && !hasCompleted && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <FaRocket className="w-14 h-14 text-slate-300 dark:text-slate-700 mb-5" />
          <p className="text-slate-500 dark:text-slate-400 text-base font-medium">No sprints yet.</p>
          <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">Start your first sprint from the Active Sprint tab.</p>
        </div>
      )}
    </div>
  );
}
