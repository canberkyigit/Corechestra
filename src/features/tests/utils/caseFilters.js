// Repository filtering & sorting (pure).
import { PRIORITY_META, RESULT_ORDER } from "../constants/testingConstants";
import { parseCaseKey } from "./caseKeys";
import { siblingSort } from "./testingTree";
import { toTimestamp } from "./testingFormat";

export const EMPTY_CASE_FILTERS = {
  query: "",
  priority: [],
  type: [],
  automation: [],
  status: [],
  lastResult: [],
  owner: [],
  tags: [],
};

export function countActiveFilters(filters) {
  return ["priority", "type", "automation", "status", "lastResult", "owner", "tags"].reduce((sum, key) => sum + ((filters[key] || []).length ? 1 : 0), 0);
}

export function effectiveResult(testCase, latestMap) {
  return latestMap?.get(testCase.id)?.status || testCase.legacyResult || "untested";
}

/**
 * Filters cases. `folderIds` (Set) limits to a folder subtree; null = all.
 * Query matches key ("TC-12" / "12"), title, tags, preconditions and step text.
 */
export function filterCases(cases, filters = EMPTY_CASE_FILTERS, { latestMap = new Map(), folderIds = null } = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  const keySeq = parseCaseKey(query);
  const has = (list, value) => !list?.length || list.includes(value);
  return cases.filter((testCase) => {
    if (folderIds && !folderIds.has(testCase.suiteId)) return false;
    if (!has(filters.priority, testCase.priority)) return false;
    if (!has(filters.type, testCase.type)) return false;
    if (!has(filters.automation, testCase.automation)) return false;
    if (!has(filters.status, testCase.status)) return false;
    if (filters.owner?.length && !filters.owner.includes(testCase.owner || "__none__")) return false;
    if (filters.tags?.length && !filters.tags.some((tag) => testCase.tags.includes(tag))) return false;
    if (filters.lastResult?.length && !filters.lastResult.includes(effectiveResult(testCase, latestMap))) return false;
    if (!query) return true;
    if (keySeq !== null && testCase.displaySeq === keySeq) return true;
    if (testCase.title.toLowerCase().includes(query)) return true;
    if ((testCase.key || "").toLowerCase() === query) return true;
    if (testCase.tags.some((tag) => tag.toLowerCase().includes(query))) return true;
    if (testCase.preconditions.toLowerCase().includes(query)) return true;
    return testCase.steps.some((step) => `${step.action} ${step.expected}`.toLowerCase().includes(query));
  });
}

const RESULT_RANK = Object.fromEntries(["failed", "blocked", "retest", "untested", "skipped", "passed"].map((status, index) => [status, index]));

/** Sorts a copy. "order" = folder order (by tree position), then manual order. */
export function sortCases(cases, sort = { by: "order", dir: "asc" }, { latestMap = new Map(), folderRank = new Map() } = {}) {
  const dir = sort.dir === "desc" ? -1 : 1;
  const list = [...cases];
  const compare = {
    order: (a, b) => ((folderRank.get(a.suiteId) ?? 0) - (folderRank.get(b.suiteId) ?? 0)) || siblingSort(a, b),
    key: (a, b) => (a.displaySeq || 0) - (b.displaySeq || 0),
    title: (a, b) => a.title.localeCompare(b.title),
    priority: (a, b) => (PRIORITY_META[a.priority]?.rank ?? 9) - (PRIORITY_META[b.priority]?.rank ?? 9),
    status: (a, b) => a.status.localeCompare(b.status),
    owner: (a, b) => String(a.owner || "~").localeCompare(String(b.owner || "~")),
    updated: (a, b) => toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt),
    lastResult: (a, b) => (RESULT_RANK[effectiveResult(a, latestMap)] ?? 9) - (RESULT_RANK[effectiveResult(b, latestMap)] ?? 9),
  }[sort.by] || ((a, b) => siblingSort(a, b));
  return list.sort((a, b) => (compare(a, b) * dir) || ((a.displaySeq || 0) - (b.displaySeq || 0)));
}

/** Facet options with counts for the filter menus. */
export function buildFacetCounts(cases, latestMap) {
  const counts = { priority: {}, type: {}, automation: {}, status: {}, lastResult: {}, owner: {}, tags: {} };
  cases.forEach((testCase) => {
    counts.priority[testCase.priority] = (counts.priority[testCase.priority] || 0) + 1;
    counts.type[testCase.type] = (counts.type[testCase.type] || 0) + 1;
    counts.automation[testCase.automation] = (counts.automation[testCase.automation] || 0) + 1;
    counts.status[testCase.status] = (counts.status[testCase.status] || 0) + 1;
    const result = effectiveResult(testCase, latestMap);
    counts.lastResult[result] = (counts.lastResult[result] || 0) + 1;
    const owner = testCase.owner || "__none__";
    counts.owner[owner] = (counts.owner[owner] || 0) + 1;
    testCase.tags.forEach((tag) => { counts.tags[tag] = (counts.tags[tag] || 0) + 1; });
  });
  return counts;
}

export const RESULT_FILTER_ORDER = RESULT_ORDER;
