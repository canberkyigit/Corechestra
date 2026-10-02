import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { FaChartLine, FaChartPie, FaFlag, FaListUl } from "react-icons/fa";
import BurndownChart from "../components/BurndownChart";
import Distribution from "../components/Distribution";
import SprintHealthCard from "../components/SprintHealthCard";
import { KpiTile } from "../components/KpiStrip";
import { Avatar, EmptyHint, Panel, PriorityMark, StatusPill } from "../components/DashboardPrimitives";
import { parseValidDate, PRIORITY_KEYS, PRIORITY_META, STATUS_KEYS, toPoints } from "../utils/dashboardMetrics";
import { taskKey } from "../../../shared/utils/helpers";

const STATUS_RANK = Object.fromEntries(STATUS_KEYS.map((key, i) => [key, i]));
const PRIORITY_RANK = Object.fromEntries(PRIORITY_KEYS.map((key, i) => [key, i]));

const COLUMNS = [
  { id: "key", label: "Key", className: "w-28" },
  { id: "title", label: "Title", className: "" },
  { id: "status", label: "Status", className: "w-32" },
  { id: "priority", label: "Priority", className: "w-24" },
  { id: "assignee", label: "Assignee", className: "w-36" },
  { id: "points", label: "Points", className: "w-16 text-right" },
  { id: "due", label: "Due", className: "w-24 text-right" },
];

const SORTERS = {
  key: (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }),
  title: (a, b) => String(a.title || "").localeCompare(String(b.title || "")),
  status: (a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9),
  priority: (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9),
  assignee: (a, b) => String(a.assignedTo || "~").localeCompare(String(b.assignedTo || "~")),
  points: (a, b) => toPoints(a) - toPoints(b),
  due: (a, b) => String(a.dueDate || "9999").localeCompare(String(b.dueDate || "9999")),
};

function WorkItemTable({ tasks, onOpenTask }) {
  const [sort, setSort] = useState({ by: "status", dir: "asc" });
  const sorted = useMemo(() => {
    const list = [...tasks].sort(SORTERS[sort.by]);
    return sort.dir === "desc" ? list.reverse() : list;
  }, [tasks, sort]);
  const toggle = (by) => setSort((prev) => ({ by, dir: prev.by === by && prev.dir === "asc" ? "desc" : "asc" }));

  if (tasks.length === 0) {
    return <EmptyHint icon={FaListUl} title="No work items in this sprint">Move tasks from the backlog into the sprint to report on them.</EmptyHint>;
  }

  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-[0.06em] text-slate-500 dark:border-[#252b3b] dark:bg-[#161a26] dark:text-slate-400">
            {COLUMNS.map((col) => (
              <th key={col.id} scope="col" className={`px-4 py-2 font-medium ${col.className}`} aria-sort={sort.by === col.id ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" onClick={() => toggle(col.id)} className="inline-flex items-center gap-1 uppercase hover:text-slate-800 dark:hover:text-slate-200">
                  {col.label}
                  {sort.by === col.id && <span aria-hidden="true">{sort.dir === "asc" ? "↑" : "↓"}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-[#252b3b]">
          {sorted.map((task) => {
            const due = parseValidDate(task.dueDate);
            return (
              <tr
                key={task.id}
                onClick={() => onOpenTask(task)}
                className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-[#232838]"
              >
                <td className="px-4 py-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">{taskKey(task.id)}</td>
                <td className="max-w-0 px-4 py-2">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onOpenTask(task); }} className="block w-full truncate text-left text-slate-800 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400">
                    {task.title || "Untitled"}
                  </button>
                </td>
                <td className="px-4 py-2"><StatusPill status={task.status} /></td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <PriorityMark priority={task.priority} />
                    {PRIORITY_META[task.priority]?.label || "—"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {task.assignedTo
                    ? <span className="inline-flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300"><Avatar name={task.assignedTo} size={18} /><span className="truncate">{task.assignedTo}</span></span>
                    : <span className="italic text-slate-400 dark:text-slate-500">Unassigned</span>}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{toPoints(task) || "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{due ? format(due, "MMM d") : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SprintTab({ data, actions }) {
  const { stats, health, sprint, burndownSnapshots, statusItems, priorityItems } = data;
  const remaining = stats.totalPoints - stats.donePoints;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel title="Burndown" icon={FaChartLine} subtitle={sprint?.name || "Current sprint"} className="h-full" testId="burndown-panel">
            <BurndownChart tasks={stats.projectTasks} sprint={sprint} snapshots={burndownSnapshots} />
          </Panel>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-4 lg:grid-cols-1">
          <KpiTile label="Committed" value={`${stats.totalPoints} pts`} sub={`${stats.total} work items`} />
          <KpiTile label="Completed" value={`${stats.donePoints} pts`} sub={`${stats.pointsPct}% of committed points`} subTone={stats.pointsPct >= 100 && stats.totalPoints ? "green" : "slate"} />
          <KpiTile label="Remaining" value={`${remaining} pts`} sub={health.daysLeft !== undefined && health.daysLeft !== null ? `${health.daysLeft} day${health.daysLeft === 1 ? "" : "s"} left` : "No end date"} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SprintHealthCard sprint={sprint} health={health} stats={stats} onOpenBoard={actions.openBoard} />
        <Panel title="Status" icon={FaChartPie} subtitle="Work items by workflow status" className="h-full">
          <Distribution items={statusItems} total={stats.total} onSelect={(item) => actions.drill(`status:${item.key}`)} />
        </Panel>
        <Panel title="Priority" icon={FaFlag} subtitle="Work items by priority" className="h-full">
          <Distribution items={priorityItems} total={stats.total} onSelect={(item) => actions.drill(`priority:${item.key}`)} testId="priority-distribution" />
        </Panel>
      </div>

      <Panel title="Sprint work items" icon={FaListUl} subtitle={`${stats.total} items · ${stats.totalPoints} pts`} testId="sprint-items">
        <WorkItemTable tasks={stats.projectTasks} onOpenTask={actions.openTask} />
      </Panel>
    </div>
  );
}
