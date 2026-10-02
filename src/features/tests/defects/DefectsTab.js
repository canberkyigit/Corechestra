import React, { memo, useMemo, useState } from "react";
import { FaBug, FaClock, FaExclamationCircle, FaSearch } from "react-icons/fa";
import { requestOpenTask } from "../../../shared/components/appNavigation";
import { taskKey } from "../../../shared/utils/helpers";
import { CARD, CONTROL, PRIORITY_OPTIONS } from "../constants/testingConstants";
import { TaskStatusChip } from "../components/TaskRef";
import { Avatar, EmptyState, KpiCard, PriorityBadge } from "../components/ui";
import { collectDefectLinks } from "../utils/testingMetrics";
import { DAY_MS, relativeTime, toTimestamp } from "../utils/testingFormat";

/**
 * Bugs/defects linked from failed executions or cases. Also lists project
 * bugs whose `linkedItems` point at a test case. Opens the task side panel.
 */
function DefectsTab({ ws }) {
  const { data, users, nav, now } = ws;
  const [query, setQuery] = useState("");
  const [state, setState] = useState("open");
  const [priority, setPriority] = useState("");

  const rows = useMemo(() => {
    const links = collectDefectLinks(data.cases, data.runs);
    // Bugs created from tests elsewhere (linkedItems → test-case).
    data.tasks.forEach((task) => {
      (task.linkedItems || []).forEach((link) => {
        if (link?.targetType !== "test-case" || !data.caseById.has(link.targetId)) return;
        if (!links.has(task.id)) links.set(task.id, { taskId: task.id, caseIds: new Set(), runIds: new Set(), lastLinkedAt: toTimestamp(link.createdAt) });
        links.get(task.id).caseIds.add(link.targetId);
      });
    });
    const list = [];
    links.forEach((link, taskId) => {
      const task = data.taskById.get(String(taskId));
      const created = toTimestamp(task?.createdAt) || toTimestamp(task?.statusChangedAt) || link.lastLinkedAt;
      list.push({
        taskId,
        task,
        caseIds: [...link.caseIds].filter((id) => data.caseById.has(id)),
        runIds: [...link.runIds].filter((id) => data.runById.has(id)),
        ageDays: created ? Math.max(0, Math.floor((toTimestamp(now) - created) / DAY_MS)) : null,
        lastLinkedAt: link.lastLinkedAt,
      });
    });
    return list.sort((a, b) => (a.task?.status === "done") - (b.task?.status === "done") || (b.lastLinkedAt - a.lastLinkedAt));
  }, [data, now]);

  const filtered = rows.filter((row) => {
    if (state === "open" && (!row.task || row.task.status === "done")) return false;
    if (state === "done" && row.task?.status !== "done") return false;
    if (priority && row.task?.priority !== priority) return false;
    const q = query.trim().toLowerCase();
    if (q && !String(row.task?.title || "").toLowerCase().includes(q) && !taskKey(row.taskId).toLowerCase().includes(q)) return false;
    return true;
  });
  const open = rows.filter((row) => row.task && row.task.status !== "done");
  const critical = open.filter((row) => ["critical", "high"].includes(row.task.priority)).length;
  const ages = open.map((row) => row.ageDays).filter((value) => value !== null);
  const avgAge = ages.length ? Math.round(ages.reduce((sum, value) => sum + value, 0) / ages.length) : null;

  if (!rows.length) {
    return (
      <div className={CARD} data-testid="tests-defects-empty">
        <EmptyState icon={FaBug} title="No defects linked yet" description="Create a defect from a failed step in the execution runner, or link existing bugs to a test case. They show up here with their cases and cycles." />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tests-defects">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Defect metrics">
        <KpiCard icon={FaBug} label="Open defects" value={open.length} sub={`${rows.length} linked in total`} tone={open.length ? "red" : "slate"} />
        <KpiCard icon={FaExclamationCircle} label="Critical / high" value={critical} sub="Open, high impact" tone={critical ? "red" : "slate"} />
        <KpiCard icon={FaClock} label="Average age" value={avgAge === null ? "—" : `${avgAge}d`} sub="Open defects" tone="amber" />
        <KpiCard icon={FaBug} label="Cases affected" value={new Set(open.flatMap((row) => row.caseIds)).size} sub="With an open defect" tone="violet" />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block w-full sm:w-64">
          <span className="sr-only">Search defects</span>
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search defects" className={`${CONTROL} w-full pl-8`} />
        </label>
        <div role="group" aria-label="Defect state" className="inline-flex h-9 items-center rounded-lg bg-slate-900/[0.05] p-0.5 dark:bg-white/[0.06]">
          {[["open", "Open"], ["done", "Done"], ["all", "All"]].map(([id, label]) => (
            <button key={id} type="button" aria-pressed={state === id} onClick={() => setState(id)} className={`h-8 rounded-md px-3 text-xs font-semibold ${state === id ? "bg-white/100 text-slate-900 shadow-sm dark:bg-[#2a3044] dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>{label}</button>
          ))}
        </div>
        <select value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Filter by priority" className={CONTROL}>
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <section className={`${CARD} overflow-hidden`} aria-label="Defects">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-500/[0.03] text-[11px] uppercase tracking-[0.06em] text-slate-500">
              <tr className="border-b border-slate-200/70 dark:border-[#252b3b]">
                <th className="px-4 py-2.5 font-semibold">Defect</th>
                <th className="px-2 py-2.5 font-semibold">Status</th>
                <th className="px-2 py-2.5 font-semibold">Priority</th>
                <th className="px-2 py-2.5 font-semibold">Assignee</th>
                <th className="px-2 py-2.5 font-semibold">Test cases</th>
                <th className="px-2 py-2.5 font-semibold">Cycles</th>
                <th className="px-4 py-2.5 text-right font-semibold">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
              {filtered.map((row) => (
                <tr key={row.taskId} className="align-top hover:bg-slate-500/[0.03]" data-testid={`tests-defect-${row.taskId}`}>
                  <td className="max-w-[340px] px-4 py-2.5">
                    <div className="flex items-baseline gap-2">
                      <FaBug className="h-3 w-3 flex-shrink-0 translate-y-0.5 text-red-500" aria-hidden="true" />
                      <span className="flex-shrink-0 font-mono text-[11px] text-slate-500">{taskKey(row.taskId)}</span>
                      {row.task ? (
                        <button type="button" onClick={() => requestOpenTask(row.task)} className="truncate text-left font-medium text-slate-900 hover:text-blue-600 hover:underline dark:hover:text-blue-400">{row.task.title}</button>
                      ) : <span className="italic text-slate-500">Task not in this project</span>}
                    </div>
                  </td>
                  <td className="px-2 py-2.5">{row.task && <TaskStatusChip status={row.task.status} />}</td>
                  <td className="px-2 py-2.5">{row.task?.priority && <PriorityBadge priority={row.task.priority} />}</td>
                  <td className="px-2 py-2.5"><Avatar users={users} username={row.task?.assignedTo && row.task.assignedTo !== "unassigned" ? row.task.assignedTo : null} showName size="xs" /></td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {row.caseIds.slice(0, 3).map((caseId) => (
                        <button key={caseId} type="button" onClick={() => nav.openCase(caseId)} title={data.caseById.get(caseId)?.title} className="rounded bg-slate-500/10 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 hover:bg-blue-500/10 hover:text-blue-700 dark:text-slate-200 dark:hover:text-blue-300">
                          {data.caseById.get(caseId)?.key}
                        </button>
                      ))}
                      {row.caseIds.length > 3 && <span className="text-[11px] text-slate-500">+{row.caseIds.length - 3}</span>}
                    </div>
                  </td>
                  <td className="max-w-[220px] px-2 py-2.5">
                    {row.runIds.slice(0, 2).map((runId) => (
                      <button key={runId} type="button" onClick={() => nav.openRunner(runId, row.caseIds[0])} className="block max-w-full truncate text-left text-xs text-slate-600 hover:text-blue-600 hover:underline dark:hover:text-blue-400">{data.runById.get(runId)?.name}</button>
                    ))}
                    {!row.runIds.length && <span className="text-xs text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums text-slate-600" title={row.lastLinkedAt ? `Linked ${relativeTime(row.lastLinkedAt, now)}` : undefined}>{row.ageDays === null ? "—" : `${row.ageDays}d`}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No defects match.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default memo(DefectsTab);
