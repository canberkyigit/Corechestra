import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaChevronLeft, FaChevronRight, FaClone, FaHistory, FaPlay, FaRegComment, FaTimes, FaTrashAlt,
} from "react-icons/fa";
import {
  AUTOMATION_OPTIONS, BTN_PRIMARY, BTN_SECONDARY, CASE_STATUS_OPTIONS, CASE_TYPE_OPTIONS, CONTROL,
  DEFECT_TYPES, FIELD, LINKABLE_REQUIREMENT_TYPES, PRIORITY_OPTIONS, RESULT_META, RUN_STATUS_META, TRACKED_LABELS,
} from "../constants/testingConstants";
import OverflowMenu from "../components/OverflowMenu";
import FolderSelect from "../components/FolderSelect";
import TaskPicker from "../components/TaskPicker";
import TaskRef from "../components/TaskRef";
import { Avatar, Chip, EmptyState, Field, ResultChip, isTopOverlay, useFocusTrap } from "../components/ui";
import StepsEditor from "./StepsEditor";
import { formatSuitePath } from "../utils/testingTree";
import { formatDateTime, formatDuration, relativeTime, userLabel } from "../utils/testingFormat";

const TABS = [
  { id: "details", label: "Details" },
  { id: "steps", label: "Steps" },
  { id: "links", label: "Links" },
  { id: "executions", label: "Executions" },
  { id: "history", label: "History" },
  { id: "comments", label: "Comments" },
];

const sameSteps = (a, b) => JSON.stringify(a.map(({ id, action, data, expected, sharedStepsId }) => [id, action, data, expected, sharedStepsId || null]))
  === JSON.stringify(b.map(({ id, action, data, expected, sharedStepsId }) => [id, action, data, expected, sharedStepsId || null]));

/** Text input that saves on blur / Enter when changed. */
function InlineText({ value, onSave, multiline = false, placeholder, readOnly, ariaLabel, className = FIELD, rows = 3, testId, bare = false }) {
  const [draft, setDraft] = useState(value || "");
  useEffect(() => setDraft(value || ""), [value]);
  if (readOnly) {
    return <p className={`whitespace-pre-wrap text-sm ${value ? "text-slate-800" : "italic text-slate-500"}`}>{value || placeholder || "—"}</p>;
  }
  const commit = () => {
    if ((draft || "") !== (value || "")) onSave(draft);
  };
  const Tag = multiline ? "textarea" : "input";
  return (
    <Tag
      type={multiline || bare ? undefined : "text"}
      rows={multiline ? rows : undefined}
      value={draft}
      placeholder={placeholder}
      aria-label={ariaLabel}
      data-testid={testId}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          event.stopPropagation();
          setDraft(value || "");
          event.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
}

function TagsEditor({ tags, onChange, readOnly }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const next = draft.split(",").map((tag) => tag.trim()).filter(Boolean);
    if (!next.length) return;
    onChange([...new Set([...tags, ...next])]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
          {tag}
          {!readOnly && (
            <button type="button" onClick={() => onChange(tags.filter((item) => item !== tag))} aria-label={`Remove tag ${tag}`} className="text-slate-400 hover:text-red-500"><FaTimes className="h-2 w-2" /></button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={tags.length ? "Add tag" : "Add tags (Enter)"}
          aria-label="Add tag"
          className="h-7 w-28 rounded-md border border-dashed border-slate-300 bg-transparent px-2 text-xs text-slate-700 focus:border-blue-400 focus:outline-none dark:border-[#374155] dark:text-slate-200"
        />
      )}
      {readOnly && !tags.length && <span className="text-sm text-slate-500">—</span>}
    </div>
  );
}

function ExecutionsPanel({ testCase, runs, users, planById, onOpenRun }) {
  const entries = useMemo(() => {
    const list = [];
    runs.forEach((run) => {
      const result = run.results.find((item) => item.caseId === testCase.id);
      if (!result) {
        if (run.caseIds.includes(testCase.id)) list.push({ key: `${run.id}-pending`, run, status: "untested", at: null, pending: true });
        return;
      }
      (result.attempts || []).forEach((attempt, index) => list.push({ key: `${run.id}-a${index}`, run, status: attempt.status, at: attempt.executedAt, by: attempt.executedBy, durationSec: attempt.durationSec, attempt: true }));
      if (result.status !== "untested" || !result.attempts?.length) {
        list.push({ key: `${run.id}-r`, run, status: result.status, at: result.executedAt, by: result.executedBy, durationSec: result.durationSec, comment: result.comment, actual: result.actualResult, defects: result.defects });
      }
    });
    return list.sort((a, b) => (Date.parse(b.at || 0) || Number.MAX_SAFE_INTEGER) - (Date.parse(a.at || 0) || Number.MAX_SAFE_INTEGER));
  }, [runs, testCase.id]);

  if (!entries.length) return <EmptyState compact icon={FaPlay} title="Never executed" description="Add this case to a cycle to start collecting results." />;
  return (
    <ol className="relative space-y-3 border-l border-slate-200/80 pl-5 dark:border-[#2a3044]" data-testid="tests-case-executions">
      {entries.map((entry) => (
        <li key={entry.key} className="relative">
          <span className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-slate-50 dark:ring-[#141720] ${entry.pending ? "bg-slate-300 dark:bg-slate-600" : RESULT_META[entry.status]?.dot}`} aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2">
            <ResultChip status={entry.status} />
            <button type="button" onClick={() => onOpenRun(entry.run.id)} className="truncate text-sm font-medium text-slate-800 hover:text-blue-600 hover:underline dark:hover:text-blue-400">{entry.run.name}</button>
            <Chip className={RUN_STATUS_META[entry.run.status]?.chip}>{RUN_STATUS_META[entry.run.status]?.label}</Chip>
            {entry.attempt && <span className="text-[11px] text-slate-500">earlier attempt</span>}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {entry.pending ? "Not executed yet" : `${userLabel(users, entry.by)} · ${formatDateTime(entry.at)}`}
            {entry.durationSec ? ` · ${formatDuration(entry.durationSec)}` : ""}
            {entry.run.build ? ` · build ${entry.run.build}` : ""}
            {entry.run.environment ? ` · ${entry.run.environment}` : ""}
            {entry.run.planId && planById.get(entry.run.planId) ? ` · ${planById.get(entry.run.planId).name}` : ""}
          </div>
          {(entry.comment || entry.actual) && <p className="mt-1 rounded-md bg-slate-500/[0.06] px-2.5 py-1.5 text-xs text-slate-700">{entry.actual || entry.comment}</p>}
        </li>
      ))}
    </ol>
  );
}

/** Wide right drawer with every aspect of one test case. Esc closes. */
export default function CaseDrawer({ testCase, ws, onClose, onNavigate, siblings = [] }) {
  const { data, users, perms, actions, nav, now } = ws;
  const canEdit = perms.canEdit;
  const [tab, setTab] = useState("details");
  const [stepsDraft, setStepsDraft] = useState(testCase.steps);
  const [comment, setComment] = useState("");
  const panelRef = useRef(null);
  const rootRef = useRef(null);
  const tabRefs = useRef({});
  useFocusTrap(panelRef);

  useEffect(() => {
    setStepsDraft(testCase.steps);
  }, [testCase.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepsDirty = !sameSteps(stepsDraft, testCase.steps);
  const latest = data.latestMap.get(testCase.id);
  const index = siblings.indexOf(testCase.id);

  const guardedClose = () => {
    if (stepsDirty && canEdit) {
      ws.requestConfirm({
        title: "Discard unsaved step changes?",
        message: "You edited the steps of this case without saving.",
        confirmLabel: "Discard",
        onConfirm: onClose,
      });
      return;
    }
    onClose();
  };

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [testCase.id]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || !isTopOverlay(rootRef.current)) return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      guardedClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const save = (patch) => actions.updateCase(testCase.id, patch);
  const historyValue = (field, value) => {
    if (value === null || value === undefined) return null;
    if (field === "suiteId") return data.suiteById.get(value)?.name || "Deleted folder";
    if (field === "owner") return userLabel(users, value);
    return value;
  };
  const caseRuns = useMemo(() => data.runs.filter((run) => run.caseIds.includes(testCase.id) || run.results.some((result) => result.caseId === testCase.id)), [data.runs, testCase.id]);
  const requirementTasks = testCase.requirementIds.map((id) => ({ id, task: data.taskById.get(String(id)) }));
  const defectTasks = testCase.defectIds.map((id) => ({ id, task: data.taskById.get(String(id)) }));

  const onTabKeyDown = (event) => {
    const current = TABS.findIndex((item) => item.id === tab);
    let next = null;
    if (event.key === "ArrowRight") next = TABS[(current + 1) % TABS.length];
    if (event.key === "ArrowLeft") next = TABS[(current - 1 + TABS.length) % TABS.length];
    if (next) {
      event.preventDefault();
      setTab(next.id);
      tabRefs.current[next.id]?.focus();
    }
  };

  const badge = {
    steps: testCase.steps.length,
    links: testCase.requirementIds.length + testCase.defectIds.length,
    executions: caseRuns.length,
    history: testCase.history.length,
    comments: testCase.comments.length,
  };

  return (
    <div ref={rootRef} data-tests-overlay="" className="absolute inset-0 z-30 flex justify-end" data-testid="tests-case-drawer">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[1px] dark:bg-black/50" onClick={guardedClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tests-case-title"
        className="animate-slide-in-right relative flex h-full w-full flex-col border-l border-slate-200/80 bg-slate-50 shadow-2xl focus:outline-none dark:border-[#252b3b] dark:bg-[#141720] lg:w-[min(960px,82%)]"
      >
        <div className="flex-shrink-0 bg-white/100 dark:bg-[#1a1f2e]">
          <div className="flex items-start gap-3 px-4 pb-2 pt-4 md:px-6">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-600">{testCase.key}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{formatSuitePath(testCase.suiteId, data.suiteById)}</span>
                {testCase.sample && <span className="rounded bg-slate-500/10 px-1 text-[10px] font-semibold uppercase">Sample</span>}
              </div>
              <h2 id="tests-case-title" className="mt-1">
                {canEdit ? (
                  <InlineText value={testCase.title} onSave={(title) => title.trim() && save({ title: title.trim() })} ariaLabel="Case title" testId="tests-case-title-input" bare className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 -ml-1 text-lg font-semibold text-slate-900 hover:border-slate-300/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:hover:border-[#2a3044]" />
                ) : (
                  <span className="text-lg font-semibold text-slate-900">{testCase.title}</span>
                )}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <ResultChip status={latest?.status || testCase.legacyResult || "untested"} title="Latest result" />
                {latest && <span className="text-xs text-slate-500">Last run {relativeTime(latest.at, now)} by {userLabel(users, latest.executedBy)}</span>}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              {siblings.length > 1 && (
                <>
                  <button type="button" onClick={() => onNavigate(siblings[index - 1])} disabled={index <= 0} aria-label="Previous case" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-500/10 disabled:opacity-30"><FaChevronLeft className="h-3 w-3" /></button>
                  <button type="button" onClick={() => onNavigate(siblings[index + 1])} disabled={index === -1 || index >= siblings.length - 1} aria-label="Next case" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-500/10 disabled:opacity-30"><FaChevronRight className="h-3 w-3" /></button>
                </>
              )}
              {canEdit && (
                <OverflowMenu
                  label="Case actions"
                  testId="tests-case-actions"
                  items={[
                    { id: "clone", label: "Clone case", icon: FaClone, onSelect: () => { const [copy] = actions.cloneCases([testCase.id]); if (copy) nav.openCase(copy.id); } },
                    { id: "div", divider: true },
                    { id: "delete", label: "Delete case…", icon: FaTrashAlt, danger: true, onSelect: () => actions.deleteCases([testCase.id]) },
                  ]}
                />
              )}
              <button type="button" onClick={guardedClose} aria-label="Close case" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-500/10 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-white">
                <FaTimes className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div role="tablist" aria-label="Case sections" onKeyDown={onTabKeyDown} className="flex gap-1 overflow-x-auto border-b border-slate-200/80 px-3 scrollbar-none dark:border-[#252b3b] md:px-5">
            {TABS.map((item) => {
              const selected = item.id === tab;
              return (
                <button
                  key={item.id}
                  ref={(node) => { tabRefs.current[item.id] = node; }}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setTab(item.id)}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 ${selected ? "text-blue-600 dark:text-blue-400" : "text-slate-600 hover:text-slate-900 dark:hover:text-white"}`}
                >
                  {item.label}
                  {item.id === "steps" && stepsDirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Unsaved changes" />}
                  {badge[item.id] ? <span className="rounded-full bg-slate-500/10 px-1.5 text-[10px] font-semibold tabular-nums text-slate-600">{badge[item.id]}</span> : null}
                  {selected && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        <div role="tabpanel" aria-label={TABS.find((item) => item.id === tab)?.label} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
          {tab === "details" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Field label="Priority" htmlFor="tc-priority">
                  <select id="tc-priority" disabled={!canEdit} value={testCase.priority} onChange={(event) => save({ priority: event.target.value })} className={`${CONTROL} w-full`} data-testid="tests-case-priority">
                    {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Type" htmlFor="tc-type">
                  <select id="tc-type" disabled={!canEdit} value={testCase.type} onChange={(event) => save({ type: event.target.value })} className={`${CONTROL} w-full`}>
                    {CASE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Automation" htmlFor="tc-automation">
                  <select id="tc-automation" disabled={!canEdit} value={testCase.automation} onChange={(event) => save({ automation: event.target.value })} className={`${CONTROL} w-full`}>
                    {AUTOMATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Status" htmlFor="tc-status">
                  <select id="tc-status" disabled={!canEdit} value={testCase.status} onChange={(event) => save({ status: event.target.value })} className={`${CONTROL} w-full`} data-testid="tests-case-status">
                    {CASE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </Field>
                <Field label="Owner" htmlFor="tc-owner">
                  <select id="tc-owner" disabled={!canEdit} value={testCase.owner || ""} onChange={(event) => save({ owner: event.target.value || null })} className={`${CONTROL} w-full`}>
                    <option value="">Unassigned</option>
                    {users.filter((user) => user?.username).map((user) => <option key={user.username} value={user.username}>{user.name || user.username}</option>)}
                    {testCase.owner && !users.some((user) => user?.username === testCase.owner) && <option value={testCase.owner}>{testCase.owner}</option>}
                  </select>
                </Field>
                <Field label="Estimate (min)" htmlFor="tc-estimate">
                  <InlineText value={testCase.estimate ? String(testCase.estimate) : ""} readOnly={!canEdit} onSave={(value) => save({ estimate: Number.parseInt(value, 10) > 0 ? Number.parseInt(value, 10) : null })} placeholder="e.g. 15" ariaLabel="Estimate in minutes" className={`${CONTROL} w-full`} />
                </Field>
                <Field label="Folder" htmlFor="tc-folder" className="col-span-2">
                  {canEdit ? (
                    <FolderSelect id="tc-folder" tree={data.tree} value={testCase.suiteId} onChange={(suiteId) => suiteId && actions.moveCases([testCase.id], suiteId)} className={`${CONTROL} w-full`} />
                  ) : <p className="text-sm text-slate-800">{formatSuitePath(testCase.suiteId, data.suiteById)}</p>}
                </Field>
              </div>
              <Field label="Tags">
                <TagsEditor tags={testCase.tags} readOnly={!canEdit} onChange={(tags) => save({ tags })} />
              </Field>
              <Field label="Description / objective">
                <InlineText multiline value={testCase.description} readOnly={!canEdit} onSave={(value) => save({ description: value })} placeholder="What this case verifies and why" ariaLabel="Description" rows={3} />
              </Field>
              <Field label="Preconditions">
                <InlineText multiline value={testCase.preconditions} readOnly={!canEdit} onSave={(value) => save({ preconditions: value })} placeholder="State required before step 1 (data, accounts, flags)" ariaLabel="Preconditions" rows={2} />
              </Field>
              <Field label="Expected result (overall)">
                <InlineText multiline value={testCase.expectedResult} readOnly={!canEdit} onSave={(value) => save({ expectedResult: value })} placeholder="Overall outcome when every step passes" ariaLabel="Expected result" rows={2} />
              </Field>
              <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-200/70 pt-3 text-xs text-slate-500 dark:border-[#252b3b]">
                <span>Created {formatDateTime(testCase.createdAt)}</span>
                <span>Updated {relativeTime(testCase.updatedAt, now)}</span>
                <span className="inline-flex items-center gap-1">Owner <Avatar users={users} username={testCase.owner} size="xs" showName /></span>
              </div>
            </div>
          )}

          {tab === "steps" && (
            <div>
              {stepsDirty && canEdit && (
                <div className="sticky -top-5 z-10 -mx-4 mb-3 flex items-center justify-between gap-2 border-b border-amber-500/20 bg-amber-50/95 px-4 py-2 backdrop-blur dark:bg-[#2a2414]/95 md:-mx-6 md:px-6">
                  <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Unsaved step changes</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStepsDraft(testCase.steps)} className={`${BTN_SECONDARY} h-8 text-xs`}>Discard</button>
                    <button type="button" onClick={() => save({ steps: stepsDraft })} className={`${BTN_PRIMARY} h-8 text-xs`} data-testid="tests-save-steps">Save steps</button>
                  </div>
                </div>
              )}
              <StepsEditor steps={canEdit ? stepsDraft : testCase.steps} onChange={setStepsDraft} sharedSteps={data.sharedSteps} sharedById={data.sharedById} readOnly={!canEdit} />
            </div>
          )}

          {tab === "links" && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Requirements</h3>
                <p className="mt-0.5 text-xs text-slate-500">User stories, features or tasks this case verifies (drives the traceability matrix).</p>
                <ul className="mt-2 divide-y divide-slate-200/70 dark:divide-[#252b3b]">
                  {requirementTasks.map(({ id, task }) => (
                    <TaskRef key={id} id={id} task={task} onRemove={canEdit ? () => save({ requirementIds: testCase.requirementIds.filter((item) => item !== id) }) : null} />
                  ))}
                </ul>
                {!requirementTasks.length && <p className="mt-2 text-sm text-slate-500">No linked requirements.</p>}
                {canEdit && (
                  <div className="mt-2 max-w-md">
                    <TaskPicker tasks={data.tasks} types={LINKABLE_REQUIREMENT_TYPES} excludeIds={testCase.requirementIds} onPick={(task) => save({ requirementIds: [...testCase.requirementIds, task.id] })} placeholder="Link a requirement…" testId="tests-link-requirement" />
                  </div>
                )}
              </section>
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Defects</h3>
                <p className="mt-0.5 text-xs text-slate-500">Bugs found by this case. Defects created during execution are linked automatically.</p>
                <ul className="mt-2 divide-y divide-slate-200/70 dark:divide-[#252b3b]">
                  {defectTasks.map(({ id, task }) => (
                    <TaskRef key={id} id={id} task={task} onRemove={canEdit ? () => save({ defectIds: testCase.defectIds.filter((item) => item !== id) }) : null} />
                  ))}
                </ul>
                {!defectTasks.length && <p className="mt-2 text-sm text-slate-500">No linked defects.</p>}
                {canEdit && (
                  <div className="mt-2 max-w-md">
                    <TaskPicker tasks={data.tasks} types={DEFECT_TYPES} excludeIds={testCase.defectIds} onPick={(task) => save({ defectIds: [...testCase.defectIds, task.id] })} placeholder="Link an existing bug…" testId="tests-link-defect" />
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === "executions" && <ExecutionsPanel testCase={testCase} runs={caseRuns} users={users} planById={data.planById} onOpenRun={(runId) => nav.openRunner(runId, testCase.id)} />}

          {tab === "history" && (
            testCase.history.length === 0 ? <EmptyState compact icon={FaHistory} title="No changes recorded" description="Edits to tracked fields appear here with who and when." /> : (
              <ol className="space-y-3" data-testid="tests-case-history">
                {[...testCase.history].reverse().map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <Avatar users={users} username={entry.by} />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="text-slate-800">
                        <b className="font-semibold">{userLabel(users, entry.by)}</b>{" "}
                        {entry.action === "created" ? "created this case" : `changed ${(entry.fields || []).map((field) => TRACKED_LABELS[field] || field).join(", ")}`}
                      </p>
                      {entry.changes && (
                        <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                          {Object.entries(entry.changes).map(([field, change]) => (
                            <li key={field}>{TRACKED_LABELS[field] || field}: <span className="line-through opacity-70">{historyValue(field, change.from) ?? "—"}</span> → <b className="font-medium">{historyValue(field, change.to) ?? "—"}</b></li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(entry.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )
          )}

          {tab === "comments" && (
            <div className="space-y-4">
              {testCase.comments.length === 0 && <EmptyState compact icon={FaRegComment} title="No comments yet" />}
              <ul className="space-y-3">
                {testCase.comments.map((item) => (
                  <li key={item.id} className="group flex gap-3">
                    <Avatar users={users} username={item.author} />
                    <div className="min-w-0 flex-1 rounded-lg bg-white/100 px-3 py-2 ring-1 ring-slate-200/80 dark:bg-[#1a1f2e] dark:ring-[#252b3b]">
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span><b className="font-semibold text-slate-800">{userLabel(users, item.author)}</b> · {relativeTime(item.createdAt, now)}</span>
                        {canEdit && <button type="button" onClick={() => actions.deleteComment(testCase.id, item.id)} className="opacity-0 hover:text-red-500 group-hover:opacity-100 focus:opacity-100" aria-label="Delete comment"><FaTrashAlt className="h-2.5 w-2.5" /></button>}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {canEdit && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!comment.trim()) return;
                    actions.addComment(testCase.id, comment);
                    setComment("");
                  }}
                  className="flex flex-col gap-2"
                >
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="Add a comment…" aria-label="New comment" className={FIELD} data-testid="tests-comment-input" />
                  <div className="flex justify-end"><button type="submit" disabled={!comment.trim()} className={BTN_PRIMARY}>Comment</button></div>
                </form>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
