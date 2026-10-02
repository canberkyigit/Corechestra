import React, { memo, useMemo, useState } from "react";
import { FaArrowRight, FaLink, FaSearch, FaUnlink } from "react-icons/fa";
import { requestOpenTask } from "../../../../shared/components/appNavigation";
import { TASK_STATUS_OPTIONS, TASK_TYPE_ICON_META, TASK_TYPE_LABELS } from "../../../../shared/constants/taskMeta";
import { taskKey } from "../../../../shared/utils/helpers";
import { FIELD_BASE } from "../../constants/releaseMeta";
import { isActiveStatus } from "../../utils/releaseModel";
import { matchesTaskQuery } from "../../utils/releaseUtils";
import { OwnerAvatar, TaskStatusChip } from "../ReleaseBadges";
import DetailCard, { SMALL_BTN_PRIMARY, SMALL_BTN_SECONDARY } from "./DetailCard";
import TaskLinkPopup from "./TaskLinkPopup";

const FILTER = `${FIELD_BASE} h-8 w-auto py-0 text-xs`;

function WorkItemsTab({ release, metrics, allTasks, users, otherReleases, canManage, actions }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [assignee, setAssignee] = useState("");
  const [linking, setLinking] = useState(false);
  const [moveTarget, setMoveTarget] = useState("");

  const tasks = metrics.linkedTasks;
  const types = useMemo(() => [...new Set(tasks.map((task) => task.type || "task"))], [tasks]);
  const assignees = useMemo(() => [...new Set(tasks.map((task) => task.assignedTo).filter(Boolean))], [tasks]);
  const filtered = useMemo(() => tasks.filter((task) => (
    (!status || task.status === status)
    && (!type || (task.type || "task") === type)
    && (!assignee || task.assignedTo === assignee)
    && matchesTaskQuery(task, query)
  )), [tasks, status, type, assignee, query]);
  const unfinished = useMemo(() => tasks.filter((task) => task.status !== "done").map((task) => task.id), [tasks]);
  const targets = useMemo(() => otherReleases.filter((item) => isActiveStatus(item.status)), [otherReleases]);

  return (
    <div className="space-y-4">
      <DetailCard
        title="Linked work items"
        subtitle={`${metrics.work.done} of ${metrics.work.total} done${metrics.work.points ? ` · ${metrics.work.pointsDone}/${metrics.work.points} story points` : ""}`}
        action={canManage && (
          <button type="button" onClick={() => setLinking(true)} className={SMALL_BTN_PRIMARY} data-testid="release-link-tasks">
            <FaLink className="h-2.5 w-2.5" /> Link work items
          </button>
        )}
        bodyClassName=""
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/70 px-4 py-2.5 dark:border-[#252b3b]">
          <label className="relative">
            <span className="sr-only">Filter linked work items</span>
            <FaSearch className="pointer-events-none absolute left-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-500" />
            <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by title or key" className={`${FIELD_BASE} h-8 w-52 py-0 pl-7 text-xs`} />
          </label>
          <select aria-label="Status filter" value={status} onChange={(event) => setStatus(event.target.value)} className={FILTER}>
            <option value="">All statuses</option>
            {TASK_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select aria-label="Type filter" value={type} onChange={(event) => setType(event.target.value)} className={FILTER}>
            <option value="">All types</option>
            {types.map((value) => <option key={value} value={value}>{TASK_TYPE_LABELS[value] || value}</option>)}
          </select>
          <select aria-label="Assignee filter" value={assignee} onChange={(event) => setAssignee(event.target.value)} className={FILTER}>
            <option value="">All assignees</option>
            {assignees.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          {canManage && unfinished.length > 0 && targets.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <select aria-label="Move unfinished to release" value={moveTarget} onChange={(event) => setMoveTarget(event.target.value)} className={FILTER}>
                <option value="">Move {unfinished.length} unfinished to…</option>
                {targets.map((item) => <option key={item.id} value={item.id}>{item.version}{item.name ? ` · ${item.name}` : ""}</option>)}
              </select>
              <button
                type="button"
                disabled={!moveTarget}
                onClick={() => {
                  actions.moveTasks(release, moveTarget, unfinished);
                  setMoveTarget("");
                }}
                className={SMALL_BTN_SECONDARY}
              >
                <FaArrowRight className="h-2.5 w-2.5" /> Move
              </button>
            </div>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No work items linked to this release yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  <th scope="col" className="px-4 py-2 w-32">Key</th>
                  <th scope="col" className="px-2 py-2">Title</th>
                  <th scope="col" className="px-2 py-2 w-28">Status</th>
                  <th scope="col" className="px-2 py-2 w-40">Assignee</th>
                  <th scope="col" className="px-2 py-2 w-12 text-right">SP</th>
                  {canManage && <th scope="col" className="px-4 py-2 w-12"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
                {filtered.map((task) => {
                  const meta = TASK_TYPE_ICON_META[task.type] || TASK_TYPE_ICON_META.task;
                  const Icon = meta.icon;
                  return (
                    <tr key={task.id} className="group hover:bg-slate-500/[0.04] dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          <Icon className={`h-3 w-3 ${meta.color}`} title={TASK_TYPE_LABELS[task.type]} />
                          <span className="font-mono text-xs text-slate-600">{taskKey(task.id)}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2 max-w-0">
                        <button type="button" onClick={() => requestOpenTask(task)} className="block w-full truncate text-left text-slate-900 hover:text-blue-600 hover:underline focus:outline-none focus-visible:underline dark:hover:text-blue-400">
                          {task.title}
                        </button>
                      </td>
                      <td className="px-2 py-2"><TaskStatusChip status={task.status} /></td>
                      <td className="px-2 py-2">{task.assignedTo ? <OwnerAvatar users={users} owner={task.assignedTo} showName /> : <span className="text-xs text-slate-500">Unassigned</span>}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-700">{task.storyPoint || "—"}</td>
                      {canManage && (
                        <td className="px-4 py-2 text-right">
                          <button type="button" onClick={() => actions.unlinkTask(release, task.id)} aria-label="Unlink task" title="Unlink" className="rounded p-1.5 text-slate-500 opacity-60 hover:bg-red-500/10 hover:text-red-600 hover:opacity-100 focus:opacity-100 group-hover:opacity-100">
                            <FaUnlink className="h-3 w-3" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={canManage ? 6 : 5} className="px-4 py-6 text-center text-sm text-slate-500">No work items match the filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {metrics.unresolvedTaskCount > 0 && (
          <p className="border-t border-slate-200/70 px-4 py-2 text-xs text-slate-500 dark:border-[#252b3b]">
            {metrics.unresolvedTaskCount} linked item{metrics.unresolvedTaskCount !== 1 ? "s are" : " is"} archived, deleted or in another project.
          </p>
        )}
      </DetailCard>

      {linking && (
        <TaskLinkPopup
          allTasks={allTasks}
          linkedIds={release.taskIds}
          onClose={() => setLinking(false)}
          onLink={(ids) => {
            actions.linkTasks(release, ids);
            setLinking(false);
          }}
        />
      )}
    </div>
  );
}

export default memo(WorkItemsTab);
