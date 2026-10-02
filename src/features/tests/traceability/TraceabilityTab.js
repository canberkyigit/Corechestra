import React, { memo, useMemo, useState } from "react";
import {
  FaCheckCircle, FaChevronRight, FaExclamationTriangle, FaPlus, FaProjectDiagram, FaQuestionCircle, FaSearch,
} from "react-icons/fa";
import { requestOpenTask } from "../../../shared/components/appNavigation";
import { TASK_TYPE_LABELS } from "../../../shared/constants/taskMeta";
import { taskKey } from "../../../shared/utils/helpers";
import {
  BTN_SM, CARD, CONTROL, COVERAGE_META, REQUIREMENT_TYPES,
} from "../constants/testingConstants";
import { TaskStatusChip } from "../components/TaskRef";
import { Chip, EmptyState, KpiCard, ResultBar, ResultChip } from "../components/ui";
import { buildTraceability, sortTraceRows } from "../utils/testingCoverage";

const COVERAGE_ORDER = ["failing", "not-covered", "partial", "not-run", "passing"];

/** Requirements × test coverage matrix with uncovered-requirement actions. */
function TraceabilityTab({ ws, onCreateCase }) {
  const { data, perms, nav, epics = [], activeTaskIds } = ws;
  const [query, setQuery] = useState("");
  const [coverage, setCoverage] = useState([]);
  const [epicId, setEpicId] = useState("");
  const [releaseId, setReleaseId] = useState("");
  const [sprint, setSprint] = useState("");
  const [types, setTypes] = useState([]);
  const [sort, setSort] = useState("risk");
  const [expanded, setExpanded] = useState(() => new Set());

  const trace = useMemo(() => buildTraceability({ cases: data.cases.filter((testCase) => testCase.status !== "deprecated"), tasks: data.tasks, latestMap: data.latestMap }), [data.cases, data.tasks, data.latestMap]);
  const releaseTaskIds = useMemo(() => {
    if (!releaseId) return null;
    const release = data.releaseById.get(releaseId);
    return new Set((release?.taskIds || []).map(String));
  }, [releaseId, data.releaseById]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortTraceRows(trace.rows.filter((row) => {
      if (coverage.length && !coverage.includes(row.coverage)) return false;
      if (types.length && !types.includes(row.task.type)) return false;
      if (epicId && String(row.task.epicId || "") !== epicId && String(row.task.id) !== epicId) return false;
      if (releaseTaskIds && !releaseTaskIds.has(String(row.task.id))) return false;
      if (sprint === "active" && !activeTaskIds?.has(String(row.task.id))) return false;
      if (sprint === "backlog" && activeTaskIds?.has(String(row.task.id))) return false;
      if (q && !String(row.task.title || "").toLowerCase().includes(q) && !taskKey(row.task.id).toLowerCase().includes(q)) return false;
      return true;
    }), sort);
  }, [trace.rows, query, coverage, types, epicId, releaseTaskIds, sprint, activeTaskIds, sort]);

  const uncovered = rows.filter((row) => row.coverage === "not-covered");
  const typeOptions = [...new Set(trace.rows.map((row) => row.task.type))];
  const { summary } = trace;

  if (!trace.rows.length) {
    return (
      <div className={CARD} data-testid="tests-traceability-empty">
        <EmptyState icon={FaProjectDiagram} title="No requirements to trace" description="User stories, features and epics of this project appear here with their test coverage. Link cases to tasks from the case Links tab." />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tests-traceability">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Coverage metrics">
        <KpiCard icon={FaProjectDiagram} label="Requirement coverage" value={`${summary.coveragePercent}%`} sub={`${summary.covered} of ${summary.total} have tests`} tone="blue" />
        <KpiCard icon={FaCheckCircle} label="Passing" value={summary.passing} sub="All linked cases passed" tone="green" onClick={() => setCoverage(["passing"])} />
        <KpiCard icon={FaExclamationTriangle} label="Failing" value={summary.failing} sub="A linked case failed/blocked" tone={summary.failing ? "red" : "slate"} onClick={() => setCoverage(["failing"])} />
        <KpiCard icon={FaQuestionCircle} label="Not covered" value={summary.notCovered} sub="No test cases yet" tone={summary.notCovered ? "amber" : "slate"} onClick={() => setCoverage(["not-covered"])} />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block w-full sm:w-64">
          <span className="sr-only">Search requirements</span>
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requirements" className={`${CONTROL} w-full pl-8`} />
        </label>
        <select value={epicId} onChange={(event) => setEpicId(event.target.value)} aria-label="Filter by epic" className={CONTROL}>
          <option value="">All epics</option>
          {epics.map((epic) => <option key={epic.id} value={String(epic.id)}>{epic.title || epic.name}</option>)}
        </select>
        <select value={releaseId} onChange={(event) => setReleaseId(event.target.value)} aria-label="Filter by release" className={CONTROL}>
          <option value="">All releases</option>
          {data.projectReleases.map((release) => <option key={release.id} value={release.id}>{release.version}</option>)}
        </select>
        <select value={sprint} onChange={(event) => setSprint(event.target.value)} aria-label="Filter by sprint" className={CONTROL}>
          <option value="">Sprint & backlog</option>
          <option value="active">Active sprint</option>
          <option value="backlog">Backlog</option>
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort requirements" className={CONTROL}>
          <option value="risk">Sort: Risk first</option>
          <option value="title">Sort: Title</option>
          <option value="cases">Sort: Most cases</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Coverage filter">
        {COVERAGE_ORDER.map((key) => {
          const active = coverage.includes(key);
          const count = trace.rows.filter((row) => row.coverage === key).length;
          return (
            <button key={key} type="button" aria-pressed={active} onClick={() => setCoverage((prev) => (active ? prev.filter((item) => item !== key) : [...prev, key]))} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${active ? "bg-slate-900 text-white dark:bg-blue-600" : "text-slate-600 ring-1 ring-inset ring-slate-300/70 hover:bg-slate-500/10 dark:text-slate-300 dark:ring-[#2a3044]"}`}>
              <span className={`h-2 w-2 rounded-full ${COVERAGE_META[key].dot}`} aria-hidden="true" />
              {COVERAGE_META[key].label} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
        {typeOptions.length > 1 && <span className="mx-1 h-4 w-px bg-slate-300 dark:bg-[#2a3044]" aria-hidden="true" />}
        {typeOptions.length > 1 && typeOptions.map((type) => {
          const active = types.includes(type);
          return (
            <button key={type} type="button" aria-pressed={active} onClick={() => setTypes((prev) => (active ? prev.filter((item) => item !== type) : [...prev, type]))} className={`h-8 rounded-full px-3 text-xs font-medium ${active ? "bg-blue-600 text-white" : "text-slate-600 ring-1 ring-inset ring-slate-300/70 hover:bg-slate-500/10 dark:text-slate-300 dark:ring-[#2a3044]"}`}>
              {TASK_TYPE_LABELS[type] || type}
            </button>
          );
        })}
        {(coverage.length || types.length || epicId || releaseId || sprint || query) ? (
          <button type="button" onClick={() => { setCoverage([]); setTypes([]); setEpicId(""); setReleaseId(""); setSprint(""); setQuery(""); }} className="ml-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">Clear</button>
        ) : null}
      </div>

      <section className={`${CARD} overflow-hidden`} aria-label="Traceability matrix">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-500/[0.03] text-[11px] uppercase tracking-[0.06em] text-slate-500">
              <tr className="border-b border-slate-200/70 dark:border-[#252b3b]">
                <th className="w-8 px-3 py-2.5" aria-label="Expand" />
                <th className="px-2 py-2.5 font-semibold">Requirement</th>
                <th className="px-2 py-2.5 font-semibold">Status</th>
                <th className="px-2 py-2.5 text-right font-semibold">Cases</th>
                <th className="w-56 px-2 py-2.5 font-semibold">Latest results</th>
                <th className="px-2 py-2.5 font-semibold">Coverage</th>
                <th className="px-3 py-2.5" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
              {rows.map((row) => {
                const isOpen = expanded.has(String(row.task.id));
                return (
                  <React.Fragment key={row.task.id}>
                    <tr className="hover:bg-slate-500/[0.03]" data-testid={`tests-trace-row-${row.task.id}`}>
                      <td className="px-3 py-2.5">
                        {row.caseCount > 0 && (
                          <button type="button" onClick={() => setExpanded((prev) => { const next = new Set(prev); const key = String(row.task.id); if (next.has(key)) next.delete(key); else next.add(key); return next; })} aria-expanded={isOpen} aria-label={`${isOpen ? "Collapse" : "Expand"} ${taskKey(row.task.id)}`} className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-500/10">
                            <FaChevronRight className={`h-2.5 w-2.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                          </button>
                        )}
                      </td>
                      <td className="max-w-[380px] px-2 py-2.5">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <span className="flex-shrink-0 font-mono text-[11px] text-slate-500">{taskKey(row.task.id)}</span>
                          <button type="button" onClick={() => requestOpenTask(row.task)} className="truncate text-left font-medium text-slate-900 hover:text-blue-600 hover:underline dark:hover:text-blue-400">{row.task.title}</button>
                        </div>
                        <span className="text-[11px] text-slate-500">{TASK_TYPE_LABELS[row.task.type] || row.task.type}</span>
                      </td>
                      <td className="px-2 py-2.5"><TaskStatusChip status={row.task.status} /></td>
                      <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-slate-900">{row.caseCount}</td>
                      <td className="px-2 py-2.5">{row.caseCount ? <ResultBar counts={row.counts} total={row.caseCount} /> : <span className="text-xs text-slate-500">—</span>}</td>
                      <td className="px-2 py-2.5"><Chip className={COVERAGE_META[row.coverage].chip}>{COVERAGE_META[row.coverage].label}</Chip></td>
                      <td className="px-3 py-2.5 text-right">
                        {perms.canEdit && (
                          <button type="button" onClick={() => onCreateCase({ title: `Verify: ${row.task.title}`.slice(0, 140), requirementIds: [row.task.id] })} className={BTN_SM} data-testid={`tests-trace-create-${row.task.id}`}>
                            <FaPlus className="h-2 w-2" /> Case
                          </button>
                        )}
                      </td>
                    </tr>
                    {isOpen && row.caseIds.map((caseId) => {
                      const testCase = data.caseById.get(caseId);
                      return (
                        <tr key={`${row.task.id}-${caseId}`} className="bg-slate-500/[0.02]">
                          <td />
                          <td className="px-2 py-1.5" colSpan={3}>
                            <button type="button" onClick={() => nav.openCase(caseId)} className="flex min-w-0 items-baseline gap-2 pl-4 text-left">
                              <span className="font-mono text-[11px] text-slate-500">{testCase?.key}</span>
                              <span className="truncate text-sm text-slate-700 hover:text-blue-600 dark:hover:text-blue-400">{testCase?.title}</span>
                            </button>
                          </td>
                          <td className="px-2 py-1.5" colSpan={3}><ResultChip status={data.latestMap.get(caseId)?.status || testCase?.legacyResult || "untested"} /></td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No requirements match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {uncovered.length > 0 && perms.canEdit && coverage.length === 0 && (
        <section className={`${CARD} p-4`} aria-label="Uncovered requirements">
          <h3 className="text-sm font-semibold text-slate-900">Uncovered requirements <span className="font-normal text-slate-500">({uncovered.length})</span></h3>
          <p className="mt-0.5 text-xs text-slate-500">Create a test case linked to each requirement with one click.</p>
          <ul className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {uncovered.slice(0, 12).map((row) => (
              <li key={row.task.id} className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300/80 px-3 py-2 dark:border-[#2a3044]">
                <span className="font-mono text-[11px] text-slate-500">{taskKey(row.task.id)}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{row.task.title}</span>
                <button type="button" onClick={() => onCreateCase({ title: `Verify: ${row.task.title}`.slice(0, 140), requirementIds: [row.task.id] })} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">Create test case</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-slate-500">Requirements: {REQUIREMENT_TYPES.map((type) => TASK_TYPE_LABELS[type] || type).join(", ")} of this project, plus any task a test case links to.</p>
    </div>
  );
}

export default memo(TraceabilityTab);
