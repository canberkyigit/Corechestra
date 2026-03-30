import React, { useState, useMemo, useCallback } from "react";
import {
  FaRocket,
  FaPlus,
  FaArrowRight,
  FaArrowLeft,
  FaUsers,
  FaChartBar,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import { useApp } from "../../context/AppContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_VELOCITY_PER_PERSON = 10;
const MAX_CAPACITY_MEMBERS = 8;

// ─── Color helpers ────────────────────────────────────────────────────────────
const PRIORITY_CLASSES = {
  critical: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40",
  high:     "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/30",
  medium:   "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/30",
  low:      "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/30",
};

const STATUS_CLASSES = {
  todo:       "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300",
  inprogress: "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
  review:     "bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400",
  awaiting:   "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  blocked:    "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  done:       "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400",
};

const STATUS_LABEL = {
  todo:       "To Do",
  inprogress: "In Progress",
  review:     "Review",
  awaiting:   "Awaiting",
  blocked:    "Blocked",
  done:       "Done",
};

const TYPE_DOT = {
  story:   "bg-green-400",
  bug:     "bg-red-400",
  task:    "bg-blue-400",
  epic:    "bg-purple-400",
  subtask: "bg-slate-400",
};

// ─── Small reusable pieces ────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const p = (priority || "medium").toLowerCase();
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${PRIORITY_CLASSES[p] || PRIORITY_CLASSES.medium}`}>
      {p}
    </span>
  );
}

function StatusChip({ status }) {
  const s = (status || "todo").toLowerCase();
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${STATUS_CLASSES[s] || STATUS_CLASSES.todo}`}>
      {STATUS_LABEL[s] || s}
    </span>
  );
}

function SPBadge({ points }) {
  const n = Number(points) || 0;
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-300 min-w-[22px] text-center">
      {n}
    </span>
  );
}

function TypeDot({ type }) {
  const t = (type || "task").toLowerCase();
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${TYPE_DOT[t] || "bg-slate-400"}`}
      title={t}
    />
  );
}

function Avatar({ name, size = "sm" }) {
  const letter = (name || "?")[0].toUpperCase();
  const colors = [
    "bg-blue-600", "bg-purple-600", "bg-green-600",
    "bg-yellow-600", "bg-red-600", "bg-pink-600",
    "bg-indigo-600", "bg-teal-600",
  ];
  const colorIdx = (name || "").charCodeAt(0) % colors.length;
  const sizeClass = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold text-white flex-shrink-0 ${sizeClass} ${colors[colorIdx]}`}
      title={name}
    >
      {letter}
    </span>
  );
}

// ─── Section divider label for backlog grouping ───────────────────────────────
function SectionLabel({ title, count }) {
  return (
    <div className="flex items-center gap-2 mt-3 mb-1 first:mt-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </span>
      <span className="text-[10px] text-slate-400 dark:text-slate-600 font-medium">({count})</span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-[#252b3b]" />
    </div>
  );
}

// ─── Capacity bar ─────────────────────────────────────────────────────────────
function CapacityBar({ totalSP, capacitySP }) {
  const pct = capacitySP > 0 ? Math.min((totalSP / capacitySP) * 100, 100) : 0;
  const overCapacity = capacitySP > 0 && totalSP > capacitySP;
  const nearCapacity = !overCapacity && pct > 80;
  let barColor = "bg-green-500";
  if (overCapacity) barColor = "bg-red-500";
  else if (nearCapacity) barColor = "bg-yellow-400";

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px] text-slate-500">
        <span>{totalSP} SP used</span>
        <span className={overCapacity ? "text-red-500 dark:text-red-400 font-semibold" : nearCapacity ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400"}>
          {capacitySP > 0 ? `${Math.round(pct)}%` : "—"} of {capacitySP} SP capacity
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-[#232838] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {overCapacity && (
        <div className="flex items-center gap-1 text-[10px] text-red-500 dark:text-red-400">
          <FaExclamationCircle className="w-2.5 h-2.5" />
          <span>Over capacity by {totalSP - capacitySP} SP</span>
        </div>
      )}
    </div>
  );
}

// ─── Velocity mini-bar chart ──────────────────────────────────────────────────
function VelocityChart({ snapshots }) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-slate-400 dark:text-slate-500 text-sm text-center">
        No velocity data yet — complete a sprint to start tracking
      </div>
    );
  }

  const last5 = snapshots.slice(-5);
  const velocities = last5.map((s) => (Number(s.total) || 0) - (Number(s.remaining) || 0));
  const maxV = Math.max(...velocities, 1);

  return (
    <div className="flex items-end gap-2 h-16">
      {last5.map((snap, i) => {
        const v = velocities[i];
        const heightPct = maxV > 0 ? (v / maxV) * 100 : 0;
        const dateStr = snap.date
          ? new Date(snap.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })
          : "—";
        return (
          <div key={snap.date || i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className="text-[9px] text-slate-500 font-semibold">{v} SP</span>
            <div className="w-full flex items-end" style={{ height: 32 }}>
              <div
                className="w-full rounded-t bg-blue-500/70 hover:bg-blue-400/90 transition-colors"
                style={{ height: `${Math.max(heightPct, 4)}%` }}
                title={`${v} SP on ${dateStr}`}
              />
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-600 truncate w-full text-center">{dateStr}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PlanningTab() {
  const {
    activeTasks,
    setActiveTasks,
    backlogSections,
    setBacklogSections,
    sprint,
    updateSprint,
    burndownSnapshots,
    users,
    projects,
    currentProjectId,
  } = useApp();

  // ── Local state ──────────────────────────────────────────────────────────────
  const [goalDraft, setGoalDraft] = useState(sprint?.goal || "");
  const [hoveredBacklogId, setHoveredBacklogId] = useState(null);
  const [hoveredSprintId, setHoveredSprintId] = useState(null);
  const [capacities, setCapacities] = useState({});

  // ── Sync goal draft when sprint changes ──────────────────────────────────────
  const handleGoalBlur = useCallback(() => {
    updateSprint({ goal: goalDraft });
  }, [updateSprint, goalDraft]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  // Current project active tasks
  const projectActiveTasks = useMemo(
    () => activeTasks.filter((t) => !currentProjectId || (t.projectId || "proj-1") === currentProjectId),
    [activeTasks, currentProjectId]
  );

  // All backlog tasks NOT already in sprint, grouped by section
  const backlogGroups = useMemo(() => {
    const activeIds = new Set(activeTasks.map((t) => t.id));
    return (backlogSections || []).map((section) => ({
      ...section,
      tasks: (section.tasks || []).filter((t) => !activeIds.has(t.id)),
    }));
  }, [backlogSections, activeTasks]);

  const totalBacklogCount = useMemo(
    () => backlogGroups.reduce((sum, g) => sum + g.tasks.length, 0),
    [backlogGroups]
  );

  // Sprint stats
  const sprintTotalSP = useMemo(
    () => projectActiveTasks.reduce((s, t) => s + (Number(t.storyPoint) || 0), 0),
    [projectActiveTasks]
  );

  // Average velocity from burndown snapshots
  const avgVelocity = useMemo(() => {
    if (!burndownSnapshots || burndownSnapshots.length === 0) return null;
    const velocities = burndownSnapshots.map(
      (s) => (Number(s.total) || 0) - (Number(s.remaining) || 0)
    );
    const sum = velocities.reduce((a, b) => a + b, 0);
    return Math.round(sum / velocities.length);
  }, [burndownSnapshots]);

  // Team capacity — filter to current project members only, then normalize to [{id, name}]
  const memberList = useMemo(() => {
    const currentProject = projects?.find((p) => p.id === currentProjectId);
    const memberNames = new Set(currentProject?.memberUsernames || []);
    const filtered = memberNames.size > 0
      ? (users || []).filter((u) =>
          typeof u === "string"
            ? memberNames.has(u)
            : memberNames.has(u.username) || memberNames.has(u.id)
        )
      : (users || []);
    return filtered
      .slice(0, MAX_CAPACITY_MEMBERS)
      .map((u) => (typeof u === "object" ? u : { id: u, name: u }));
  }, [users, projects, currentProjectId]);

  const totalCapacitySP = useMemo(() => {
    return memberList.reduce((sum, u) => {
      const pct = capacities[u.id] ?? 80;
      return sum + Math.round(DEFAULT_VELOCITY_PER_PERSON * (pct / 100));
    }, 0);
  }, [memberList, capacities]);

  const handleCapacityChange = useCallback((userId, value) => {
    setCapacities((prev) => ({ ...prev, [userId]: Number(value) }));
  }, []);

  const resetCapacities = useCallback(() => {
    const map = {};
    memberList.forEach((u) => { map[u.id] = 100; });
    setCapacities(map);
  }, [memberList]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const addToSprint = useCallback((task, sectionId) => {
    // Remove from backlog section
    setBacklogSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId ? s : { ...s, tasks: s.tasks.filter((t) => t.id !== task.id) }
      )
    );
    // Add to active sprint
    setActiveTasks((prev) => [
      ...prev,
      {
        ...task,
        status: task.status || "todo",
        priority: task.priority || "medium",
        projectId: currentProjectId,
      },
    ]);
  }, [setBacklogSections, setActiveTasks, currentProjectId]);

  const removeFromSprint = useCallback((task) => {
    // Remove from active tasks
    setActiveTasks((prev) => prev.filter((t) => t.id !== task.id));
    // Add back to first backlog section (or create one)
    setBacklogSections((prev) => {
      if (!prev || prev.length === 0) return prev;
      return prev.map((s, i) =>
        i !== 0 ? s : { ...s, tasks: [...s.tasks, task] }
      );
    });
  }, [setActiveTasks, setBacklogSections]);

  // ── Sprint date helpers ──────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 px-4 py-4 pb-12 overflow-y-auto">

      {/* ── 1. Top Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-600/20 border border-blue-500/30">
            <FaRocket className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">Sprint Planning</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {sprint?.name || "No sprint"}&nbsp;
              {sprint?.startDate || sprint?.endDate ? (
                <span>
                  · {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
                </span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {avgVelocity !== null ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] text-sm font-semibold text-slate-700 dark:text-slate-200">
              <FaChartBar className="w-3 h-3 text-blue-400" />
              Avg velocity: <span className="text-blue-500 dark:text-blue-400">{avgVelocity} SP</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] text-xs text-slate-500">
              <FaChartBar className="w-3 h-3" />
              Velocity: —
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] text-xs font-semibold text-slate-600 dark:text-slate-300">
            {projectActiveTasks.length} tasks · {sprintTotalSP} SP
          </span>
        </div>
      </div>

      {/* ── 2. Sprint Goal card ────────────────────────────────────────────── */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 p-4">
        <div className="flex items-center gap-2 mb-2">
          <FaCheckCircle className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Sprint Goal</span>
        </div>
        <textarea
          className="w-full bg-transparent text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 rounded px-1 min-h-[48px]"
          placeholder="Define the sprint goal — what value will be delivered by the end of this sprint?"
          value={goalDraft}
          onChange={(e) => setGoalDraft(e.target.value)}
          onBlur={handleGoalBlur}
          rows={2}
        />
      </div>

      {/* ── 3. Three-column planning layout ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* ── Left: Backlog Pool ─────────────────────────────────────────── */}
        <div className="rounded-xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#252b3b] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#252b3b]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Backlog Pool</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044]">
                {totalBacklogCount}
              </span>
            </div>
            <FaArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-600" />
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto max-h-[420px] px-3 py-2 space-y-0.5">
            {totalBacklogCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-600 text-xs text-center gap-2">
                <FaCheckCircle className="w-5 h-5 text-green-500/60 dark:text-green-700/60" />
                All backlog tasks are in the sprint
              </div>
            ) : (
              backlogGroups.map((section) => {
                if (section.tasks.length === 0) return null;
                return (
                  <div key={section.id}>
                    <SectionLabel title={section.title} count={section.tasks.length} />
                    {section.tasks.map((task) => {
                      const isHovered = hoveredBacklogId === task.id;
                      return (
                        <div
                          key={task.id}
                          className="group relative flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors cursor-default"
                          onMouseEnter={() => setHoveredBacklogId(task.id)}
                          onMouseLeave={() => setHoveredBacklogId(null)}
                        >
                          <TypeDot type={task.type} />
                          <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate" title={task.title}>
                            {task.title}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <SPBadge points={task.storyPoint} />
                            <PriorityBadge priority={task.priority} />
                          </div>
                          {isHovered && (
                            <button
                              onClick={() => addToSprint(task, section.id)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-colors"
                              title="Add to Sprint"
                            >
                              <FaArrowRight className="w-2.5 h-2.5" />
                              Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Center: Sprint Backlog ─────────────────────────────────────── */}
        <div className="rounded-xl bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#252b3b] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#252b3b]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Sprint Backlog</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044]">
                {projectActiveTasks.length} tasks · {sprintTotalSP} SP
              </span>
            </div>
            <FaRocket className="w-3 h-3 text-blue-500" />
          </div>

          {/* Capacity bar */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-[#252b3b]">
            <CapacityBar totalSP={sprintTotalSP} capacitySP={totalCapacitySP} />
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto max-h-[380px] px-3 py-2 space-y-0.5">
            {projectActiveTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-600 text-xs text-center gap-2">
                <FaPlus className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                No tasks in sprint yet
                <span className="text-slate-400 dark:text-slate-700 text-[10px]">Add tasks from the Backlog Pool →</span>
              </div>
            ) : (
              projectActiveTasks.map((task) => {
                const isHovered = hoveredSprintId === task.id;
                return (
                  <div
                    key={task.id}
                    className="group relative flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors cursor-default"
                    onMouseEnter={() => setHoveredSprintId(task.id)}
                    onMouseLeave={() => setHoveredSprintId(null)}
                  >
                    <StatusChip status={task.status} />
                    <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 truncate" title={task.title}>
                      {task.title}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <SPBadge points={task.storyPoint} />
                      {task.assignedTo && <Avatar name={typeof task.assignedTo === "object" ? task.assignedTo.name : task.assignedTo} />}
                    </div>
                    {isHovered && (
                      <button
                        onClick={() => removeFromSprint(task)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 shadow-lg transition-colors"
                        title="Remove from Sprint"
                      >
                        <FaArrowLeft className="w-2.5 h-2.5" />
                        Remove
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: Team Capacity ───────────────────────────────────────── */}
        <div className="rounded-xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#252b3b] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#252b3b]">
            <div className="flex items-center gap-2">
              <FaUsers className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Team Capacity</span>
            </div>
            <button
              onClick={resetCapacities}
              className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-[#232838]"
            >
              Reset to 100%
            </button>
          </div>

          {/* Member list */}
          <div className="flex-1 overflow-y-auto max-h-[380px] px-3 py-2 space-y-3">
            {memberList.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-400 dark:text-slate-600 text-xs">
                No team members found
              </div>
            ) : (
              memberList.map((member) => {
                const pct = capacities[member.id] ?? 80;
                const spContrib = Math.round(DEFAULT_VELOCITY_PER_PERSON * (pct / 100));
                return (
                  <div key={member.id} className="space-y-1.5 py-1">
                    <div className="flex items-center gap-2">
                      <Avatar name={member.name || member.id} size="sm" />
                      <span className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-300 truncate capitalize">
                        {member.name || member.id}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold min-w-[36px] text-right">
                        {spContrib} SP
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={10}
                        value={pct}
                        onChange={(e) => handleCapacityChange(member.id, e.target.value)}
                        className="flex-1 h-1.5 accent-blue-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-slate-400 w-7 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Total capacity footer */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-[#252b3b] flex items-center justify-between">
            <span className="text-xs text-slate-500">Total capacity</span>
            <span className="text-sm font-bold text-blue-500 dark:text-blue-400">{totalCapacitySP} SP</span>
          </div>
        </div>
      </div>

      {/* ── 4. Velocity Reference row ──────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#252b3b] p-4">
        <div className="flex items-center gap-2 mb-3">
          <FaChartBar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Velocity Reference
          </span>
          {burndownSnapshots && burndownSnapshots.length > 0 && (
            <span className="text-[10px] text-slate-400 dark:text-slate-600 ml-auto">
              Last {Math.min(burndownSnapshots.length, 5)} data points
            </span>
          )}
        </div>
        <VelocityChart snapshots={burndownSnapshots} />
      </div>

    </div>
  );
}
