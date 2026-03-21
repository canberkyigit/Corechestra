import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { FaChartBar, FaBolt, FaCheckCircle, FaExclamationTriangle, FaFire, FaTrophy } from "react-icons/fa";
import { parseISO, format } from "date-fns";

const STATUS_CONFIG = {
  todo: { label: "To Do", color: "#94a3b8" },
  inprogress: { label: "In Progress", color: "#3b82f6" },
  review: { label: "Review", color: "#a855f7" },
  awaiting: { label: "Awaiting", color: "#f97316" },
  blocked: { label: "Blocked", color: "#ef4444" },
  done: { label: "Done", color: "#22c55e" },
};

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#ef4444" },
  high: { label: "High", color: "#f97316" },
  medium: { label: "Medium", color: "#eab308" },
  low: { label: "Low", color: "#22c55e" },
};

const TEAM_COLORS = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "22" }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        )}
      </div>
    </div>
  );
}

function HorizontalBar({ label, value, max, color, count }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-xs text-slate-600 dark:text-slate-400 text-right truncate">{label}</div>
      <div className="flex-1 bg-slate-100 dark:bg-[#232838] rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="w-8 text-xs font-semibold text-slate-700 dark:text-slate-300 text-right">{count}</div>
    </div>
  );
}

// Simulated burndown: starts at total story points, burns down daily over sprint length
function BurndownChart({ tasks, sprint }) {
  const totalPoints = tasks.reduce((s, t) => s + (t.storyPoint || 0), 0);
  const donePoints = tasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.storyPoint || 0), 0);
  const sprintDays = 14;

  // Generate ideal line + simulated actual
  const days = Array.from({ length: sprintDays + 1 }, (_, i) => i);
  const idealLine = days.map((d) => totalPoints - (totalPoints / sprintDays) * d);

  // Simulated actual: follows ideal with some noise, ends at remaining
  const remaining = totalPoints - donePoints;
  const actualLine = days.map((d) => {
    if (d === 0) return totalPoints;
    if (d >= sprintDays) return remaining;
    const ideal = totalPoints - (totalPoints / sprintDays) * d;
    const noise = (Math.sin(d * 1.7) * totalPoints * 0.06);
    const val = ideal + noise + (remaining - 0) * (d / sprintDays) * 0.3;
    return Math.max(0, Math.round(val));
  });

  const chartH = 120;
  const chartW = 320;
  const maxVal = totalPoints || 1;

  const toX = (d) => (d / sprintDays) * chartW;
  const toY = (v) => chartH - (v / maxVal) * chartH;

  const idealPath = days.map((d, i) => `${i === 0 ? "M" : "L"}${toX(d)},${toY(idealLine[d])}`).join(" ");
  const actualPath = days.map((d, i) => `${i === 0 ? "M" : "L"}${toX(d)},${toY(actualLine[d])}`).join(" ");

  return (
    <div>
      <svg width={chartW} height={chartH} className="w-full" viewBox={`0 0 ${chartW} ${chartH}`}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line key={p} x1={0} y1={toY(maxVal * p)} x2={chartW} y2={toY(maxVal * p)}
            stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
        ))}
        {/* Ideal */}
        <path d={idealPath} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4,3" />
        {/* Actual */}
        <path d={actualPath} fill="none" stroke="#3b82f6" strokeWidth={2} />
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-6 border-t-2 border-dashed border-slate-400" />
          Ideal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 border-t-2 border-blue-500" />
          Actual
        </span>
        <span className="ml-auto">{remaining} pts remaining</span>
      </div>
    </div>
  );
}

// Simple bar chart for velocity (last 6 sprints — simulated)
function VelocityChart({ completedPoints }) {
  const sprints = [
    { name: "S81", pts: 28 },
    { name: "S82", pts: 34 },
    { name: "S83", pts: 22 },
    { name: "S84", pts: 40 },
    { name: "S85", pts: 31 },
    { name: "Current", pts: completedPoints },
  ];
  const maxPts = Math.max(...sprints.map((s) => s.pts), 1);
  const avg = Math.round(sprints.slice(0, 5).reduce((s, x) => s + x.pts, 0) / 5);

  return (
    <div>
      <div className="flex items-end gap-2 h-24">
        {sprints.map((s, i) => {
          const h = Math.round((s.pts / maxPts) * 96);
          const isCurrent = i === sprints.length - 1;
          return (
            <div key={s.name} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{s.pts}</span>
              <div
                className="w-full rounded-t-md transition-all"
                style={{ height: h, backgroundColor: isCurrent ? "#3b82f6" : "#94a3b844" }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-end gap-2 mt-1">
        {sprints.map((s) => (
          <div key={s.name} className="flex-1 text-center text-xs text-slate-400 dark:text-slate-500">{s.name}</div>
        ))}
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">5-sprint avg: <span className="font-semibold text-slate-600 dark:text-slate-300">{avg} pts</span></p>
    </div>
  );
}

export default function ReportsPage() {
  const { activeTasks, backlogSections, epics, sprint } = useApp();
  const [activeTab, setActiveTab] = useState("overview");

  const backlogTasks = useMemo(() => backlogSections.flatMap((s) => s.tasks), [backlogSections]);

  const doneTasks = useMemo(() => activeTasks.filter((t) => t.status === "done"), [activeTasks]);
  const completedPoints = useMemo(() => doneTasks.reduce((s, t) => s + (t.storyPoint || 0), 0), [doneTasks]);
  const totalPoints = useMemo(() => activeTasks.reduce((s, t) => s + (t.storyPoint || 0), 0), [activeTasks]);
  const blockedCount = useMemo(() => activeTasks.filter((t) => t.status === "blocked").length, [activeTasks]);

  // Status breakdown
  const statusBreakdown = useMemo(() =>
    Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
      key,
      ...cfg,
      count: activeTasks.filter((t) => t.status === key).length,
    })).filter((s) => s.count > 0),
    [activeTasks]
  );

  // Priority breakdown
  const priorityBreakdown = useMemo(() =>
    Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => ({
      key,
      ...cfg,
      count: activeTasks.filter((t) => t.priority === key).length,
    })).filter((p) => p.count > 0),
    [activeTasks]
  );

  // Per-assignee stats
  const assigneeStats = useMemo(() => {
    const map = {};
    activeTasks.forEach((t) => {
      const a = t.assignedTo || "unassigned";
      if (!map[a]) map[a] = { total: 0, done: 0, points: 0, blocked: 0 };
      map[a].total++;
      map[a].points += t.storyPoint || 0;
      if (t.status === "done") map[a].done++;
      if (t.status === "blocked") map[a].blocked++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, pct: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [activeTasks]);

  // Epic progress
  const epicProgress = useMemo(() =>
    epics.map((epic) => {
      const epicTasks = activeTasks.filter((t) => t.epicId === epic.id);
      const done = epicTasks.filter((t) => t.status === "done").length;
      return { ...epic, total: epicTasks.length, done, pct: epicTasks.length > 0 ? Math.round((done / epicTasks.length) * 100) : 0 };
    }).filter((e) => e.total > 0),
    [activeTasks, epics]
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "burndown", label: "Burndown" },
    { id: "team", label: "Team" },
    { id: "epics", label: "Epics" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FaChartBar className="w-5 h-5 text-blue-500" />
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Reports</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">Sprint analytics and team performance</p>
        </div>
        {sprint && (
          <div className="ml-auto px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold border border-green-200 dark:border-green-800">
            {sprint.name} · Active
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-slate-200 dark:border-[#2a3044] mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === t.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Sprint Tasks" value={activeTasks.length} sub={`${doneTasks.length} done`} color="#3b82f6" icon={FaBolt} />
            <StatCard label="Completion" value={`${totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0}%`} sub={`${completedPoints}/${totalPoints} pts`} color="#22c55e" icon={FaCheckCircle} />
            <StatCard label="Blocked" value={blockedCount} sub="tasks blocked" color="#ef4444" icon={FaExclamationTriangle} />
            <StatCard label="Backlog" value={backlogTasks.length} sub="tasks queued" color="#a855f7" icon={FaFire} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Status breakdown */}
            <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Status Breakdown</h3>
              <div className="space-y-2.5">
                {statusBreakdown.map((s) => (
                  <HorizontalBar key={s.key} label={s.label} value={s.count} max={activeTasks.length} color={s.color} count={s.count} />
                ))}
                {statusBreakdown.length === 0 && <p className="text-sm text-slate-400">No tasks in sprint</p>}
              </div>
            </div>

            {/* Priority breakdown */}
            <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Priority Breakdown</h3>
              <div className="space-y-2.5">
                {priorityBreakdown.map((p) => (
                  <HorizontalBar key={p.key} label={p.label} value={p.count} max={activeTasks.length} color={p.color} count={p.count} />
                ))}
                {priorityBreakdown.length === 0 && <p className="text-sm text-slate-400">No tasks in sprint</p>}
              </div>
            </div>
          </div>

          {/* Sprint progress bar */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sprint Progress</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">{completedPoints} / {totalPoints} story points</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-[#232838] rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              <span>Start</span>
              {sprint?.endDate && <span>Ends {format(parseISO(sprint.endDate), "MMM d")}</span>}
              <span>End</span>
            </div>
          </div>

          {/* Velocity */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FaTrophy className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sprint Velocity</h3>
            </div>
            <VelocityChart completedPoints={completedPoints} />
          </div>
        </div>
      )}

      {/* Burndown Tab */}
      {activeTab === "burndown" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Burndown Chart</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">{sprint?.name || "Current Sprint"}</span>
            </div>
            <BurndownChart tasks={activeTasks} sprint={sprint} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Total Points</p>
              <p className="text-3xl font-bold text-slate-700 dark:text-slate-200">{totalPoints}</p>
            </div>
            <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Completed</p>
              <p className="text-3xl font-bold text-green-500">{completedPoints}</p>
            </div>
            <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Remaining</p>
              <p className="text-3xl font-bold text-blue-500">{totalPoints - completedPoints}</p>
            </div>
          </div>

          {/* Task list by status */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Tasks by Status</h3>
            <div className="space-y-1.5">
              {activeTasks.map((t) => {
                const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.todo;
                return (
                  <div key={t.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{t.storyPoint || 0} pts</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cfg.color + "22", color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {assigneeStats.map(({ name, total, done, points, blocked, pct }, i) => (
              <div key={name} className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: TEAM_COLORS[i % TEAM_COLORS.length] }}>
                    {name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">{name}</span>
                      {blocked > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium">
                          {blocked} blocked
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-[#232838] rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: TEAM_COLORS[i % TEAM_COLORS.length] }} />
                    </div>
                  </div>
                  <div className="flex gap-6 text-center flex-shrink-0">
                    <div>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{total}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Tasks</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-500">{done}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Done</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-500">{points}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Points</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{pct}%</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Done%</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {assigneeStats.length === 0 && (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">No task assignments yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Epics Tab */}
      {activeTab === "epics" && (
        <div className="space-y-4">
          {epicProgress.map((epic) => (
            <div key={epic.id} className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: epic.color }} />
                <span className="font-semibold text-slate-700 dark:text-slate-200">{epic.title}</span>
                <span className="ml-auto text-sm font-semibold" style={{ color: epic.color }}>{epic.pct}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-[#232838] rounded-full h-2 overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all" style={{ width: `${epic.pct}%`, backgroundColor: epic.color }} />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">{epic.done} of {epic.total} tasks completed</p>
            </div>
          ))}
          {epicProgress.length === 0 && (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">No epics with tasks assigned yet.</div>
          )}

          {/* All epics with no tasks */}
          {epics.filter((e) => !epicProgress.find((ep) => ep.id === e.id)).length > 0 && (
            <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">Epics without sprint tasks</h3>
              <div className="space-y-2">
                {epics.filter((e) => !epicProgress.find((ep) => ep.id === e.id)).map((epic) => (
                  <div key={epic.id} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: epic.color }} />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{epic.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
