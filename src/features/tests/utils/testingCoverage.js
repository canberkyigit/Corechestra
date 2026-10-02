// Requirement traceability (requirements × test coverage).
import { REQUIREMENT_TYPES } from "../constants/testingConstants";

/**
 * Coverage state of one requirement from the latest verdicts of its cases:
 * not-covered (no cases) · not-run (no verdicts) · failing (any failed/blocked)
 * · passing (all passed) · partial (mixed passed/untested/skipped/retest).
 */
export function coverageStatus(counts, caseCount) {
  if (!caseCount) return "not-covered";
  if (counts.failed + counts.blocked > 0) return "failing";
  const executed = counts.passed + counts.skipped;
  if (executed === 0 && counts.retest === 0) return "not-run";
  if (counts.passed === caseCount) return "passing";
  return "partial";
}

/**
 * Rows for every requirement-type task (user story / feature / epic) of the
 * project plus any other task a case links to as a requirement.
 * Cases pointing at unknown tasks are reported in `orphanCaseIds`.
 */
export function buildTraceability({ cases = [], tasks = [], latestMap = new Map(), requirementTypes = REQUIREMENT_TYPES } = {}) {
  const taskById = new Map(tasks.map((task) => [String(task.id), task]));
  const casesByReq = new Map();
  const orphanCaseIds = [];
  cases.forEach((testCase) => {
    (testCase.requirementIds || []).forEach((reqId) => {
      const key = String(reqId);
      if (!taskById.has(key)) {
        orphanCaseIds.push(testCase.id);
        return;
      }
      const list = casesByReq.get(key) || [];
      list.push(testCase);
      casesByReq.set(key, list);
    });
  });

  const rows = [];
  const seen = new Set();
  const pushRow = (task) => {
    const key = String(task.id);
    if (seen.has(key)) return;
    seen.add(key);
    const linked = casesByReq.get(key) || [];
    const counts = { passed: 0, failed: 0, blocked: 0, skipped: 0, retest: 0, untested: 0 };
    linked.forEach((testCase) => {
      const status = latestMap.get(testCase.id)?.status || testCase.legacyResult || "untested";
      counts[counts[status] === undefined ? "untested" : status] += 1;
    });
    rows.push({
      task,
      caseIds: linked.map((testCase) => testCase.id),
      caseCount: linked.length,
      counts,
      coverage: coverageStatus(counts, linked.length),
    });
  };
  tasks.forEach((task) => {
    if (requirementTypes.includes(task.type)) pushRow(task);
  });
  casesByReq.forEach((_list, key) => pushRow(taskById.get(key)));

  const summary = { total: rows.length, covered: 0, passing: 0, failing: 0, notCovered: 0, notRun: 0, partial: 0 };
  rows.forEach((row) => {
    if (row.caseCount) summary.covered += 1;
    if (row.coverage === "passing") summary.passing += 1;
    if (row.coverage === "failing") summary.failing += 1;
    if (row.coverage === "not-covered") summary.notCovered += 1;
    if (row.coverage === "not-run") summary.notRun += 1;
    if (row.coverage === "partial") summary.partial += 1;
  });
  summary.coveragePercent = summary.total ? Math.round((summary.covered / summary.total) * 100) : 0;
  return { rows, summary, orphanCaseIds: [...new Set(orphanCaseIds)] };
}

const COVERAGE_RANK = { failing: 0, "not-covered": 1, partial: 2, "not-run": 3, passing: 4 };

export function sortTraceRows(rows, sort = "risk") {
  const list = [...rows];
  if (sort === "title") return list.sort((a, b) => String(a.task.title).localeCompare(String(b.task.title)));
  if (sort === "cases") return list.sort((a, b) => b.caseCount - a.caseCount);
  return list.sort((a, b) => (COVERAGE_RANK[a.coverage] - COVERAGE_RANK[b.coverage]) || String(a.task.title).localeCompare(String(b.task.title)));
}
