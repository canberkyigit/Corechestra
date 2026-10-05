export function useStrategyApi({
  goals,
  projectStatusUpdates,
  strategyActions,
}) {
  return {
    goals,
    projectStatusUpdates,
    createGoal: strategyActions.createGoal,
    updateGoal: strategyActions.updateGoal,
    deleteGoal: strategyActions.deleteGoal,
    updateKeyResult: strategyActions.updateKeyResult,
    addGoalCheckIn: strategyActions.addGoalCheckIn,
    importGoals: strategyActions.importGoals,
    removeSampleGoals: strategyActions.removeSampleGoals,
    postProjectStatusUpdate: strategyActions.postProjectStatusUpdate,
    deleteProjectStatusUpdate: strategyActions.deleteProjectStatusUpdate,
  };
}
