import { useCallback } from "react";
import { DEFAULT_BOARD_SETTINGS, DEFAULT_COLUMNS } from "../../AppSeeds";

export function useWorkspaceActions({
  currentProjectId,
  projects,
  workspaceSettings,
  setProjects,
  setProjectColumns,
  setPerProjectSprint,
  setPerProjectBacklog,
  setPerProjectRetrospective,
  setPerProjectPokerHistory,
  setPerProjectNotes,
  setPerProjectBoardSettings,
  setPerProjectCompletedSprints,
  setPerProjectPlannedSprints,
  setTeams,
  setUsers,
  setDeletedUserIds,
  setSprintDefaults,
  addNotification,
  logAuditEvent,
}) {
  const createProject = useCallback((data) => {
    const id = `proj-${Date.now()}`;
    const defaultTemplates = workspaceSettings?.defaultTemplates || {};
    const defaultProjectWorkflow = workspaceSettings?.defaultProjectWorkflow || {};

    setProjects((prev) => [...prev, {
      ...data,
      id,
      workflowRules: {
        requireReviewBeforeDone: false,
        captureBlockReason: true,
        notifyOnBlocked: true,
        allowBackwardMoves: true,
        ...defaultProjectWorkflow,
      },
      templateDefaults: {
        release: defaultTemplates.release || "",
        onboarding: defaultTemplates.onboarding || "",
        approval: defaultTemplates.approval || "",
        incident: defaultTemplates.incident || "",
      },
      sprintDefaults: {
        duration: 14,
        velocityTarget: 0,
        namingFormat: "Sprint {n}",
        templateId: defaultTemplates.sprint || "",
      },
    }]);
    setProjectColumns((prev) => ({ ...prev, [id]: DEFAULT_COLUMNS }));
    setPerProjectSprint((prev) => ({
      ...prev,
      [id]: {
        id: `sprint-${id}`,
        name: "Sprint 1",
        goal: "",
        startDate: "",
        endDate: "",
        status: "planned",
      },
    }));
    setPerProjectBacklog((prev) => ({
      ...prev,
      [id]: [{ id: Date.now(), title: "Backlog", tasks: [] }],
    }));
    setPerProjectRetrospective((prev) => ({
      ...prev,
      [id]: { wentWell: [], wentWrong: [], canImprove: [], actionItems: [] },
    }));
    setPerProjectPokerHistory((prev) => ({ ...prev, [id]: [] }));
    setPerProjectNotes((prev) => ({ ...prev, [id]: [] }));
    setPerProjectBoardSettings((prev) => ({
      ...prev,
      [id]: {
        ...DEFAULT_BOARD_SETTINGS,
        boardName: data.name || "New Project",
        projectKey: data.key || "NP",
      },
    }));
    setPerProjectCompletedSprints((prev) => ({ ...prev, [id]: [] }));
    setPerProjectPlannedSprints((prev) => ({ ...prev, [id]: [] }));
    addNotification({ type: "project_created", text: `Project "${data.name}" created` });
    logAuditEvent?.("project_created", {
      entityType: "project",
      entityId: id,
      name: data.name,
      scope: "workspace",
    });
  }, [
    addNotification,
    logAuditEvent,
    setPerProjectBacklog,
    setPerProjectBoardSettings,
    setPerProjectCompletedSprints,
    setPerProjectNotes,
    setPerProjectPlannedSprints,
    setPerProjectPokerHistory,
    setPerProjectRetrospective,
    setPerProjectSprint,
    setProjectColumns,
    setProjects,
    workspaceSettings,
  ]);

  const updateProject = useCallback((updated) => {
    setProjects((prev) => prev.map((project) => (
      project.id === updated.id ? updated : project
    )));
    setPerProjectBoardSettings((prev) => ({
      ...prev,
      [updated.id]: {
        ...(prev[updated.id] || DEFAULT_BOARD_SETTINGS),
        boardName: updated.name,
        projectKey: updated.key,
      },
    }));
    logAuditEvent?.("project_updated", {
      entityType: "project",
      entityId: updated.id,
      name: updated.name,
      scope: "workspace",
    });
  }, [logAuditEvent, setPerProjectBoardSettings, setProjects]);

  const deleteProject = useCallback((projectId) => {
    const project = projects.find((item) => item.id === projectId);
    setProjects((prev) => prev.filter((item) => item.id !== projectId));
    if (project) {
      addNotification({ type: "project_deleted", text: `Project "${project.name}" deleted` });
      logAuditEvent?.("project_deleted", {
        entityType: "project",
        entityId: projectId,
        name: project.name,
        severity: "warning",
        scope: "security",
      });
    }
  }, [addNotification, logAuditEvent, projects, setProjects]);

  const createTeam = useCallback((data) => {
    const id = `team-${Date.now()}`;
    setTeams((prev) => [...prev, { ...data, id }]);
    logAuditEvent?.("team_created", {
      entityType: "team",
      entityId: id,
      name: data.name,
      scope: "workspace",
    });
  }, [logAuditEvent, setTeams]);

  const updateTeam = useCallback((updated) => {
    setTeams((prev) => prev.map((team) => (
      team.id === updated.id ? updated : team
    )));
    logAuditEvent?.("team_updated", {
      entityType: "team",
      entityId: updated.id,
      name: updated.name,
      scope: "workspace",
    });
  }, [logAuditEvent, setTeams]);

  const deleteTeam = useCallback((teamId) => {
    setTeams((prev) => prev.filter((team) => team.id !== teamId));
    logAuditEvent?.("team_deleted", {
      entityType: "team",
      entityId: teamId,
      severity: "warning",
      scope: "security",
    });
  }, [logAuditEvent, setTeams]);

  const createUser = useCallback((data) => {
    const id = data.id || `user-${Date.now()}`;
    let created = false;
    setUsers((prev) => {
      if (prev.some((user) => user.id === id || (data.email && user.email === data.email))) {
        return prev;
      }
      created = true;
      return [
        ...prev,
        { joinedAt: new Date().toISOString().slice(0, 10), ...data, id },
      ];
    });
    if (created) {
      logAuditEvent?.("user_invited", {
        entityType: "user",
        entityId: id,
        name: data.name,
        email: data.email,
        scope: "security",
      });
    }
  }, [logAuditEvent, setUsers]);

  const updateUser = useCallback((updated) => {
    setUsers((prev) => prev.map((user) => (
      user.id === updated.id ? updated : user
    )));
    logAuditEvent?.("user_updated", {
      entityType: "user",
      entityId: updated.id,
      name: updated.name,
      scope: "security",
    });
  }, [logAuditEvent, setUsers]);

  const deleteUser = useCallback((userId) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId));
    setDeletedUserIds((prev) => (
      prev.includes(userId) ? prev : [...prev, userId]
    ));
    logAuditEvent?.("user_deleted", {
      entityType: "user",
      entityId: userId,
      severity: "warning",
      scope: "security",
    });
  }, [logAuditEvent, setDeletedUserIds, setUsers]);

  const updateSprintDefaults = useCallback((patch) => {
    setSprintDefaults((prev) => ({ ...prev, ...patch }));
    logAuditEvent?.("sprint_defaults_updated", {
      entityType: "workspace",
      scope: "workspace",
      patch,
    });
  }, [logAuditEvent, setSprintDefaults]);

  return {
    createProject,
    updateProject,
    deleteProject,
    createTeam,
    updateTeam,
    deleteTeam,
    createUser,
    updateUser,
    deleteUser,
    updateSprintDefaults,
    currentProjectId,
  };
}
