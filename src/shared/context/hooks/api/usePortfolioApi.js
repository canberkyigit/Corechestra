export function usePortfolioApi({
  projectStatusUpdates,
  portfolioActions,
}) {
  return {
    projectStatusUpdates,
    postProjectStatusUpdate: portfolioActions.postProjectStatusUpdate,
    deleteProjectStatusUpdate: portfolioActions.deleteProjectStatusUpdate,
  };
}
