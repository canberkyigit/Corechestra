// Cycle and release quality reports (data, Markdown, CSV). Pure.
import {
  PRIORITY_META,
  RESULT_META,
  RESULT_ORDER,
  RUN_STATUS_META,
} from "../constants/testingConstants";
import { taskKey } from "../../../shared/utils/helpers";
import { toCsv } from "./testingCsv";
import { formatDate, formatDuration, toTimestamp, userLabel } from "./testingFormat";
import { assigneeOf, getResultMap, latestResultsByCase, releaseQuality, selectReleaseRuns, summarizeRun } from "./testingMetrics";

const PRIORITIES = ["critical", "high", "medium", "low"];

function defectRef(id, taskById) {
  const task = taskById.get(String(id));
  return { ...(task || { id, title: "Unknown task", status: null }), key: taskKey(id) };
}
const STATUSES = RESULT_ORDER;

function emptyStatusRow() {
  return Object.fromEntries(STATUSES.map((status) => [status, 0]));
}

/** Everything a cycle report shows. */
export function buildCycleReport(run, { caseById = new Map(), users = [], taskById = new Map(), plan = null, release = null } = {}) {
  const summary = summarizeRun(run);
  const resultMap = getResultMap(run);
  const byTester = new Map();
  const byPriority = new Map(PRIORITIES.map((priority) => [priority, { priority, ...emptyStatusRow(), total: 0 }]));
  const failures = [];
  let totalDuration = 0;
  (run.caseIds || []).forEach((caseId) => {
    const testCase = caseById.get(caseId);
    const result = resultMap.get(caseId);
    const status = result?.status || "untested";
    const tester = result?.executedBy || assigneeOf(run, caseId) || "unassigned";
    const testerRow = byTester.get(tester) || { tester, name: tester === "unassigned" ? "Unassigned" : userLabel(users, tester), ...emptyStatusRow(), total: 0 };
    testerRow[status] += 1;
    testerRow.total += 1;
    byTester.set(tester, testerRow);
    const priorityRow = byPriority.get(testCase?.priority || "medium");
    if (priorityRow) {
      priorityRow[status] += 1;
      priorityRow.total += 1;
    }
    if (Number.isFinite(result?.durationSec)) totalDuration += result.durationSec;
    if (status === "failed" || status === "blocked") {
      failures.push({
        caseId,
        key: testCase?.key || "",
        title: testCase?.title || "Deleted case",
        priority: testCase?.priority || "medium",
        status,
        comment: result?.comment || "",
        actualResult: result?.actualResult || "",
        executedBy: result?.executedBy || null,
        executedAt: result?.executedAt || null,
        defects: (result?.defects || []).map((id) => defectRef(id, taskById)),
      });
    }
  });
  failures.sort((a, b) => (PRIORITY_META[a.priority]?.rank ?? 9) - (PRIORITY_META[b.priority]?.rank ?? 9));
  return {
    run,
    plan,
    release,
    summary,
    totalDuration,
    byStatus: STATUSES.map((status) => ({ status, label: RESULT_META[status].label, count: summary[status] || 0 })),
    byTester: [...byTester.values()].sort((a, b) => b.total - a.total),
    byPriority: [...byPriority.values()].filter((row) => row.total > 0),
    failures,
  };
}

function mdTable(header, rows) {
  const escape = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [
    `| ${header.map(escape).join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escape).join(" | ")} |`),
  ].join("\n");
}

const statusColumns = ["passed", "failed", "blocked", "retest", "skipped", "untested"];

export function cycleReportMarkdown(report, { users = [] } = {}) {
  const { run, summary } = report;
  const lines = [
    `# Test cycle report — ${run.name}`,
    "",
    [
      `**Status:** ${RUN_STATUS_META[run.status]?.label || run.status}`,
      report.plan ? `**Plan:** ${report.plan.name}` : null,
      report.release ? `**Release:** ${report.release.version || report.release.name}` : null,
      run.environment ? `**Environment:** ${run.environment}` : null,
      run.build ? `**Build:** ${run.build}` : null,
      run.platform ? `**Platform:** ${run.platform}` : null,
    ].filter(Boolean).join(" · "),
    `**Created:** ${formatDate(run.createdAt)}${run.dueDate ? ` · **Due:** ${formatDate(run.dueDate)}` : ""}${run.completedAt ? ` · **Closed:** ${formatDate(run.completedAt)}` : ""} · **Owner:** ${userLabel(users, run.owner)}`,
    "",
    "## Summary",
    "",
    `- Cases in scope: **${summary.total}**`,
    `- Executed: **${summary.executed}** (${summary.progress}%)`,
    `- Pass rate: **${summary.passRate === null ? "—" : `${summary.passRate}%`}**`,
    `- Execution time logged: **${formatDuration(report.totalDuration)}**`,
    "",
    "## Results by status",
    "",
    mdTable(["Status", "Cases"], report.byStatus.map((row) => [row.label, row.count])),
    "",
    "## By tester",
    "",
    mdTable(["Tester", ...statusColumns.map((status) => RESULT_META[status].label), "Total"], report.byTester.map((row) => [row.name, ...statusColumns.map((status) => row[status]), row.total])),
    "",
    "## By priority",
    "",
    mdTable(["Priority", ...statusColumns.map((status) => RESULT_META[status].label), "Total"], report.byPriority.map((row) => [PRIORITY_META[row.priority]?.label || row.priority, ...statusColumns.map((status) => row[status]), row.total])),
    "",
    "## Failures & blocks",
    "",
  ];
  if (!report.failures.length) lines.push("No failed or blocked cases.");
  else {
    lines.push(mdTable(
      ["Case", "Title", "Priority", "Result", "Defects", "Notes"],
      report.failures.map((failure) => [
        failure.key,
        failure.title,
        PRIORITY_META[failure.priority]?.label || failure.priority,
        RESULT_META[failure.status].label,
        failure.defects.map((defect) => defect.key || defect.id).join(", ") || "—",
        failure.comment || failure.actualResult || "",
      ])
    ));
  }
  return `${lines.join("\n")}\n`;
}

export function cycleReportCsv(report, { users = [] } = {}) {
  const { run } = report;
  const resultMap = getResultMap(run);
  const rows = [["Case", "Title", "Priority", "Result", "Tester", "Executed at", "Duration (s)", "Defects", "Comment", "Actual result"]];
  const caseRows = report.caseRows || [];
  (caseRows.length ? caseRows : run.caseIds.map((caseId) => ({ caseId }))).forEach(({ caseId, key, title, priority }) => {
    const result = resultMap.get(caseId);
    rows.push([
      key || caseId,
      title || "",
      priority || "",
      RESULT_META[result?.status || "untested"].label,
      result?.executedBy ? userLabel(users, result.executedBy) : userLabel(users, assigneeOf(run, caseId)),
      result?.executedAt || "",
      result?.durationSec ?? "",
      (result?.defects || []).map(taskKey).join(" "),
      result?.comment || "",
      result?.actualResult || "",
    ]);
  });
  return toCsv(rows);
}

/** Adds display rows for CSV export (needs case lookups). */
export function withCaseRows(report, caseById) {
  return {
    ...report,
    caseRows: report.run.caseIds.map((caseId) => {
      const testCase = caseById.get(caseId);
      return { caseId, key: testCase?.key, title: testCase?.title || "Deleted case", priority: testCase?.priority };
    }),
  };
}

/** Release-level quality report across all cycles linked to the release. */
export function buildReleaseReport(release, { runs = [], plans = [], caseById = new Map(), taskById = new Map() } = {}) {
  const quality = releaseQuality(release.id, { runs, plans, caseById });
  const releaseRuns = selectReleaseRuns(release.id, runs, plans)
    .slice()
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt));
  const latest = latestResultsByCase(releaseRuns);
  const failing = [];
  latest.forEach((entry, caseId) => {
    if (entry.status !== "failed" && entry.status !== "blocked") return;
    const testCase = caseById.get(caseId);
    failing.push({
      caseId,
      key: testCase?.key || "",
      title: testCase?.title || "Deleted case",
      priority: testCase?.priority || "medium",
      status: entry.status,
      runName: entry.runName,
      defects: (entry.defects || []).map((id) => defectRef(id, taskById)),
    });
  });
  failing.sort((a, b) => (PRIORITY_META[a.priority]?.rank ?? 9) - (PRIORITY_META[b.priority]?.rank ?? 9));
  const openDefects = new Map();
  failing.forEach((item) => item.defects.forEach((defect) => {
    if (defect.status !== "done") openDefects.set(String(defect.id), defect);
  }));
  return {
    release,
    quality,
    cycles: releaseRuns.map((run) => ({ run, summary: summarizeRun(run) })),
    failing,
    openDefects: [...openDefects.values()],
  };
}

const VERDICT_LABEL = { ready: "Ready to ship", "in-progress": "Testing in progress", "at-risk": "At risk", "no-data": "No test data" };
export const releaseVerdictLabel = (verdict) => VERDICT_LABEL[verdict] || verdict;

export function releaseReportMarkdown(report) {
  const { release, quality } = report;
  const lines = [
    `# Release quality report — ${release.version || release.name}${release.name && release.version ? ` (${release.name})` : ""}`,
    "",
    `**Verdict:** ${releaseVerdictLabel(quality.verdict)} · **Pass rate:** ${quality.passRate === null ? "—" : `${quality.passRate}%`} · **Executed:** ${quality.executed}/${quality.total} (${quality.progress}%)`,
    "",
    "## Cycles",
    "",
    report.cycles.length
      ? mdTable(["Cycle", "Status", "Environment", "Build", "Passed", "Failed", "Blocked", "Untested", "Progress"], report.cycles.map(({ run, summary }) => [
        run.name, RUN_STATUS_META[run.status]?.label || run.status, run.environment || "—", run.build || "—",
        summary.passed, summary.failed, summary.blocked, summary.untested + summary.retest, `${summary.progress}%`,
      ]))
      : "No cycles linked to this release.",
    "",
    "## Failing & blocked cases",
    "",
    report.failing.length
      ? mdTable(["Case", "Title", "Priority", "Result", "Cycle", "Defects"], report.failing.map((item) => [
        item.key, item.title, PRIORITY_META[item.priority]?.label || item.priority, RESULT_META[item.status].label, item.runName || "", item.defects.map((defect) => defect.key || defect.id).join(", ") || "—",
      ]))
      : "None.",
    "",
    "## Open defects",
    "",
    report.openDefects.length ? report.openDefects.map((defect) => `- ${defect.key || defect.id} ${defect.title}`).join("\n") : "None.",
  ];
  return `${lines.join("\n")}\n`;
}

export function releaseReportCsv(report) {
  const rows = [["Cycle", "Status", "Environment", "Build", "Total", "Passed", "Failed", "Blocked", "Retest", "Skipped", "Untested", "Progress %", "Pass rate %"]];
  report.cycles.forEach(({ run, summary }) => rows.push([
    run.name, RUN_STATUS_META[run.status]?.label || run.status, run.environment || "", run.build || "",
    summary.total, summary.passed, summary.failed, summary.blocked, summary.retest, summary.skipped, summary.untested, summary.progress, summary.passRate ?? "",
  ]));
  return toCsv(rows);
}
