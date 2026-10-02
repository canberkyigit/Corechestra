import { buildDefectDescription, expandCaseSteps, firstFailedStep, suggestOverallStatus } from "./stepResults";

const shared = new Map([["g1", { id: "g1", name: "Login", steps: [{ id: "x", action: "Open" }, { id: "y", action: "Sign in" }] }]]);

describe("stepResults", () => {
  it("expands shared step references with composite ids", () => {
    const steps = expandCaseSteps({ steps: [{ id: "s1", sharedStepsId: "g1" }, { id: "s2", action: "Pay" }, { id: "s3", sharedStepsId: "gone" }] }, shared);
    expect(steps.map((step) => step.id)).toEqual(["s1::x", "s1::y", "s2", "s3"]);
    expect(steps[0].shared).toEqual({ id: "g1", name: "Login", first: true, last: false });
    expect(steps[3].missing).toBe(true);
  });

  it("suggests the overall verdict from step results", () => {
    const steps = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(suggestOverallStatus(steps, [])).toBeNull();
    expect(suggestOverallStatus(steps, [{ stepId: "a", status: "passed" }])).toBeNull();
    expect(suggestOverallStatus(steps, [{ stepId: "a", status: "passed" }, { stepId: "b", status: "failed" }])).toBe("failed");
    expect(suggestOverallStatus(steps, [{ stepId: "a", status: "blocked" }])).toBe("blocked");
    expect(suggestOverallStatus(steps, ["a", "b", "c"].map((stepId) => ({ stepId, status: "passed" })))).toBe("passed");
    expect(suggestOverallStatus(steps, [{ stepId: "a", status: "passed" }, { stepId: "b", status: "na" }, { stepId: "c", status: "passed" }])).toBe("passed");
    expect(suggestOverallStatus(steps, ["a", "b", "c"].map((stepId) => ({ stepId, status: "na" })))).toBe("skipped");
    expect(suggestOverallStatus([], [])).toBeNull();
  });

  it("finds the first failed step and builds a defect description", () => {
    const steps = [{ id: "a", action: "Open", expected: "Form" }, { id: "b", action: "Submit", data: "x", expected: "Saved" }];
    const results = [{ stepId: "a", status: "passed" }, { stepId: "b", status: "failed", actual: "500 error" }];
    expect(firstFailedStep(steps, results)).toEqual(expect.objectContaining({ index: 1 }));
    const text = buildDefectDescription({
      testCase: { key: "TC-4", title: "Save", preconditions: "Logged in" }, run: { name: "RC1", environment: "staging", build: "1.0" }, steps, stepResults: results, failedStepId: "b", comment: "flaky?",
    });
    expect(text).toContain('TC-4 "Save" in cycle "RC1"');
    expect(text).toContain("Environment: staging");
    expect(text).toContain("2. Submit [data: x]  ← failed");
    expect(text).toContain("Actual: 500 error");
    expect(text).toContain("Tester notes: flaky?");
  });
});
