// Project-scoped human keys for test cases (`TC-142`).
// New cases persist `seq` (assigned by the facade from fresh store state).
// Legacy cases without `seq` get stable display numbers after the highest
// persisted one, ordered by creation time then id. Duplicated persisted
// numbers (two clients creating at once) are re-numbered for display only.
import { CASE_KEY_PREFIX } from "../constants/testingConstants";
import { toTimestamp } from "./testingFormat";

export function formatCaseKey(seq) {
  return Number.isFinite(seq) ? `${CASE_KEY_PREFIX}-${seq}` : `${CASE_KEY_PREFIX}-?`;
}

/** Map caseId → display sequence for one project's cases. */
export function assignDisplaySeqs(cases = []) {
  const result = new Map();
  const used = new Set();
  let max = 0;
  const byCreation = [...cases].sort((a, b) => (toTimestamp(a.createdAt) - toTimestamp(b.createdAt)) || String(a.id).localeCompare(String(b.id)));
  const pending = [];
  byCreation.forEach((testCase) => {
    if (Number.isFinite(testCase.seq) && testCase.seq > 0 && !used.has(testCase.seq)) {
      used.add(testCase.seq);
      result.set(testCase.id, testCase.seq);
      if (testCase.seq > max) max = testCase.seq;
    } else {
      pending.push(testCase);
    }
  });
  pending.forEach((testCase) => {
    max += 1;
    result.set(testCase.id, max);
  });
  return result;
}

/** Parses "TC-12" / "tc12" / "12" → 12, else null. */
export function parseCaseKey(text) {
  const match = String(text || "").trim().match(new RegExp(`^(?:${CASE_KEY_PREFIX}-?)?(\\d+)$`, "i"));
  return match ? Number(match[1]) : null;
}
