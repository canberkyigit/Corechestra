import React, { useMemo, useRef, useState } from "react";
import { FaCheck, FaChevronRight, FaFolder } from "react-icons/fa";
import { useSavedViews } from "../../../shared/context/hooks/useSavedViews";
import {
  AUTOMATION_OPTIONS, BTN_PRIMARY, BTN_SECONDARY, CASE_STATUS_OPTIONS, CASE_TYPE_OPTIONS, ENVIRONMENT_OPTIONS,
  FIELD, PLATFORM_OPTIONS, PRIORITY_OPTIONS, RESULT_META, RESULT_ORDER, optionLabel,
} from "../constants/testingConstants";
import { Avatar, Field, Modal, PriorityBadge, ResultChip } from "../components/ui";
import { flattenTree } from "../utils/testingTree";
import { DEFAULT_SCOPE, assignTesters, assignmentDistribution, resolveScope } from "../utils/cycleScope";
import { userLabel } from "../utils/testingFormat";

const STEPS = ["Details", "Scope", "Assign", "Review"];
const SELECT = `${FIELD} h-9 py-0`;

function ChipToggle({ options, selected, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? selected.filter((item) => item !== option.value) : [...selected, option.value])}
            className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors ${active ? "bg-blue-600 text-white" : "text-slate-600 ring-1 ring-inset ring-slate-300/70 hover:bg-slate-500/10 dark:text-slate-300 dark:ring-[#2a3044]"}`}
          >
            {active && <FaCheck className="h-2 w-2" />}{option.label}
          </button>
        );
      })}
    </div>
  );
}

function folderAllExpanded(tree) {
  const all = new Set();
  const walk = (nodes) => nodes.forEach((node) => { all.add(node.id); walk(tree.childrenById.get(node.id) || []); });
  walk(tree.roots);
  return all;
}

/**
 * 4-step cycle wizard: details → scope (folders / filters / tags / saved view
 * / preselected cases) → tester assignment → review.
 */
export default function CycleWizard({ ws, initial = {}, onClose, onCreated }) {
  const { data, users, currentUser, currentProjectId } = ws;
  const nameRef = useRef(null);
  const [step, setStep] = useState(0);
  const explicitIds = initial.caseIds?.length ? initial.caseIds : null;
  const [details, setDetails] = useState(() => {
    const plan = initial.planId ? data.planById.get(initial.planId) : null;
    return {
      name: initial.name || "",
      planId: initial.planId || "",
      releaseId: plan?.releaseId || initial.releaseId || "",
      environment: "staging",
      build: "",
      platform: "web",
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: plan?.endDate || "",
      description: "",
    };
  });
  const [scopeMode, setScopeMode] = useState(explicitIds ? "selected" : "filters");
  const [scope, setScope] = useState(DEFAULT_SCOPE);
  const [excluded, setExcluded] = useState(() => new Set());
  const [strategy, setStrategy] = useState("round-robin");
  const [defaultTester, setDefaultTester] = useState(currentUser || "");
  const people = useMemo(() => users.filter((user) => user?.username && user.status !== "inactive" && user.role !== "viewer"), [users]);
  const [testers, setTesters] = useState(() => people.slice(0, 4).map((user) => user.username));
  const [error, setError] = useState("");
  const saved = useSavedViews("tests", `${currentProjectId || "project"}:repository`, null);

  const folderRank = useMemo(() => new Map(flattenTree(data.tree, folderAllExpanded(data.tree)).map((row, index) => [row.suite.id, index])), [data.tree]);
  const folderRows = useMemo(() => flattenTree(data.tree, folderAllExpanded(data.tree)), [data.tree]);
  const tagOptions = useMemo(() => [...new Set(data.cases.flatMap((testCase) => testCase.tags))].sort().map((tag) => ({ value: tag, label: tag })), [data.cases]);

  const scoped = useMemo(() => resolveScope(data.cases, scope, {
    tree: data.tree, explicitIds: scopeMode === "selected" ? explicitIds : null, excluded, latestMap: data.latestMap, folderRank,
  }), [data.cases, scope, data.tree, scopeMode, explicitIds, excluded, data.latestMap, folderRank]);
  const scopedAll = useMemo(() => resolveScope(data.cases, scope, {
    tree: data.tree, explicitIds: scopeMode === "selected" ? explicitIds : null, latestMap: data.latestMap, folderRank,
  }), [data.cases, scope, data.tree, scopeMode, explicitIds, data.latestMap, folderRank]);
  const assignments = useMemo(() => assignTesters(scoped, { strategy, testers, defaultTester: defaultTester || null }), [scoped, strategy, testers, defaultTester]);
  const distribution = useMemo(() => assignmentDistribution(assignments, scoped.map((testCase) => testCase.id)), [assignments, scoped]);

  const setD = (key) => (event) => {
    const value = event.target.value;
    setDetails((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "planId") {
        const plan = data.planById.get(value);
        if (plan?.releaseId) next.releaseId = plan.releaseId;
        if (plan?.endDate && !prev.dueDate) next.dueDate = plan.endDate;
      }
      return next;
    });
    setError("");
  };
  const setScopeKey = (key) => (value) => setScope((prev) => ({ ...prev, [key]: value }));

  const next = () => {
    if (step === 0 && !details.name.trim()) {
      setError("Give the cycle a name");
      nameRef.current?.focus();
      return;
    }
    if (step === 1 && !scoped.length) {
      setError("The scope is empty — select folders or relax the filters");
      return;
    }
    setError("");
    setStep((value) => Math.min(STEPS.length - 1, value + 1));
  };

  const create = () => {
    const record = ws.actions.createCycle({
      ...details,
      name: details.name.trim(),
      planId: details.planId || null,
      releaseId: details.releaseId || null,
      dueDate: details.dueDate || null,
      startDate: details.startDate || null,
      caseIds: scoped.map((testCase) => testCase.id),
      assignments,
      assignedTester: defaultTester || null,
    });
    if (record) {
      onCreated?.(record);
      onClose();
    }
  };

  const applySavedView = (view) => {
    const state = view.state || {};
    const filters = state.filters || {};
    setScope({
      ...DEFAULT_SCOPE,
      status: [],
      folders: state.folderId ? [state.folderId] : [],
      priority: filters.priority || [],
      type: filters.type || [],
      automation: filters.automation || [],
      tags: filters.tags || [],
      lastResult: filters.lastResult || [],
    });
    setScopeMode("filters");
  };

  return (
    <Modal
      title="New test cycle"
      subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
      size="lg"
      onClose={onClose}
      initialFocusRef={step === 0 ? nameRef : undefined}
      testId="tests-cycle-wizard"
      footer={(
        <>
          <span className="mr-auto text-xs tabular-nums text-slate-500">{scoped.length} case{scoped.length !== 1 ? "s" : ""} in scope</span>
          {step > 0 && <button type="button" onClick={() => setStep((value) => value - 1)} className={BTN_SECONDARY}>Back</button>}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className={BTN_PRIMARY} data-testid="tests-wizard-next">Next <FaChevronRight className="h-2.5 w-2.5" /></button>
          ) : (
            <button type="button" onClick={create} className={BTN_PRIMARY} data-testid="tests-wizard-create">Create cycle</button>
          )}
        </>
      )}
    >
      <ol className="mb-5 flex items-center gap-2" aria-label="Wizard progress">
        {STEPS.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${index < step ? "bg-emerald-500 text-white" : index === step ? "bg-blue-600 text-white" : "bg-slate-500/10 text-slate-500"}`} aria-current={index === step ? "step" : undefined}>
              {index < step ? <FaCheck className="h-2.5 w-2.5" /> : index + 1}
            </span>
            <span className={`hidden text-xs font-medium sm:inline ${index === step ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
            {index < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200 dark:bg-[#2a3044]" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-500/[0.08] px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300">{error}</p>}

      {step === 0 && (
        <div className="space-y-4">
          <Field label="Cycle name" htmlFor="cycle-name">
            <input ref={nameRef} id="cycle-name" type="text" value={details.name} onChange={setD("name")} className={FIELD} placeholder="e.g. v2.6.0-rc.4 · Regression" data-testid="tests-cycle-name" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Test plan" htmlFor="cycle-plan">
              <select id="cycle-plan" value={details.planId} onChange={setD("planId")} className={SELECT}>
                <option value="">No plan (standalone)</option>
                {data.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </Field>
            <Field label="Release" htmlFor="cycle-release">
              <select id="cycle-release" value={details.releaseId} onChange={setD("releaseId")} className={SELECT} disabled={Boolean(details.planId && data.planById.get(details.planId)?.releaseId)}>
                <option value="">No release</option>
                {data.projectReleases.map((release) => <option key={release.id} value={release.id}>{release.version}{release.name ? ` — ${release.name}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Environment" htmlFor="cycle-env">
              <select id="cycle-env" value={details.environment} onChange={setD("environment")} className={SELECT}>{ENVIRONMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </Field>
            <Field label="Platform / configuration" htmlFor="cycle-platform">
              <select id="cycle-platform" value={details.platform} onChange={setD("platform")} className={SELECT}>{PLATFORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </Field>
            <Field label="Build" htmlFor="cycle-build">
              <input id="cycle-build" type="text" value={details.build} onChange={setD("build")} className={FIELD} placeholder="e.g. 2.6.0-rc.4 / #1842" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="cycle-start"><input id="cycle-start" type="date" value={details.startDate} onChange={setD("startDate")} className={FIELD} /></Field>
              <Field label="Due" htmlFor="cycle-due"><input id="cycle-due" type="date" value={details.dueDate} onChange={setD("dueDate")} className={FIELD} /></Field>
            </div>
          </div>
          <Field label="Description" htmlFor="cycle-description">
            <textarea id="cycle-description" rows={2} value={details.description} onChange={setD("description")} className={FIELD} placeholder="Goal of this cycle, notes for testers" />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div role="tablist" aria-label="Scope source" className="inline-flex rounded-lg bg-slate-900/[0.05] p-0.5 dark:bg-white/[0.06]">
            {[
              explicitIds && { id: "selected", label: `Selected cases (${explicitIds.length})` },
              { id: "filters", label: "Folders & filters" },
              { id: "views", label: "Saved views" },
            ].filter(Boolean).map((mode) => (
              <button key={mode.id} type="button" role="tab" aria-selected={scopeMode === mode.id} onClick={() => setScopeMode(mode.id)} className={`h-8 rounded-md px-3 text-xs font-semibold ${scopeMode === mode.id ? "bg-white/100 text-slate-900 shadow-sm dark:bg-[#2a3044] dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>
                {mode.label}
              </button>
            ))}
          </div>

          {scopeMode === "filters" && (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <Field label="Folders (include sub-folders)">
                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200/80 p-1.5 dark:border-[#252b3b]" data-testid="tests-wizard-folders">
                  {folderRows.map(({ suite, depth }) => {
                    const checked = scope.folders.includes(suite.id);
                    return (
                      <label key={suite.id} className="flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 text-sm text-slate-700 hover:bg-slate-500/[0.06] dark:text-slate-200" style={{ paddingLeft: 6 + depth * 14 }}>
                        <input type="checkbox" checked={checked} onChange={() => setScopeKey("folders")(checked ? scope.folders.filter((id) => id !== suite.id) : [...scope.folders, suite.id])} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <FaFolder className={`h-3 w-3 ${depth ? "text-amber-500" : "text-blue-500"}`} />
                        <span className="truncate">{suite.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-slate-500">{scope.folders.length ? `${scope.folders.length} selected` : "None selected = all folders"}</p>
              </Field>
              <div className="space-y-3">
                <Field label="Case status"><ChipToggle label="Case status" options={CASE_STATUS_OPTIONS} selected={scope.status} onChange={setScopeKey("status")} /></Field>
                <Field label="Priority"><ChipToggle label="Priority" options={PRIORITY_OPTIONS} selected={scope.priority} onChange={setScopeKey("priority")} /></Field>
                <Field label="Type"><ChipToggle label="Type" options={CASE_TYPE_OPTIONS} selected={scope.type} onChange={setScopeKey("type")} /></Field>
                <Field label="Automation"><ChipToggle label="Automation" options={AUTOMATION_OPTIONS} selected={scope.automation} onChange={setScopeKey("automation")} /></Field>
                <Field label="Last result"><ChipToggle label="Last result" options={RESULT_ORDER.map((status) => ({ value: status, label: RESULT_META[status].label }))} selected={scope.lastResult} onChange={setScopeKey("lastResult")} /></Field>
                {tagOptions.length > 0 && <Field label="Tags / regression packs"><ChipToggle label="Tags" options={tagOptions} selected={scope.tags} onChange={setScopeKey("tags")} /></Field>}
              </div>
            </div>
          )}

          {scopeMode === "views" && (
            <div>
              {saved.views.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300/80 px-3 py-6 text-center text-sm text-slate-500 dark:border-[#2a3044]">No saved repository views yet. Save one from the Repository toolbar (Views → Save).</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {saved.views.map((view) => (
                    <li key={view.id}>
                      <button type="button" onClick={() => applySavedView(view)} className="w-full rounded-lg border border-slate-200/80 px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:border-blue-400 dark:border-[#252b3b]">{view.name}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
              <span><b className="text-slate-900">{scoped.length}</b> of {scopedAll.length} matching cases included{excluded.size ? ` · ${excluded.size} excluded` : ""}</span>
              {excluded.size > 0 && <button type="button" onClick={() => setExcluded(new Set())} className="font-medium text-blue-600 hover:underline dark:text-blue-400">Include all</button>}
            </div>
            <ul className="max-h-56 divide-y divide-slate-200/70 overflow-y-auto rounded-lg border border-slate-200/80 dark:divide-[#252b3b] dark:border-[#252b3b]" data-testid="tests-wizard-preview">
              {scopedAll.slice(0, 200).map((testCase) => {
                const included = !excluded.has(testCase.id);
                return (
                  <li key={testCase.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-sm hover:bg-slate-500/[0.04]">
                      <input type="checkbox" checked={included} onChange={() => setExcluded((prev) => { const nextSet = new Set(prev); if (included) nextSet.add(testCase.id); else nextSet.delete(testCase.id); return nextSet; })} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="w-14 flex-shrink-0 font-mono text-[11px] text-slate-500">{testCase.key}</span>
                      <span className={`min-w-0 flex-1 truncate ${included ? "text-slate-800" : "text-slate-500 line-through"}`}>{testCase.title}</span>
                      <PriorityBadge priority={testCase.priority} showLabel={false} />
                      <ResultChip status={data.latestMap.get(testCase.id)?.status || "untested"} compact />
                    </label>
                  </li>
                );
              })}
              {scopedAll.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">No cases match.</li>}
            </ul>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Assignment strategy">
            {[
              { id: "round-robin", title: "Round-robin", text: "Distribute cases evenly across the selected testers." },
              { id: "owner", title: "By case owner", text: "Owners execute their own cases; others go to the default tester." },
              { id: "single", title: "Single tester", text: "Assign everything to the default tester." },
            ].map((option) => (
              <button key={option.id} type="button" role="radio" aria-checked={strategy === option.id} onClick={() => setStrategy(option.id)} className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${strategy === option.id ? "border-blue-500 bg-blue-500/[0.06] ring-1 ring-blue-500" : "border-slate-200/80 hover:border-slate-300 dark:border-[#252b3b]"}`}>
                <span className="block text-sm font-semibold text-slate-900">{option.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{option.text}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default tester" htmlFor="cycle-default-tester">
              <select id="cycle-default-tester" value={defaultTester} onChange={(event) => setDefaultTester(event.target.value)} className={SELECT}>
                <option value="">Unassigned</option>
                {people.map((user) => <option key={user.username} value={user.username}>{user.name || user.username}</option>)}
              </select>
            </Field>
            {strategy !== "single" && (
              <Field label={strategy === "owner" ? "Owners allowed (empty = any)" : "Testers"}>
                <div className="flex flex-wrap gap-1.5">
                  {people.map((user) => {
                    const active = testers.includes(user.username);
                    return (
                      <button key={user.username} type="button" aria-pressed={active} onClick={() => setTesters((prev) => (active ? prev.filter((item) => item !== user.username) : [...prev, user.username]))} className={`inline-flex h-8 items-center gap-1.5 rounded-full pl-1 pr-2.5 text-xs font-medium ${active ? "bg-blue-600 text-white" : "text-slate-700 ring-1 ring-inset ring-slate-300/70 hover:bg-slate-500/10 dark:text-slate-200 dark:ring-[#2a3044]"}`}>
                        <Avatar users={users} username={user.username} size="xs" />
                        {user.name || user.username}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          </div>
          <div>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Distribution</h4>
            <ul className="space-y-2">
              {distribution.map((row) => (
                <li key={row.user || "none"} className="flex items-center gap-3">
                  <Avatar users={users} username={row.user} showName className="w-40" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-500/10"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(row.count / Math.max(1, scoped.length)) * 100}%` }} /></div>
                  <span className="w-10 text-right text-xs font-semibold tabular-nums text-slate-700">{row.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {step === 3 && (
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2" data-testid="tests-wizard-review">
          {[
            ["Name", details.name],
            ["Plan", details.planId ? data.planById.get(details.planId)?.name : "Standalone"],
            ["Release", details.releaseId ? data.releaseById.get(details.releaseId)?.version || "—" : "—"],
            ["Environment", optionLabel(ENVIRONMENT_OPTIONS, details.environment)],
            ["Platform", optionLabel(PLATFORM_OPTIONS, details.platform)],
            ["Build", details.build || "—"],
            ["Dates", `${details.startDate || "—"} → ${details.dueDate || "no due date"}`],
            ["Cases", `${scoped.length}`],
            ["Assignment", `${strategy === "round-robin" ? "Round-robin" : strategy === "owner" ? "By owner" : "Single tester"} · default ${userLabel(users, defaultTester || null)}`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</dt>
              <dd className="mt-0.5 text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Modal>
  );
}
