export function useAutomationApi({
  automationRules,
  automationLog,
  automationActions,
}) {
  return {
    automationRules,
    automationLog,
    createAutomationRule: automationActions.createAutomationRule,
    updateAutomationRule: automationActions.updateAutomationRule,
    toggleAutomationRule: automationActions.toggleAutomationRule,
    duplicateAutomationRule: automationActions.duplicateAutomationRule,
    deleteAutomationRule: automationActions.deleteAutomationRule,
    clearAutomationLog: automationActions.clearAutomationLog,
  };
}
