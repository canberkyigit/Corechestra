import React, { useState, useMemo } from "react";
import { taskKey } from "../../utils/helpers";
import { FaPlay, FaSearch } from "react-icons/fa";
import { useApp } from "../../context/AppContext";
import { TYPE_OPTIONS } from "../../constants";

const TYPE_COLORS = {
  feature: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  task: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  defect: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  test: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  testset: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  testexecution: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
  precondition: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

const PRI_DOT = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-blue-400",
  low: "bg-slate-300 dark:bg-slate-500",
};

// ── Inline SP editor ─────────────────────────────────────────────────────────
function InlineSP({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value ?? ""));

  // Sync displayed value when parent updates storyPoint externally
  React.useEffect(() => {
    if (!editing) setVal(String(value ?? ""));
  }, [value, editing]);

  const commit = (v) => {
    const num = v === "" ? "" : Number(v) || v;
    onSave(num);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        className="w-12 text-center text-sm font-bold rounded-lg border border-blue-400 bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 px-1 py-1"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => commit(val)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(val);
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      onClick={() => { setVal(String(value ?? "")); setEditing(true); }}
      title="Click to edit story points"
      className={`w-10 h-8 flex items-center justify-center rounded-lg font-bold text-sm transition-all border ${
        value
          ? "border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1c2030] hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400"
          : "border-dashed border-slate-300 dark:border-[#2a3044] text-slate-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-500"
      }`}
    >
      {value || "?"}
    </button>
  );
}

// ── Task row ─────────────────────────────────────────────────────────────────
function TaskEstimationRow({ task, onTaskClick, onPokerClick, onSpUpdate }) {
  const isActive = task._source === "active";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors group ${
        isActive
          ? "bg-blue-50/40 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          : "bg-white dark:bg-[#1c2030] border-slate-100 dark:border-[#2a3044] hover:bg-slate-50 dark:hover:bg-[#232838]"
      }`}
    >
      {/* Priority dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRI_DOT[task.priority] || "bg-slate-300"}`} />

      {/* Source badge */}
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
        isActive
          ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          : "bg-slate-100 text-slate-500 dark:bg-[#2a3044] dark:text-slate-400"
      }`}>
        {isActive ? "Sprint" : "Backlog"}
      </span>

      {/* Type badge */}
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
        TYPE_COLORS[task.type] || "bg-slate-100 text-slate-500 dark:bg-[#2a3044] dark:text-slate-400"
      }`}>
        {task.type || "task"}
      </span>

      {/* CY id */}
      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex-shrink-0 w-10">
        {taskKey(task.id)}
      </span>

      {/* Title + desc */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTaskClick?.(task)}>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate block">
          {task.title}
        </span>
        {task.description && (
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate block mt-0.5">
            {task.description}
          </span>
        )}
      </div>

      {/* SP inline edit */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <InlineSP value={task.storyPoint} onSave={(v) => onSpUpdate?.(task.id, task._source, v)} />
      </div>

      {/* Poker button — visible on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onPokerClick?.(task); }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-xs font-medium flex-shrink-0 opacity-0 group-hover:opacity-100"
      >
        <FaPlay className="w-2.5 h-2.5" />
        Poker
      </button>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function RefinementTab({ onTaskClick, onPokerClick }) {
  const { activeTasks, setActiveTasks, backlogSections, setBacklogSections, pokerHistory, currentProjectId } = useApp();

  const [typeFilter,    setTypeFilter]    = useState("");
  const [search,        setSearch]        = useState("");
  const [sortBy,        setSortBy]        = useState("default");
  const [hideEstimated, setHideEstimated] = useState(false);

  const allTasksForEstimation = useMemo(() => [
    ...activeTasks.filter((t) => (t.projectId || "proj-1") === currentProjectId).map((t) => ({ ...t, _source: "active" })),
    ...backlogSections.flatMap((s) => s.tasks).map((t) => ({ ...t, _source: "backlog" })),
  ], [activeTasks, backlogSections, currentProjectId]);

  const { estimatedCount, pendingCount, completionRate } = useMemo(() => {
    let estimated = 0;
    for (const t of allTasksForEstimation) {
      if (t.storyPoint && t.storyPoint > 0) estimated++;
    }
    const total = allTasksForEstimation.length;
    return {
      estimatedCount: estimated,
      pendingCount: total - estimated,
      completionRate: total > 0 ? Math.round((estimated / total) * 100) : 0,
    };
  }, [allTasksForEstimation]);

  const filtered = useMemo(() => {
    let list = allTasksForEstimation.filter((t) => {
      if (hideEstimated && t.storyPoint && t.storyPoint > 0) return false;
      if (typeFilter && t.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.title?.toLowerCase().includes(q) && !(t.description || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });

    if (sortBy === "unestimated") {
      list = [...list].sort((a, b) => (a.storyPoint ? 1 : 0) - (b.storyPoint ? 1 : 0));
    } else if (sortBy === "priority") {
      const ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
      list = [...list].sort((a, b) => (ORDER[a.priority] ?? 4) - (ORDER[b.priority] ?? 4));
    }
    return list;
  }, [allTasksForEstimation, typeFilter, search, sortBy, hideEstimated]);

  const handleSpUpdate = (taskId, source, newSp) => {
    const upd = (tasks) => tasks.map((t) => t.id === taskId ? { ...t, storyPoint: newSp } : t);
    if (source === "active") {
      setActiveTasks((prev) => upd(prev));
    } else {
      setBacklogSections((prev) => prev.map((s) => ({ ...s, tasks: upd(s.tasks) })));
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 px-4 py-4 overflow-y-auto pb-12">

      {/* ── Header card ── */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Story Refinement</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
              Estimate tasks inline or run Planning Poker sessions
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{allTasksForEstimation.length}</span> total tasks
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {pokerHistory.length} poker session{pokerHistory.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Estimation progress</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {estimatedCount} / {allTasksForEstimation.length} ({completionRate}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-[#2a3044] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Stat pills */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Pending",
              value: pendingCount,
              color: "text-orange-500 dark:text-orange-400",
              bg: "bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30",
            },
            {
              label: "Estimated",
              value: estimatedCount,
              color: "text-green-600 dark:text-green-400",
              bg: "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30",
            },
            {
              label: "Poker Sessions",
              value: pokerHistory.length,
              color: "text-violet-600 dark:text-violet-400",
              bg: "bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/30",
            },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border p-3 ${bg}`}>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Task list card ── */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5">
        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <div className="relative flex-1 min-w-44">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            <input
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="default">Default order</option>
            <option value="unestimated">Unestimated first</option>
            <option value="priority">By priority</option>
          </select>

          <button
            onClick={() => setHideEstimated((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              hideEstimated
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-slate-300"
            }`}
          >
            {hideEstimated ? "Show all" : "Unestimated only"}
          </button>

          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
            {filtered.length} tasks
          </span>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold border-b border-slate-100 dark:border-[#232838] mb-2">
          <span className="w-2" />
          <span className="w-14">Source</span>
          <span className="w-16">Type</span>
          <span className="w-10">ID</span>
          <span className="flex-1">Title</span>
          <span className="w-10 text-center">SP</span>
          <span className="w-16" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <p className="text-sm font-medium">No tasks match your filters</p>
            <p className="text-xs mt-1 opacity-70">Try adjusting the type or search</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((task) => (
              <TaskEstimationRow
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onPokerClick={onPokerClick}
                onSpUpdate={handleSpUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Poker history ── */}
      {pokerHistory.length > 0 && (
        <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
            Poker History
          </h3>

          {/* Summary stats */}
          {(() => {
            const numericEstimations = pokerHistory.map((h) => Number(h.estimation)).filter((n) => !isNaN(n));
            const avg = numericEstimations.length > 0 ? (numericEstimations.reduce((a, b) => a + b, 0) / numericEstimations.length).toFixed(1) : "–";
            const countMap = {};
            numericEstimations.forEach((n) => { countMap[n] = (countMap[n] || 0) + 1; });
            const withConsensus = pokerHistory.filter((h) => {
              const vals = Object.values(h.votes || {});
              return vals.length > 0 && new Set(vals).size === 1;
            }).length;
            return (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Sessions", value: pokerHistory.length, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/10" },
                  { label: "Avg. Estimate", value: avg, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/10" },
                  { label: "Consensus", value: `${withConsensus}/${pokerHistory.length}`, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/10" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-lg p-3 text-center border border-slate-100 dark:border-[#2a3044]`}>
                    <div className={`text-xl font-bold ${color}`}>{value}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Estimation distribution bar chart */}
          {(() => {
            const numericVals = pokerHistory.map((h) => Number(h.estimation)).filter((n) => !isNaN(n));
            if (numericVals.length === 0) return null;
            const countMap = {};
            numericVals.forEach((n) => { countMap[n] = (countMap[n] || 0) + 1; });
            const sorted = Object.entries(countMap).sort((a, b) => Number(a[0]) - Number(b[0]));
            const maxCount = Math.max(...sorted.map(([, c]) => c));
            return (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-[#232838] rounded-lg border border-slate-100 dark:border-[#2a3044]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Estimation Distribution</p>
                <div className="flex items-end gap-2 h-16">
                  {sorted.map(([val, count]) => (
                    <div key={val} className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-full rounded-t-sm bg-violet-400 dark:bg-violet-500 transition-all" style={{ height: `${(count / maxCount) * 48}px` }} />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="space-y-1.5">
            {pokerHistory.slice(0, 10).map((h) => {
              const voteValues = Object.values(h.votes || {});
              const unique = [...new Set(voteValues)];
              const hasConsensus = unique.length === 1 && voteValues.length > 0;
              const countMap = {};
              voteValues.forEach((v) => { countMap[v] = (countMap[v] || 0) + 1; });
              return (
                <div
                  key={h.id}
                  className="px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-[#232838] border border-slate-100 dark:border-[#2a3044]"
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {new Date(h.date).toLocaleDateString("tr-TR")}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 text-xs flex-1 truncate">
                      {h.taskTitle}
                    </span>
                    {hasConsensus && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex-shrink-0">consensus</span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold text-sm flex-shrink-0">
                      {h.estimation}
                    </span>
                  </div>
                  {voteValues.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Object.entries(h.votes || {}).map(([voter, vote]) => (
                        <span key={voter} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-300">
                          <span className="capitalize">{voter}</span>
                          <span className="font-bold text-violet-500">{vote}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
