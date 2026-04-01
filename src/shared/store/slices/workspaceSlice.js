import { createFieldSetter } from "../createStoreSetters";

export const workspaceInitialState = {
  projects: [],
  currentProjectId: "",
  epics: [],
  labels: [],
  projectColumns: {},
  currentUser: "",
  teams: [],
  users: [],
  deletedUserIds: [],
};

export function createWorkspaceSlice(set) {
  return {
    ...workspaceInitialState,
    setProjects: createFieldSetter("projects", set),
    setCurrentProjectId: createFieldSetter("currentProjectId", set),
    setEpics: createFieldSetter("epics", set),
    setLabels: createFieldSetter("labels", set),
    setProjectColumns: createFieldSetter("projectColumns", set),
    setCurrentUser: createFieldSetter("currentUser", set),
    setTeams: createFieldSetter("teams", set),
    setUsers: createFieldSetter("users", set),
    setDeletedUserIds: createFieldSetter("deletedUserIds", set),
  };
}
