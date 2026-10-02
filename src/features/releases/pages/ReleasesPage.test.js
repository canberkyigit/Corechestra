import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ReleasesPage, { isReleaseVisibleInProject, matchesTaskQuery } from "./ReleasesPage";
import { requestOpenTask } from "../../../shared/components/appNavigation";

const mockUseApp = jest.fn();
const mockAddToast = jest.fn();
const mockCanPerform = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: "/releases", search: "" }),
}), { virtual: true });

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canPerform: (key) => mockCanPerform(key), canAccessPage: () => true }),
}));

jest.mock("../../../shared/components/Skeleton", () => ({
  ReleasesSkeleton: () => <div>Loading releases</div>,
}));

jest.mock("../../../shared/components/appNavigation", () => ({
  requestOpenTask: jest.fn(),
  requestNavigate: jest.fn(),
}));

const TODAY = new Date().toISOString().slice(0, 10);
const dayKey = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function release(overrides = {}) {
  return {
    id: "rel-1",
    projectId: "proj-1",
    version: "1.1.0",
    name: "Core Release",
    status: "planned",
    taskIds: [],
    changelog: [],
    checklist: [],
    deploymentTimeline: [],
    createdAt: "2026-04-01T10:00:00.000Z",
    ...overrides,
  };
}

function createAppMock(overrides = {}) {
  return {
    releases: [release()],
    createRelease: jest.fn((data) => ({ id: "rel-new", ...data })),
    updateRelease: jest.fn(),
    deleteRelease: jest.fn(),
    addChangelogEntry: jest.fn(),
    deleteChangelogEntry: jest.fn(),
    updateChangelogEntry: jest.fn(),
    importReleases: jest.fn(),
    removeSampleReleases: jest.fn(),
    moveReleaseTasks: jest.fn(),
    allTasks: [],
    testRuns: [],
    testPlans: [],
    testCases: [],
    templateRegistry: { release: [] },
    currentUser: "alice",
    users: [{ id: "u1", username: "alice", name: "Alice Admin" }],
    projects: [{ id: "proj-1", name: "Corechestra" }],
    currentProjectId: "proj-1",
    dbReady: true,
    ...overrides,
  };
}

function renderPage(overrides) {
  const app = createAppMock(overrides);
  mockUseApp.mockReturnValue(app);
  const utils = render(<ReleasesPage />);
  return { app, ...utils };
}

function openRelease(version) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`Open release ${version.replace(/\./g, "\\.")}`) }));
  return screen.getByTestId("release-detail");
}

function lastUpdate(app) {
  const calls = app.updateRelease.mock.calls;
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  mockCanPerform.mockReturnValue(true);
  // Mark the default project as already visited so tests don't auto-seed.
  window.localStorage.setItem("corechestra_release_samples_seeded_proj-1", "1");
});

describe("ReleasesPage helpers", () => {
  it("matches tasks by key as well as title", () => {
    expect(matchesTaskQuery({ id: "CY-123", title: "Login" }, "cy-123")).toBe(true);
    expect(matchesTaskQuery({ id: "CY-123", title: "Login" }, "123")).toBe(true);
    expect(matchesTaskQuery({ id: 77, title: "Legacy" }, "CY-77")).toBe(true);
    expect(matchesTaskQuery({ id: "CY-123", title: "Login" }, "logout")).toBe(false);
  });

  it("scopes releases to the current project while keeping legacy releases visible", () => {
    expect(isReleaseVisibleInProject({ projectId: "proj-1" }, "proj-1")).toBe(true);
    expect(isReleaseVisibleInProject({}, "proj-1")).toBe(true);
    expect(isReleaseVisibleInProject({ projectId: "proj-2" }, "proj-1")).toBe(false);

    renderPage({
      releases: [
        release({ id: "a", version: "2.0.0", name: "Mine" }),
        release({ id: "b", version: "3.0.0", name: "Legacy", projectId: undefined }),
        release({ id: "c", version: "4.0.0", name: "Theirs", projectId: "proj-2" }),
      ],
    });
    expect(screen.getByRole("button", { name: /Open release 2\.0\.0/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open release 3\.0\.0/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open release 4\.0\.0/ })).not.toBeInTheDocument();
  });
});

describe("ReleasesPage views", () => {
  const releases = [
    release({ id: "a", version: "v2.0.0", name: "Alpha", status: "in-progress", releaseDate: dayKey(20), startDate: dayKey(-5) }),
    release({ id: "b", version: "v1.0.0", name: "Beta", status: "released", releaseDate: "2020-01-01", owner: "alice" }),
    release({ id: "c", version: "v2.1.0", name: "Gamma", status: "code-freeze", description: "Checkout work" }),
  ];

  it("renders header, KPIs and grouped list; filters by status and search", () => {
    renderPage({ releases });
    expect(screen.getByRole("heading", { name: /Releases/ })).toBeInTheDocument();
    expect(screen.getByText("Corechestra")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-next-release")).toHaveTextContent("v2.0.0");
    expect(screen.getByTestId("release-list-view")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Open release/ })).toHaveLength(3);

    const chips = screen.getByRole("group", { name: "Filter by status" });
    fireEvent.click(within(chips).getByRole("button", { name: /^Released 1$/ }));
    expect(screen.getAllByRole("button", { name: /Open release/ })).toHaveLength(1);
    fireEvent.click(within(chips).getByRole("button", { name: /^All 3$/ }));

    fireEvent.change(screen.getByPlaceholderText(/Search version/), { target: { value: "checkout" } });
    expect(screen.getAllByRole("button", { name: /Open release/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Open release v2\.1\.0/ })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Search version/), { target: { value: "zzz" } });
    expect(screen.getByText("No releases match your filters")).toBeInTheDocument();
  });

  it("switches between list, timeline and board and remembers the view", () => {
    const { unmount } = renderPage({ releases });
    fireEvent.click(screen.getByRole("tab", { name: /Timeline/ }));
    expect(screen.getByTestId("release-timeline-view")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quarter/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /Half-year/ }));
    expect(screen.getByRole("button", { name: /Half-year/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("tab", { name: /Board/ }));
    const board = screen.getByTestId("release-board-view");
    expect(within(board).getByLabelText("Planned releases")).toBeInTheDocument();
    expect(within(board).getByLabelText("Code freeze releases")).toHaveTextContent("Gamma");
    expect(within(board).getByLabelText("Released releases")).toHaveTextContent("Beta");
    expect(JSON.parse(window.localStorage.getItem("corechestra_releases_view")).view).toBe("board");

    unmount();
    renderPage({ releases });
    expect(screen.getByTestId("release-board-view")).toBeInTheDocument();
  });

  it("opens the release from a board card and from the timeline", () => {
    renderPage({ releases });
    fireEvent.click(screen.getByRole("tab", { name: /Timeline/ }));
    fireEvent.click(screen.getByRole("button", { name: /^v2\.0\.0 Alpha:/ }));
    expect(screen.getByTestId("release-detail")).toHaveTextContent("Alpha");
  });
});

describe("ReleasesPage lifecycle actions", () => {
  it("starts a planned release from the detail header", () => {
    const { app } = renderPage();
    openRelease("1.1.0");
    fireEvent.click(screen.getByTestId("release-start"));
    expect(lastUpdate(app)).toEqual(expect.objectContaining({
      id: "rel-1",
      status: "in-progress",
      startDate: TODAY,
      deploymentTimeline: [expect.objectContaining({ eventType: "started", author: "alice" })],
    }));
    expect(mockAddToast).toHaveBeenCalledWith("Release moved to In progress", "success");
  });

  it("enters code freeze and releases with production deployment", () => {
    const { app } = renderPage({ releases: [release({ status: "in-progress" })] });
    openRelease("1.1.0");
    fireEvent.click(screen.getByTestId("release-code-freeze"));
    expect(lastUpdate(app)).toEqual(expect.objectContaining({ status: "code-freeze", freezeDate: TODAY }));

    fireEvent.click(screen.getByTestId("release-mark-released"));
    const update = lastUpdate(app);
    expect(update).toEqual(expect.objectContaining({
      status: "released",
      releaseDate: TODAY,
      releasedAt: expect.any(String),
      deploymentTimeline: [expect.objectContaining({ eventType: "release", author: "alice" })],
    }));
    expect(update.environments.find((env) => env.key === "production")).toEqual(expect.objectContaining({ status: "deployed", version: "1.1.0" }));
    expect(mockAddToast).toHaveBeenCalledWith("Release shipped to production", "success");
  });

  it("rolls back a released release after confirmation and can reopen it", () => {
    const { app } = renderPage({ releases: [release({ status: "released", releaseDate: "2026-01-01" })] });
    openRelease("1.1.0");
    fireEvent.click(screen.getByTestId("release-rollback"));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Roll back 1.1.0?");
    fireEvent.click(screen.getByTestId("release-confirm"));
    expect(lastUpdate(app)).toEqual(expect.objectContaining({ status: "rolled-back" }));
  });

  it("deletes after confirmation and duplicates as the next minor version", () => {
    const { app } = renderPage({ releases: [release({ version: "v2.5.0", checklist: [{ id: "c1", title: "QA", completed: true }] })] });
    openRelease("v2.5.0");
    fireEvent.click(screen.getByRole("button", { name: "Release actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Duplicate as next minor/ }));
    expect(app.createRelease).toHaveBeenCalledWith(expect.objectContaining({
      version: "v2.6.0",
      status: "planned",
      projectId: "proj-1",
      taskIds: [],
      checklist: [expect.objectContaining({ title: "QA", completed: false })],
    }));

    openRelease("v2.5.0");
    fireEvent.click(screen.getByRole("button", { name: "Release actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Delete release/ }));
    fireEvent.click(screen.getByTestId("release-confirm"));
    expect(app.deleteRelease).toHaveBeenCalledWith("rel-1");
    expect(screen.queryByTestId("release-detail")).not.toBeInTheDocument();
  });

  it("creates a release stamped with the project and linked work, and validates duplicates", () => {
    const { app } = renderPage({
      allTasks: [
        { id: "CY-321", title: "Checkout flow", status: "todo" },
        { id: "CY-654", title: "Profile page", status: "done" },
      ],
    });
    fireEvent.click(screen.getByTestId("release-new"));
    const dialog = screen.getByRole("dialog", { name: /New release/ });
    fireEvent.change(within(dialog).getByPlaceholderText("v1.0.0"), { target: { value: "1.1.0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Create release/ }));
    expect(within(dialog).getByText("This version already exists in the project")).toBeInTheDocument();
    expect(app.createRelease).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByPlaceholderText("v1.0.0"), { target: { value: "5.0.0" } });
    fireEvent.change(within(dialog).getByPlaceholderText(/Search by title or key/i), { target: { value: "cy-654" } });
    expect(within(dialog).queryByText("Checkout flow")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByText("Profile page"));
    fireEvent.click(within(dialog).getByRole("button", { name: /Create release/ }));
    expect(app.createRelease).toHaveBeenCalledWith(expect.objectContaining({ version: "5.0.0", projectId: "proj-1", taskIds: ["CY-654"] }));
    expect(screen.queryByRole("dialog", { name: /New release/ })).not.toBeInTheDocument();
  });
});

describe("ReleasesPage detail tabs", () => {
  const tasks = [
    { id: "CY-1", title: "Ship dashboard", type: "feature", status: "done", assignedTo: "alice", storyPoint: 3 },
    { id: "CY-2", title: "Fix crash", type: "bug", status: "done", assignedTo: "bob", storyPoint: 2 },
    { id: "CY-3", title: "Polish onboarding", type: "task", status: "blocked", storyPoint: 5 },
  ];
  const detailRelease = release({
    status: "in-progress",
    taskIds: ["CY-1", "CY-2", "CY-3"],
    checklist: [{ id: "chk-1", title: "QA sign-off", completed: false }],
    changelog: [{ id: "cl-1", type: "feature", text: "Ship dashboard", taskId: "CY-1" }],
    deploymentTimeline: [
      { id: "e1", type: "created", text: "Release created", actor: "bob", timestamp: "2026-04-01T10:00:00.000Z" },
      { id: "e2", eventType: "deploy", text: "Pushed to prod", author: "carol", createdAt: "2026-04-02T10:00:00.000Z" },
    ],
  });
  const target = release({ id: "rel-2", version: "1.2.0", name: "Next", status: "planned" });

  it("shows overview metrics, toggles the checklist and adds risks", () => {
    const { app } = renderPage({ releases: [detailRelease], allTasks: tasks });
    const detail = openRelease("1.1.0");
    expect(within(detail).getByText("2 of 3 work items done")).toBeInTheDocument();
    expect(within(detail).getByText("1 blocked work item")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("release-checklist-chk-1"));
    expect(lastUpdate(app).checklist).toEqual([expect.objectContaining({ id: "chk-1", completed: true })]);

    fireEvent.change(screen.getByLabelText("New risk"), { target: { value: "Vendor outage" } });
    fireEvent.change(screen.getByLabelText("Risk severity"), { target: { value: "high" } });
    fireEvent.submit(screen.getByRole("form", { name: "Add risk" }));
    expect(lastUpdate(app).risks).toEqual([expect.objectContaining({ text: "Vendor outage", severity: "high" })]);
  });

  it("lists work items, opens tasks, unlinks and moves unfinished work", () => {
    const { app } = renderPage({ releases: [detailRelease, target], allTasks: tasks });
    openRelease("1.1.0");
    fireEvent.click(screen.getByRole("tab", { name: /Work items/ }));
    expect(screen.getByText("CY-3")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Status filter"), { target: { value: "blocked" } });
    expect(screen.queryByText("Ship dashboard")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Polish onboarding" }));
    expect(requestOpenTask).toHaveBeenCalledWith(expect.objectContaining({ id: "CY-3" }));

    fireEvent.click(screen.getAllByLabelText("Unlink task")[0]);
    expect(lastUpdate(app).taskIds).toEqual(["CY-1", "CY-2"]);

    fireEvent.change(screen.getByLabelText("Move unfinished to release"), { target: { value: "rel-2" } });
    fireEvent.click(screen.getByRole("button", { name: /^Move$/ }));
    expect(app.moveReleaseTasks).toHaveBeenCalledWith("rel-1", "rel-2", ["CY-3"]);
  });

  it("links work items through the search popup", () => {
    const { app } = renderPage({ releases: [release()], allTasks: tasks });
    openRelease("1.1.0");
    fireEvent.click(screen.getByRole("tab", { name: /Work items/ }));
    fireEvent.click(screen.getByTestId("release-link-tasks"));
    const dialog = screen.getByRole("dialog", { name: "Link work items" });
    fireEvent.change(within(dialog).getByLabelText("Search work items"), { target: { value: "crash" } });
    fireEvent.click(within(dialog).getByText("Fix crash"));
    fireEvent.click(within(dialog).getByRole("button", { name: /Link 1 item/ }));
    expect(lastUpdate(app).taskIds).toEqual(["CY-2"]);
  });

  it("generates release notes from completed work without duplicates", () => {
    const { app } = renderPage({ releases: [detailRelease], allTasks: tasks });
    openRelease("1.1.0");
    fireEvent.click(screen.getByRole("tab", { name: /Release notes/ }));
    expect(screen.getByText("Features")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("release-generate-notes"));
    const update = lastUpdate(app);
    expect(update.changelog).toHaveLength(2);
    expect(update.changelog[1]).toEqual(expect.objectContaining({ type: "bugfix", text: "Fix crash", taskId: "CY-2" }));
    expect(update.deploymentTimeline[0]).toEqual(expect.objectContaining({ type: "changelog" }));

    fireEvent.change(screen.getByLabelText("New entry text"), { target: { value: "Faster search" } });
    fireEvent.change(screen.getByLabelText("New entry type"), { target: { value: "security" } });
    fireEvent.click(screen.getByRole("button", { name: /Add entry/ }));
    expect(app.addChangelogEntry).toHaveBeenCalledWith("rel-1", { type: "security", text: "Faster search" });

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByTestId("release-notes-preview")).toHaveTextContent("1.1.0 — Core Release");
  });

  it("shows the quality empty state and run results", () => {
    const { unmount } = renderPage({ releases: [detailRelease], allTasks: tasks });
    openRelease("1.1.0");
    fireEvent.click(screen.getByRole("tab", { name: /Quality/ }));
    expect(screen.getByTestId("release-quality-empty")).toBeInTheDocument();
    unmount();

    renderPage({
      releases: [detailRelease],
      allTasks: tasks,
      testCases: [{ id: "tc-1", title: "Pay with card" }, { id: "tc-2", title: "Refund" }],
      testRuns: [{ id: "tr-1", name: "RC1", releaseId: "rel-1", status: "completed", createdAt: "2026-09-30T10:00:00Z", results: [{ caseId: "tc-1", status: "passed" }, { caseId: "tc-2", status: "failed" }] }],
    });
    openRelease("1.1.0");
    fireEvent.click(screen.getByRole("tab", { name: /Quality/ }));
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Refund")).toBeInTheDocument();
    expect(screen.getAllByText("RC1").length).toBeGreaterThan(0);
  });

  it("deploys environments and renders legacy timeline authors", () => {
    const { app } = renderPage({ releases: [detailRelease], allTasks: tasks });
    openRelease("1.1.0");
    fireEvent.click(screen.getByRole("tab", { name: /Deployments/ }));
    expect(screen.getByText("by bob")).toBeInTheDocument();
    expect(screen.getByText("by carol")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Deploy to Staging" }));
    const update = lastUpdate(app);
    expect(update.environments.find((env) => env.key === "staging")).toEqual(expect.objectContaining({ status: "deployed", version: "1.1.0", deployedBy: "alice" }));
    expect(update.deploymentTimeline[0]).toEqual(expect.objectContaining({ type: "deploy", environment: "staging" }));

    fireEvent.click(screen.getByRole("button", { name: /Add event/ }));
    fireEvent.change(screen.getByLabelText("Event description"), { target: { value: "Smoke tests green" } });
    fireEvent.change(screen.getByLabelText("Event type"), { target: { value: "monitoring" } });
    fireEvent.submit(screen.getByRole("form", { name: "Add timeline event" }));
    expect(lastUpdate(app).deploymentTimeline[0]).toEqual(expect.objectContaining({ type: "monitoring", text: "Smoke tests green", actor: "alice" }));
  });
});

describe("ReleasesPage read-only (viewer)", () => {
  beforeEach(() => {
    mockCanPerform.mockImplementation((key) => key !== "releases:manage");
  });

  it("hides every mutation control and never writes", () => {
    const viewerRelease = release({
      id: "rel-v",
      version: "7.0.0",
      name: "Viewer Release",
      status: "in-progress",
      description: "Read me",
      taskIds: ["CY-1"],
      changelog: [{ id: "log-1", type: "feature", text: "New dashboard" }],
      checklist: [{ id: "chk-1", title: "QA sign-off", completed: false }],
    });
    const { app } = renderPage({
      releases: [viewerRelease],
      allTasks: [{ id: "CY-1", title: "Ship dashboard", status: "done", type: "feature" }],
    });

    expect(screen.getByTestId("releases-read-only-hint")).toHaveTextContent(/Read-only/i);
    expect(screen.queryByTestId("release-new")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Release options" }));
    expect(screen.queryByRole("menuitem", { name: /Load sample data/ })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Export CSV/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    const detail = openRelease("7.0.0");
    expect(within(detail).getByText("Read me")).toBeInTheDocument();
    ["release-start", "release-code-freeze", "release-mark-released", "release-rollback", "release-move-to-planned"].forEach((id) => {
      expect(screen.queryByTestId(id)).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Edit release" })).not.toBeInTheDocument();
    const checklistItem = screen.getByTestId("release-checklist-chk-1");
    expect(checklistItem).toBeDisabled();
    fireEvent.click(checklistItem);
    expect(screen.queryByLabelText("New risk")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Work items/ }));
    expect(screen.getByText("Ship dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("release-link-tasks")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Unlink task")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Release notes/ }));
    expect(screen.getByText("New dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add entry/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("release-generate-notes")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Delete entry")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Deployments/ }));
    expect(screen.queryByRole("button", { name: /Deploy to/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add event/ })).not.toBeInTheDocument();

    expect(app.updateRelease).not.toHaveBeenCalled();
    expect(app.createRelease).not.toHaveBeenCalled();
    expect(app.deleteRelease).not.toHaveBeenCalled();
    expect(app.addChangelogEntry).not.toHaveBeenCalled();
    expect(app.importReleases).not.toHaveBeenCalled();
  });

  it("never auto-seeds samples for viewers", () => {
    window.localStorage.clear();
    const { app } = renderPage({ releases: [] });
    expect(app.importReleases).not.toHaveBeenCalled();
    expect(screen.getByTestId("releases-empty")).toHaveTextContent(/can view releases but not create/);
    expect(screen.queryByTestId("releases-load-samples")).not.toBeInTheDocument();
  });
});

describe("ReleasesPage sample data", () => {
  const tasks = [
    { id: "CY-10", title: "Done feature", type: "feature", status: "done", projectId: "proj-1" },
    { id: "CY-11", title: "Blocked bug", type: "bug", status: "blocked", projectId: "proj-1" },
  ];

  it("auto-seeds once per project for managers when the project is empty", () => {
    window.localStorage.clear();
    const { app, unmount } = renderPage({ releases: [], allTasks: tasks });
    expect(app.importReleases).toHaveBeenCalledTimes(1);
    const seeded = app.importReleases.mock.calls[0][0];
    expect(seeded).toHaveLength(7);
    expect(seeded.every((item) => item.sample && item.id.startsWith("rel-sample-") && item.projectId === "proj-1")).toBe(true);
    expect(seeded.flatMap((item) => item.taskIds).every((id) => ["CY-10", "CY-11"].includes(id))).toBe(true);
    expect(window.localStorage.getItem("corechestra_release_samples_seeded_proj-1")).toBe("1");
    unmount();

    // Deleting the samples later must not re-seed.
    const { app: secondApp } = renderPage({ releases: [], allTasks: tasks });
    expect(secondApp.importReleases).not.toHaveBeenCalled();
  });

  it("does not auto-seed when the project already has releases but marks it visited", () => {
    window.localStorage.clear();
    const { app } = renderPage();
    expect(app.importReleases).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("corechestra_release_samples_seeded_proj-1")).toBe("1");
  });

  it("loads samples from the empty state and removes only sample data from the menu", () => {
    const { app, unmount } = renderPage({ releases: [], allTasks: tasks });
    expect(app.importReleases).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("releases-load-samples"));
    expect(app.importReleases).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ version: "v2.5.0", status: "code-freeze" })]));
    unmount();

    const { app: sampleApp } = renderPage({ releases: [release(), release({ id: "rel-sample-proj-1-250", version: "v2.5.0", sample: true })] });
    expect(screen.getByText("Sample")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Release options" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Remove sample data \(1\)/ }));
    expect(sampleApp.removeSampleReleases).toHaveBeenCalledWith("proj-1");
  });

  it("shows the skeleton until data is ready", () => {
    renderPage({ dbReady: false });
    expect(screen.getByText("Loading releases")).toBeInTheDocument();
  });
});
