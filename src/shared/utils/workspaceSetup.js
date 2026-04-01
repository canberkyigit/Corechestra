import { normalizePermissionMatrix } from "../constants/permissions";

function countTemplates(templateRegistry) {
  return Object.values(templateRegistry || {}).reduce((sum, entries) => sum + (entries?.length || 0), 0);
}

export function buildWorkspaceSetupState({
  projects = [],
  users = [],
  teams = [],
  spaces = [],
  templateRegistry = {},
  permissionMatrix = {},
  workspaceSettings = {},
}) {
  const activeUsers = (users || []).filter((user) => user.status !== "inactive");
  const normalizedPermissions = normalizePermissionMatrix(permissionMatrix);
  const checklist = [
    {
      id: "workspace-profile",
      title: "Name your workspace",
      description: "Set a clear workspace name and support contact for new teammates.",
      completed: Boolean(workspaceSettings?.displayName?.trim()),
    },
    {
      id: "project",
      title: "Create your first project",
      description: "Projects unlock board, roadmap, docs and release planning flows.",
      completed: (projects || []).length > 0,
    },
    {
      id: "people",
      title: "Invite people",
      description: "At least two active people makes assignments and approvals meaningful.",
      completed: activeUsers.length >= 2,
    },
    {
      id: "teams",
      title: "Group people into teams",
      description: "Teams improve workload, planning and ownership visibility.",
      completed: (teams || []).length > 0,
    },
    {
      id: "docs",
      title: "Create a documentation space",
      description: "Spaces make onboarding, runbooks and process docs discoverable.",
      completed: (spaces || []).length > 0,
    },
    {
      id: "templates",
      title: "Set default templates",
      description: "Pick default sprint, release and onboarding templates so every project starts consistent.",
      completed: countTemplates(templateRegistry) > 0 && Boolean(workspaceSettings?.defaultTemplates?.release),
    },
    {
      id: "permissions",
      title: "Review role permissions",
      description: "Confirm what members and viewers can see before inviting more people.",
      completed: Boolean(normalizedPermissions.member) && Boolean(normalizedPermissions.viewer),
    },
  ];

  const completedCount = checklist.filter((item) => item.completed).length;

  return {
    checklist,
    completedCount,
    totalCount: checklist.length,
    percentComplete: checklist.length ? Math.round((completedCount / checklist.length) * 100) : 0,
    isComplete: completedCount === checklist.length,
  };
}
