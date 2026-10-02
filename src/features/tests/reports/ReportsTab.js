import React, { memo, useMemo } from "react";
import { FaCopy, FaFileAlt, FaFileCsv, FaMarkdown, FaPrint } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import {
  BTN_SECONDARY, BTN_SM, CARD, CONTROL, ENVIRONMENT_OPTIONS, PLATFORM_OPTIONS, PRIORITY_META, RESULT_META, RUN_STATUS_META, optionLabel,
} from "../constants/testingConstants";
import { TaskStatusChip } from "../components/TaskRef";
import { Chip, EmptyState, ResultBar, ResultChip } from "../components/ui";
import { StatusDonut } from "../overview/charts";
import {
  buildCycleReport, buildReleaseReport, cycleReportCsv, cycleReportMarkdown, releaseReportCsv, releaseReportMarkdown,
  releaseVerdictLabel, withCaseRows,
} from "../utils/testingReports";
import { copyText, downloadTextFile, fileStamp } from "../utils/testingExport";
import { formatDate, formatDuration, slugify, userLabel } from "../utils/testingFormat";

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .tests-print-area, .tests-print-area * { visibility: visible !important; }
  .tests-print-area { position: absolute !important; left: 0; top: 0; width: 100%; padding: 24px !important; border: 0 !important; box-shadow: none !important; background: #fff !important; color: #0f172a !important; }
  .tests-print-area * { color: #0f172a !important; border-color: #cbd5e1 !important; }
  .tests-no-print { display: none !important; }
}`;

const VERDICT_CHIP = {
  ready: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  "in-progress": "bg-blue-500/10 text-blue-700 ring-blue-500/25 dark:text-blue-300",
  "at-risk": "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300",
  "no-data": "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300",
};
const STATUS_COLUMNS = ["passed", "failed", "blocked", "retest", "skipped", "untested"];

function Stat({ label, value, tone = "text-slate-900" }) {
  return (
    <div className="rounded-lg border border-slate-200/80 px-3 py-2.5 dark:border-[#252b3b]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function BreakdownTable({ title, rows, labelOf }) {
  if (!rows.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-[#252b3b]">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-500/[0.04] text-[11px] uppercase tracking-[0.06em] text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">{title.replace("By ", "")}</th>
              {STATUS_COLUMNS.map((status) => <th key={status} className="px-2 py-2 text-right font-semibold">{RESULT_META[status].label}</th>)}
              <th className="px-3 py-2 text-right font-semibold">Total</th>
              <th className="w-32 px-3 py-2 font-semibold"><span className="sr-only">Distribution</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
            {rows.map((row) => (
              <tr key={labelOf(row)}>
                <td className="px-3 py-2 font-medium text-slate-800">{labelOf(row)}</td>
                {STATUS_COLUMNS.map((status) => <td key={status} className={`px-2 py-2 text-right tabular-nums ${row[status] ? "text-slate-900" : "text-slate-400"}`}>{row[status]}</td>)}
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{row.total}</td>
                <td className="px-3 py-2"><ResultBar counts={row} total={row.total} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CycleReportView({ report, users }) {
  const { run, summary } = report;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-[#252b3b]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Test cycle report</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{run.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {report.plan ? `${report.plan.name} · ` : ""}{report.release ? `Release ${report.release.version} · ` : ""}
            {optionLabel(ENVIRONMENT_OPTIONS, run.environment)} · {optionLabel(PLATFORM_OPTIONS, run.platform)}{run.build ? ` · build ${run.build}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDate(run.startDate || run.createdAt)} → {run.completedAt ? formatDate(run.completedAt) : run.dueDate ? `due ${formatDate(run.dueDate)}` : "open"} · Owner {userLabel(users, run.owner)}
          </p>
        </div>
        <Chip className={RUN_STATUS_META[run.status]?.chip}>{RUN_STATUS_META[run.status]?.label}</Chip>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Cases" value={summary.total} />
          <Stat label="Executed" value={`${summary.progress}%`} />
          <Stat label="Pass rate" value={summary.passRate === null ? "—" : `${summary.passRate}%`} tone={summary.passRate !== null && summary.passRate < 80 ? "text-red-600 dark:text-red-400" : "text-slate-900"} />
          <Stat label="Failed" value={summary.failed} tone={summary.failed ? "text-red-600 dark:text-red-400" : "text-slate-900"} />
          <Stat label="Blocked" value={summary.blocked} tone={summary.blocked ? "text-amber-600 dark:text-amber-400" : "text-slate-900"} />
          <Stat label="Time logged" value={formatDuration(report.totalDuration)} />
        </div>
        <StatusDonut distribution={report.byStatus.map((row) => ({ status: row.status, count: row.count }))} centerValue={summary.passRate === null ? "—" : `${summary.passRate}%`} centerLabel="pass rate" />
      </div>
      <BreakdownTable title="By tester" rows={report.byTester} labelOf={(row) => row.name} />
      <BreakdownTable title="By priority" rows={report.byPriority} labelOf={(row) => PRIORITY_META[row.priority]?.label || row.priority} />
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Failures & blocks <span className="font-normal text-slate-500">({report.failures.length})</span></h3>
        {report.failures.length === 0 ? <p className="text-sm text-slate-500">No failed or blocked cases.</p> : (
          <ul className="divide-y divide-slate-200/70 rounded-lg border border-slate-200/80 dark:divide-[#252b3b] dark:border-[#252b3b]">
            {report.failures.map((failure) => (
              <li key={failure.caseId} className="px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <ResultChip status={failure.status} />
                  <span className="font-mono text-[11px] text-slate-500">{failure.key}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{failure.title}</span>
                  <span className="text-xs text-slate-500">{PRIORITY_META[failure.priority]?.label}</span>
                </div>
                {(failure.actualResult || failure.comment) && <p className="mt-1 text-xs text-slate-600">{failure.actualResult || failure.comment}</p>}
                {failure.defects.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    {failure.defects.map((defect) => (
                      <span key={defect.id} className="inline-flex items-center gap-1.5 text-slate-700"><b className="font-mono text-[11px]">{taskKey(defect.id)}</b> {defect.title} <TaskStatusChip status={defect.status} /></span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ReleaseReportView({ report }) {
  const { release, quality } = report;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-[#252b3b]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Release quality report</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{release.version}{release.name ? ` — ${release.name}` : ""}</h2>
          <p className="mt-1 text-sm text-slate-600">Target {formatDate(release.releaseDate)} · {report.cycles.length} cycle{report.cycles.length !== 1 ? "s" : ""}</p>
        </div>
        <Chip className={VERDICT_CHIP[quality.verdict]}>{releaseVerdictLabel(quality.verdict)}</Chip>
      </header>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Cases in scope" value={quality.total} />
        <Stat label="Executed" value={`${quality.progress}%`} />
        <Stat label="Pass rate" value={quality.passRate === null ? "—" : `${quality.passRate}%`} tone={quality.passRate !== null && quality.passRate < 80 ? "text-red-600 dark:text-red-400" : "text-slate-900"} />
        <Stat label="Critical/high failing" value={quality.criticalFailures} tone={quality.criticalFailures ? "text-red-600 dark:text-red-400" : "text-slate-900"} />
      </div>
      <ResultBar counts={quality} total={quality.total} height="h-3" showLegend />
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Cycles</h3>
        {report.cycles.length === 0 ? <p className="text-sm text-slate-500">No cycles linked to this release yet.</p> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-[#252b3b]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-500/[0.04] text-[11px] uppercase tracking-[0.06em] text-slate-500">
                <tr><th className="px-3 py-2 font-semibold">Cycle</th><th className="px-2 py-2 font-semibold">Status</th><th className="px-2 py-2 font-semibold">Env / build</th><th className="w-40 px-2 py-2 font-semibold">Results</th><th className="px-3 py-2 text-right font-semibold">Progress</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
                {report.cycles.map(({ run, summary }) => (
                  <tr key={run.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">{run.name}</td>
                    <td className="px-2 py-2"><Chip className={RUN_STATUS_META[run.status]?.chip}>{RUN_STATUS_META[run.status]?.label}</Chip></td>
                    <td className="px-2 py-2 text-xs text-slate-600">{optionLabel(ENVIRONMENT_OPTIONS, run.environment)}{run.build ? ` · ${run.build}` : ""}</td>
                    <td className="px-2 py-2"><ResultBar counts={summary} total={summary.total} /></td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-900">{summary.progress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Failing & blocked cases <span className="font-normal text-slate-500">({report.failing.length})</span></h3>
        {report.failing.length === 0 ? <p className="text-sm text-slate-500">None — every executed case passes.</p> : (
          <ul className="divide-y divide-slate-200/70 rounded-lg border border-slate-200/80 dark:divide-[#252b3b] dark:border-[#252b3b]">
            {report.failing.map((item) => (
              <li key={item.caseId} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <ResultChip status={item.status} />
                <span className="font-mono text-[11px] text-slate-500">{item.key}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{item.title}</span>
                <span className="text-xs text-slate-500">{item.runName}</span>
                {item.defects.map((defect) => <span key={defect.id} className="font-mono text-[11px] text-red-600 dark:text-red-400">{taskKey(defect.id)}</span>)}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Open defects <span className="font-normal text-slate-500">({report.openDefects.length})</span></h3>
        {report.openDefects.length === 0 ? <p className="text-sm text-slate-500">No open defects linked to failing cases.</p> : (
          <ul className="space-y-1">
            {report.openDefects.map((defect) => (
              <li key={defect.id} className="flex items-center gap-2 text-sm"><b className="font-mono text-[11px] text-slate-500">{taskKey(defect.id)}</b><span className="text-slate-800">{defect.title}</span><TaskStatusChip status={defect.status} /></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Per-cycle and per-release reports with CSV / Markdown export and print view. */
function ReportsTab({ ws }) {
  const { data, users, nav, addToast } = ws;
  const [kind, id] = (nav.report || "").split(":");
  const releasesWithRuns = useMemo(() => data.projectReleases.filter((release) => data.plans.some((plan) => plan.releaseId === release.id) || data.runs.some((run) => run.releaseId === release.id)), [data.projectReleases, data.plans, data.runs]);
  const activeKind = kind === "release" ? "release" : "cycle";
  const selectedRun = activeKind === "cycle" ? data.runById.get(id) || data.runs[0] || null : null;
  const selectedRelease = activeKind === "release" ? data.releaseById.get(id) || releasesWithRuns[0] || data.projectReleases[0] || null : null;

  const report = useMemo(() => {
    if (activeKind === "cycle" && selectedRun) {
      const plan = selectedRun.planId ? data.planById.get(selectedRun.planId) : null;
      const release = data.releaseById.get(selectedRun.releaseId || plan?.releaseId);
      return withCaseRows(buildCycleReport(selectedRun, { caseById: data.caseById, users, taskById: data.taskById, plan, release }), data.caseById);
    }
    if (activeKind === "release" && selectedRelease) {
      return buildReleaseReport(selectedRelease, { runs: data.runs, plans: data.plans, caseById: data.caseById, taskById: data.taskById });
    }
    return null;
  }, [activeKind, selectedRun, selectedRelease, data, users]);

  const baseName = report ? `${activeKind === "cycle" ? "cycle" : "release"}-${slugify(activeKind === "cycle" ? report.run.name : report.release.version)}-${fileStamp()}` : "report";
  const markdown = () => (activeKind === "cycle" ? cycleReportMarkdown(report, { users }) : releaseReportMarkdown(report));
  const csv = () => (activeKind === "cycle" ? cycleReportCsv(report, { users }) : releaseReportCsv(report));

  if (!data.runs.length && !data.projectReleases.length) {
    return (
      <div className={CARD} data-testid="tests-reports-empty">
        <EmptyState icon={FaFileAlt} title="No reports yet" description="Reports summarize cycles and releases once you execute tests." />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tests-reports">
      <style>{PRINT_CSS}</style>
      <div className="tests-no-print flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Report type" className="inline-flex h-9 items-center rounded-lg bg-slate-900/[0.05] p-0.5 dark:bg-white/[0.06]">
          {[["cycle", "Cycle report"], ["release", "Release quality"]].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={activeKind === key} onClick={() => nav.setReport(`${key}:${key === "cycle" ? data.runs[0]?.id || "" : (releasesWithRuns[0] || data.projectReleases[0])?.id || ""}`)} className={`h-8 rounded-md px-3 text-xs font-semibold ${activeKind === key ? "bg-white/100 text-slate-900 shadow-sm dark:bg-[#2a3044] dark:text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>{label}</button>
          ))}
        </div>
        {activeKind === "cycle" ? (
          <select value={selectedRun?.id || ""} onChange={(event) => nav.setReport(`cycle:${event.target.value}`)} aria-label="Cycle" className={`${CONTROL} min-w-0 max-w-xs flex-1`} data-testid="tests-report-cycle">
            {data.runs.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}
          </select>
        ) : (
          <select value={selectedRelease?.id || ""} onChange={(event) => nav.setReport(`release:${event.target.value}`)} aria-label="Release" className={`${CONTROL} min-w-0 max-w-xs flex-1`}>
            {data.projectReleases.map((release) => <option key={release.id} value={release.id}>{release.version}{release.name ? ` — ${release.name}` : ""}</option>)}
          </select>
        )}
        <div className="flex-1" />
        {report && (
          <>
            <button type="button" onClick={() => { const ok = downloadTextFile(`${baseName}.csv`, csv(), "text/csv"); addToast(ok ? "Report exported as CSV" : "Export failed", ok ? "success" : "error"); }} className={BTN_SM} data-testid="tests-report-csv"><FaFileCsv className="h-3 w-3" /> CSV</button>
            <button type="button" onClick={() => { const ok = downloadTextFile(`${baseName}.md`, markdown(), "text/markdown"); addToast(ok ? "Report exported as Markdown" : "Export failed", ok ? "success" : "error"); }} className={BTN_SM} data-testid="tests-report-md"><FaMarkdown className="h-3 w-3" /> Markdown</button>
            <button type="button" onClick={async () => { const ok = await copyText(markdown()); addToast(ok ? "Markdown copied to clipboard" : "Couldn't copy to clipboard", ok ? "success" : "error"); }} className={BTN_SM}><FaCopy className="h-3 w-3" /> Copy</button>
            <button type="button" onClick={() => window.print()} className={BTN_SECONDARY} data-testid="tests-report-print"><FaPrint className="h-3 w-3" /> Print</button>
          </>
        )}
      </div>
      {!report ? (
        <div className={CARD}><EmptyState compact title={activeKind === "cycle" ? "No cycles yet" : "No releases"} /></div>
      ) : (
        <article className={`${CARD} tests-print-area p-5 md:p-8`} data-testid="tests-report-document">
          {activeKind === "cycle" ? <CycleReportView report={report} users={users} /> : <ReleaseReportView report={report} />}
        </article>
      )}
    </div>
  );
}

export default memo(ReportsTab);
