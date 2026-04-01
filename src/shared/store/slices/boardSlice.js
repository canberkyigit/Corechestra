import { DEFAULT_SPRINT_DEFAULTS } from "../../context/AppSeeds";
import { createFieldSetter } from "../createStoreSetters";

export const boardInitialState = {
  perProjectSprint: {},
  activeTasks: [],
  perProjectBacklog: {},
  perProjectRetrospective: {},
  perProjectPokerHistory: {},
  perProjectNotes: {},
  perProjectBoardSettings: {},
  globalActivityLog: [],
  notifications: [],
  perProjectBurndownSnapshots: {},
  sprintDefaults: { ...DEFAULT_SPRINT_DEFAULTS },
  perProjectCompletedSprints: {},
  perProjectPlannedSprints: {},
  archivedTasks: [],
  archivedProjects: [],
  archivedEpics: [],
};

export function createBoardSlice(set) {
  return {
    ...boardInitialState,
    setPerProjectSprint: createFieldSetter("perProjectSprint", set),
    setActiveTasks: createFieldSetter("activeTasks", set),
    setPerProjectBacklog: createFieldSetter("perProjectBacklog", set),
    setPerProjectRetrospective: createFieldSetter("perProjectRetrospective", set),
    setPerProjectPokerHistory: createFieldSetter("perProjectPokerHistory", set),
    setPerProjectNotes: createFieldSetter("perProjectNotes", set),
    setPerProjectBoardSettings: createFieldSetter("perProjectBoardSettings", set),
    setGlobalActivityLog: createFieldSetter("globalActivityLog", set),
    setNotifications: createFieldSetter("notifications", set),
    setPerProjectBurndownSnapshots: createFieldSetter("perProjectBurndownSnapshots", set),
    setSprintDefaults: createFieldSetter("sprintDefaults", set),
    setPerProjectCompletedSprints: createFieldSetter("perProjectCompletedSprints", set),
    setPerProjectPlannedSprints: createFieldSetter("perProjectPlannedSprints", set),
    setArchivedTasks: createFieldSetter("archivedTasks", set),
    setArchivedProjects: createFieldSetter("archivedProjects", set),
    setArchivedEpics: createFieldSetter("archivedEpics", set),
  };
}
