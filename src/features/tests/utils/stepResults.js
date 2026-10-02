// Execution helpers: expanding shared steps and deriving a case verdict
// from per-step results.

/**
 * Expands `{ sharedStepsId }` references into the shared group's steps.
 * Expanded step ids are `<caseStepId>::<sharedStepId>` so step results stay
 * attached even if the same group is called twice in one case.
 * Returns [{ id, action, data, expected, shared?: { id, name, first, last } , missing? }].
 */
export function expandCaseSteps(testCase, sharedById = new Map()) {
  const out = [];
  (testCase?.steps || []).forEach((step) => {
    if (!step.sharedStepsId) {
      out.push(step);
      return;
    }
    const group = sharedById.get(step.sharedStepsId);
    if (!group || !(group.steps || []).length) {
      out.push({
        id: step.id,
        action: group ? `Shared steps "${group.name}" (empty)` : "Shared steps not found (deleted)",
        data: "",
        expected: "",
        missing: true,
        shared: { id: step.sharedStepsId, name: group?.name || "Missing", first: true, last: true },
      });
      return;
    }
    group.steps.forEach((inner, index) => {
      out.push({
        ...inner,
        id: `${step.id}::${inner.id}`,
        shared: { id: group.id, name: group.name, first: index === 0, last: index === group.steps.length - 1 },
      });
    });
  });
  return out;
}

/**
 * Suggested overall verdict from step results (overridable by the tester):
 * - any failed  → failed
 * - any blocked → blocked
 * - every applicable step passed (N/A ignored) → passed
 * - every step skipped / N/A → skipped
 * - otherwise (incomplete) → null
 */
export function suggestOverallStatus(steps = [], stepResults = []) {
  if (!steps.length) return null;
  const byId = new Map((stepResults || []).map((result) => [result.stepId, result.status]));
  const statuses = steps.map((step) => byId.get(step.id) || "untested");
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("untested")) return null;
  const applicable = statuses.filter((status) => status !== "na");
  if (!applicable.length) return "skipped";
  if (applicable.every((status) => status === "passed")) return "passed";
  if (applicable.every((status) => status === "skipped")) return "skipped";
  return "passed";
}

/** First failed step (for defect prefill). */
export function firstFailedStep(steps = [], stepResults = []) {
  const byId = new Map((stepResults || []).map((result) => [result.stepId, result]));
  const index = steps.findIndex((step) => byId.get(step.id)?.status === "failed");
  return index === -1 ? null : { step: steps[index], index, result: byId.get(steps[index].id) };
}

/** Description for a defect created from a failed execution (markdown-ish plain text). */
export function buildDefectDescription({ testCase, run, steps = [], stepResults = [], failedStepId = null, actualResult = "", comment = "" }) {
  const byId = new Map((stepResults || []).map((result) => [result.stepId, result]));
  const lines = [];
  lines.push(`Found while executing ${testCase.key ? `${testCase.key} ` : ""}"${testCase.title}" in cycle "${run?.name || "—"}".`);
  const envBits = [
    run?.environment && `Environment: ${run.environment}`,
    run?.platform && `Platform: ${run.platform}`,
    run?.build && `Build: ${run.build}`,
  ].filter(Boolean);
  if (envBits.length) lines.push(envBits.join(" · "));
  if (testCase.preconditions) lines.push("", "Preconditions:", testCase.preconditions);
  if (steps.length) {
    lines.push("", "Steps to reproduce:");
    steps.forEach((step, index) => {
      const result = byId.get(step.id);
      const marker = step.id === failedStepId ? "  ← failed" : "";
      lines.push(`${index + 1}. ${step.action || "(no action)"}${step.data ? ` [data: ${step.data}]` : ""}${marker}`);
      if (step.id === failedStepId || result?.status === "failed") {
        if (step.expected) lines.push(`   Expected: ${step.expected}`);
        if (result?.actual) lines.push(`   Actual: ${result.actual}`);
      }
    });
  }
  if (testCase.expectedResult) lines.push("", `Expected result: ${testCase.expectedResult}`);
  if (actualResult) lines.push(`Actual result: ${actualResult}`);
  if (comment) lines.push("", `Tester notes: ${comment}`);
  return lines.join("\n");
}
