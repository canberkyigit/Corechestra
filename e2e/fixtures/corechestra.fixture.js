const DEFAULT_SPRINT_DEFAULTS = {
  duration: 14,
  namingFormat: "Sprint {n}",
  autoStart: false,
  workingDays: ["mon", "tue", "wed", "thu", "fri"],
  startDay: "mon",
  velocity: 0,
};

function createUsers() {
  return [
    {
      uid: "uid-admin",
      id: "uid-admin",
      name: "Alice Admin",
      username: "alice",
      email: "alice@example.com",
      role: "admin",
      status: "active",
      color: "#2563eb",
    },
    {
      uid: "uid-member",
      id: "uid-member",
      name: "Bob Member",
      username: "bob",
      email: "bob@example.com",
      role: "member",
      status: "active",
      color: "#10b981",
    },
    {
      uid: "uid-viewer",
      id: "uid-viewer",
      name: "Vera Viewer",
      username: "vera",
      email: "vera@example.com",
      role: "viewer",
      status: "active",
      color: "#f59e0b",
    },
  ];
}

function createTasks(projectId) {
  return [
    {
      id: "task-1",
      title: "Regression suite cleanup",
      description: "Stabilize flaky regression cases",
      status: "todo",
      priority: "medium",
      type: "task",
      assignedTo: "alice",
      storyPoint: 3,
      projectId,
      labels: ["label-qa"],
      subtasks: [],
      linkedItems: [],
      comments: [],
    },
    {
      id: "task-2",
      title: "Login bug fix",
      description: "Fix auth redirect race",
      status: "blocked",
      priority: "high",
      type: "bug",
      assignedTo: "bob",
      storyPoint: 5,
      projectId,
      labels: ["label-auth"],
      subtasks: [],
      linkedItems: [],
      comments: [],
    },
    {
      id: "task-3",
      title: "Polish docs header",
      description: "Tighten docs header spacing",
      status: "inprogress",
      priority: "low",
      type: "feature",
      assignedTo: "alice",
      storyPoint: 2,
      projectId,
      labels: ["label-ui"],
      subtasks: [],
      linkedItems: [],
      comments: [],
    },
  ];
}

function createDocPages(spaceId) {
  return [
    {
      id: "page-root",
      title: "Release Checklist",
      emoji: "📘",
      spaceId,
      parentId: null,
      position: 0,
      content: "# Release Checklist\n\n- Verify rollout\n- Monitor logs",
      comments: [],
      labels: [],
      createdAt: "2026-03-20T09:00:00.000Z",
      updatedAt: "2026-03-20T09:00:00.000Z",
    },
    {
      id: "page-child",
      title: "Deploy Notes",
      emoji: "📝",
      spaceId,
      parentId: "page-root",
      position: 0,
      content: "Initial deploy notes",
      comments: [],
      labels: [],
      createdAt: "2026-03-20T09:10:00.000Z",
      updatedAt: "2026-03-20T09:10:00.000Z",
    },
  ];
}

function buildDomains({ projectId, users, tasks, spaces, docPages }) {
  const ts = 1_712_000_000_000;

  return {
    config: {
      currentUser: "",
      currentProjectId: projectId,
      sprintDefaults: { ...DEFAULT_SPRINT_DEFAULTS },
      darkMode: false,
      sidebarCollapsed: false,
      projectsViewMode: "grid",
      perProjectBoardFilters: {},
      _updatedAt: ts,
    },
    entities: {
      projects: [
        {
          id: projectId,
          name: "Corechestra",
          key: "CY",
          color: "#2563eb",
          description: "E2E seeded workspace",
          memberUsernames: users.map((user) => user.username),
        },
      ],
      teams: [
        {
          id: "team-product",
          name: "Product",
          description: "Core product team",
          color: "#7c3aed",
          memberNames: users.map((user) => user.username),
          projectIds: [projectId],
        },
      ],
      users: users.map(({ uid, ...rest }) => ({ id: uid, ...rest })),
      epics: [
        { id: "epic-ui", title: "UI Overhaul", color: "#06b6d4", projectId },
      ],
      labels: [
        { id: "label-qa", name: "QA", color: "#06b6d4" },
        { id: "label-auth", name: "Authentication", color: "#8b5cf6" },
        { id: "label-ui", name: "UI", color: "#3b82f6" },
      ],
      deletedUserIds: [],
      _updatedAt: ts,
    },
    tasks: {
      activeTasks: tasks,
      perProjectBacklog: {
        [projectId]: [
          { id: "backlog-main", title: "Backlog", tasks: [] },
        ],
      },
      _updatedAt: ts,
    },
    sprints: {
      perProjectSprint: {
        [projectId]: {
          id: "sprint-86",
          name: "Sprint 86",
          status: "active",
          startDate: "2026-03-23",
          endDate: "2026-03-29",
          goal: "Ship core workflow improvements",
        },
      },
      projectColumns: {},
      perProjectBoardSettings: {
        [projectId]: {
          showBadges: true,
          showPriorityColors: true,
          showTaskIds: true,
          showSubtaskButtons: true,
          boardName: "Corechestra",
          projectKey: "CY",
          taskViewMode: "board",
        },
      },
      perProjectBurndownSnapshots: {},
      perProjectCompletedSprints: {},
      perProjectPlannedSprints: {},
      _updatedAt: ts,
    },
    activity: {
      globalActivityLog: [],
      notifications: [],
      _updatedAt: ts,
    },
    workspace: {
      perProjectRetrospective: {},
      perProjectPokerHistory: {},
      perProjectNotes: {},
      _updatedAt: ts,
    },
    docs: {
      spaces,
      docPages,
      _updatedAt: ts,
    },
    releases: {
      releases: [],
      _updatedAt: ts,
    },
    testing: {
      testSuites: [],
      testCases: [],
      testRuns: [],
      _updatedAt: ts,
    },
    archive: {
      archivedTasks: [],
      archivedProjects: [],
      archivedEpics: [],
      _updatedAt: ts,
    },
  };
}

function createCorechestraSeed(options = {}) {
  const projectId = "project-1";
  const users = createUsers();
  const tasks = createTasks(projectId);
  const spaces = [
    {
      id: "space-product",
      name: "Product Docs",
      key: "PD",
      icon: "📘",
      color: "#2563eb",
      projectId,
      createdAt: "2026-03-20T09:00:00.000Z",
    },
  ];
  const docPages = createDocPages(spaces[0].id);
  const domains = buildDomains({ projectId, users, tasks, spaces, docPages });
  const authUsers = users.map((user) => ({
    uid: user.uid,
    email: user.email,
    role: user.role,
    name: user.name,
    username: user.username,
  }));

  const roleToUser = {
    admin: authUsers.find((user) => user.role === "admin"),
    member: authUsers.find((user) => user.role === "member"),
    viewer: authUsers.find((user) => user.role === "viewer"),
  };

  const sessionRole = options.sessionRole ?? null;
  const session = sessionRole ? { ...roleToUser[sessionRole] } : null;

  if (session) {
    domains.config.currentUser = session.username;
  }

  return {
    projectId,
    authUsers,
    domains,
    session,
    users: authUsers,
  };
}

module.exports = {
  createCorechestraSeed,
};
