import { createFieldSetter } from "../createStoreSetters";

export const automationInitialState = {
  automationRules: [],
  automationLog: [],
};

export function createAutomationSlice(set) {
  return {
    ...automationInitialState,
    setAutomationRules: createFieldSetter("automationRules", set),
    setAutomationLog: createFieldSetter("automationLog", set),
  };
}
