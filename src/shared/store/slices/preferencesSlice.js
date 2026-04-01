import { createFieldSetter } from "../createStoreSetters";
import { DEFAULT_TEMPLATE_REGISTRY } from "../../constants/defaultTemplates";
import { DEFAULT_PERMISSION_MATRIX } from "../../constants/permissions";

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  inApp: {
    assignments: true,
    mentions: true,
    comments: true,
    workflow: true,
    releases: true,
    reminders: true,
    system: true,
  },
  email: {
    assignments: false,
    mentions: false,
    comments: false,
    workflow: false,
    releases: false,
    reminders: false,
    system: false,
  },
  digest: "daily",
};

export const preferencesInitialState = {
  dbReady: false,
  darkMode: false,
  sidebarCollapsed: false,
  projectsViewMode: "grid",
  densityMode: "comfortable",
  perProjectBoardFilters: {},
  templateRegistry: DEFAULT_TEMPLATE_REGISTRY,
  savedViews: {
    board: [],
    docs: [],
    releases: [],
    tests: [],
  },
  recentItems: [],
  favoriteItems: [],
  pinnedItems: [],
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
  permissionMatrix: DEFAULT_PERMISSION_MATRIX,
  workspaceSettings: {
    displayName: "Corechestra Workspace",
    supportEmail: "",
    emptyStateHints: true,
    onboardingMode: "guided",
    defaultTemplates: {
      doc: DEFAULT_TEMPLATE_REGISTRY.doc?.[0]?.id || "",
      sprint: DEFAULT_TEMPLATE_REGISTRY.sprint?.[0]?.id || "",
      release: DEFAULT_TEMPLATE_REGISTRY.release?.[0]?.id || "",
      onboarding: DEFAULT_TEMPLATE_REGISTRY.onboarding?.[0]?.id || "",
      approval: DEFAULT_TEMPLATE_REGISTRY.approval?.[0]?.id || "",
      incident: DEFAULT_TEMPLATE_REGISTRY.incident?.[0]?.id || "",
    },
    defaultProjectWorkflow: {
      requireReviewBeforeDone: false,
      captureBlockReason: true,
      notifyOnBlocked: true,
      allowBackwardMoves: true,
    },
  },
  sensitiveActionPolicy: {
    requireConfirmation: true,
    requireAdminReason: false,
    protectRoleChanges: true,
    protectWorkspaceSettings: true,
  },
};

export function createPreferencesSlice(set) {
  return {
    ...preferencesInitialState,
    setDbReady: createFieldSetter("dbReady", set),
    setDarkMode: createFieldSetter("darkMode", set),
    setSidebarCollapsed: createFieldSetter("sidebarCollapsed", set),
    setProjectsViewMode: createFieldSetter("projectsViewMode", set),
    setDensityMode: createFieldSetter("densityMode", set),
    setPerProjectBoardFilters: createFieldSetter("perProjectBoardFilters", set),
    setTemplateRegistry: createFieldSetter("templateRegistry", set),
    setSavedViews: createFieldSetter("savedViews", set),
    setRecentItems: createFieldSetter("recentItems", set),
    setFavoriteItems: createFieldSetter("favoriteItems", set),
    setPinnedItems: createFieldSetter("pinnedItems", set),
    setNotificationPreferences: createFieldSetter("notificationPreferences", set),
    setPermissionMatrix: createFieldSetter("permissionMatrix", set),
    setWorkspaceSettings: createFieldSetter("workspaceSettings", set),
    setSensitiveActionPolicy: createFieldSetter("sensitiveActionPolicy", set),
  };
}
