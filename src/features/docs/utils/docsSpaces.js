/** Spaces without a projectId are shared across projects (legacy data). */
export function isSpaceVisibleInProject(space, projectId) {
  return !space?.projectId || !projectId || space.projectId === projectId;
}
