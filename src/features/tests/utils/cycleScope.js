// Cycle creation helpers: scope selection and tester assignment (pure).
import { getDescendantIds } from "./testingTree";
import { filterCases, sortCases } from "./caseFilters";

export const DEFAULT_SCOPE = {
  folders: [],
  priority: [],
  type: [],
  automation: [],
  status: ["ready", "needs-update"],
  tags: [],
  lastResult: [],
};

/**
 * Cases matching a wizard scope. Folder selection includes sub-folders.
 * `explicitIds` (e.g. from a bulk selection) override the filters.
 */
export function resolveScope(cases, scope, { tree, explicitIds = null, excluded = new Set(), latestMap = new Map(), folderRank = new Map() } = {}) {
  let list;
  if (explicitIds?.length) {
    const ids = new Set(explicitIds);
    list = cases.filter((testCase) => ids.has(testCase.id));
  } else {
    let folderIds = null;
    if (scope.folders?.length) {
      folderIds = new Set();
      scope.folders.forEach((id) => getDescendantIds(id, tree.childrenById).forEach((child) => folderIds.add(child)));
    }
    list = filterCases(cases, { query: "", owner: [], ...scope }, { latestMap, folderIds });
  }
  return sortCases(list.filter((testCase) => !excluded.has(testCase.id)), { by: "order", dir: "asc" }, { latestMap, folderRank });
}

/**
 * Assignment map { caseId: username }:
 * - "single": everyone → defaultTester
 * - "round-robin": cycle through `testers` in case order
 * - "owner": the case owner when they are in `testers` (or any owner when
 *   `testers` is empty), else defaultTester
 */
export function assignTesters(cases, { strategy = "single", testers = [], defaultTester = null } = {}) {
  const assignments = {};
  const pool = testers.filter(Boolean);
  cases.forEach((testCase, index) => {
    let user = defaultTester || null;
    if (strategy === "round-robin" && pool.length) user = pool[index % pool.length];
    if (strategy === "owner") {
      const owner = testCase.owner;
      user = owner && (!pool.length || pool.includes(owner)) ? owner : defaultTester || null;
    }
    if (user) assignments[testCase.id] = user;
  });
  return assignments;
}

export function assignmentDistribution(assignments, caseIds) {
  const map = new Map();
  caseIds.forEach((caseId) => {
    const user = assignments[caseId] || null;
    map.set(user, (map.get(user) || 0) + 1);
  });
  return [...map.entries()].map(([user, count]) => ({ user, count })).sort((a, b) => b.count - a.count);
}
