import { createFieldSetter } from "../createStoreSetters";

export const testingInitialState = {
  releases: [],
  testPlans: [],
  testSuites: [],
  testCases: [],
  testRuns: [],
  // Reusable step groups referenced by test cases (`steps[].sharedStepsId`).
  testSharedSteps: [],
};

export function createTestingSlice(set) {
  return {
    ...testingInitialState,
    setReleases: createFieldSetter("releases", set),
    setTestPlans: createFieldSetter("testPlans", set),
    setTestSuites: createFieldSetter("testSuites", set),
    setTestCases: createFieldSetter("testCases", set),
    setTestRuns: createFieldSetter("testRuns", set),
    setTestSharedSteps: createFieldSetter("testSharedSteps", set),
  };
}
