import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import TestsPage from "./TestsPage";
import { resetAppStore, useAppStore } from "../../../shared/store/useAppStore";
import { useTestingActions } from "../../../shared/context/hooks/actions/useTestingActions";
import { OPEN_TASK_EVENT } from "../../../shared/components/appNavigation";

let mockSearch = "";
const mockAddToast = jest.fn();
const mockCanPerform = jest.fn();
const mockCreateTask = jest.fn();

jest.mock("react-router-dom", () => {
  const ReactLib = require("react");
  return {
    useSearchParams: () => {
      const [params, setParams] = ReactLib.useState(() => new URLSearchParams(mockSearch));
      const update = ReactLib.useCallback((next) => setParams((prev) => new URLSearchParams(typeof next === "function" ? next(prev) : next)), []);
      return [params, update];
    },
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: "/tests" }),
  };
}, { virtual: true });
const mockLiveApp = { current: null };
jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockLiveApp.current() }));
jest.mock("../../../shared/context/ToastContext", () => ({ useToast: () => ({ addToast: mockAddToast }) }));
jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canPerform: (key) => mockCanPerform(key), canAccessPage: () => true }),
}));
jest.mock("../../../shared/context/hooks/useSavedViews", () => ({
  useSavedViews: () => ({ views: [], activeViewId: null, saveCurrentView: jest.fn(), deleteView: jest.fn() }),
}));

const USERS = [
  { id: "u1", username: "alice", name: "Alice Admin", role: "admin", status: "active" },
  { id: "u2", username: "bob", name: "Bob Member", role: "member", status: "active" },
];
const TASKS = [
  { id: "CY-1", title: "Login story", type: "userstory", status: "inprogress", projectId: "proj-1" },
  { id: "CY-2", title: "Uncovered feature", type: "feature", status: "todo", projectId: "proj-1" },
  { id: "CY-3", title: "Token bug", type: "bug", status: "todo", priority: "high", projectId: "proj-1" },
];

function useLiveApp() {
  const state = useAppStore();
  const actions = useTestingActions({
    currentUser: "alice",
    templateRegistry: {},
    setReleases: state.setReleases,
    setTestPlans: state.setTestPlans,
    setTestSuites: state.setTestSuites,
    setTestCases: state.setTestCases,
    setTestRuns: state.setTestRuns,
    setTestSharedSteps: state.setTestSharedSteps,
  });
  return {
    dbReady: true,
    currentUser: "alice",
    currentProjectId: "proj-1",
    projects: [{ id: "proj-1", name: "Corechestra" }],
    users: USERS,
    labels: [{ id: "lbl-qa", name: "QA" }],
    epics: [],
    backlogSections: [],
    allTasks: TASKS,
    releases: state.releases,
    testPlans: state.testPlans,
    testSuites: state.testSuites,
    testCases: state.testCases,
    testRuns: state.testRuns,
    testSharedSteps: state.testSharedSteps,
    createTask: mockCreateTask,
    ...actions,
  };
}

mockLiveApp.current = useLiveApp;

const NOW = Date.now();
const ago = (days) => new Date(NOW - days * 86400000).toISOString();

function seed() {
  act(() => useAppStore.setState({
    currentProjectId: "proj-1",
    releases: [{ id: "rel-1", projectId: "proj-1", version: "v2.0.0", name: "Atlas", status: "code-freeze" }],
    testSuites: [
      { id: "s-web", projectId: "proj-1", name: "Web App", order: 0 },
      { id: "f-auth", projectId: "proj-1", parentId: "s-web", name: "Auth", order: 0 },
      { id: "s-api", projectId: "proj-1", name: "API", order: 1 },
    ],
    testCases: [
      {
        id: "c1", projectId: "proj-1", suiteId: "f-auth", seq: 1, order: 0, title: "Login works", priority: "high", status: "ready",
        owner: "alice", steps: [{ id: "s1", action: "Open login", expected: "Form" }, { id: "s2", action: "Submit", expected: "Board" }],
        requirementIds: ["CY-1"], createdAt: ago(20),
      },
      { id: "c2", projectId: "proj-1", suiteId: "f-auth", seq: 2, order: 1, title: "Logout works", priority: "medium", status: "ready", owner: "alice", requirementIds: ["CY-1"], createdAt: ago(20) },
      { id: "c3", projectId: "proj-1", suiteId: "s-api", seq: 3, order: 0, title: "Token refresh", priority: "critical", status: "ready", owner: "bob", tags: ["api"], createdAt: ago(20) },
    ],
    testSharedSteps: [{ id: "g1", projectId: "proj-1", name: "Login as admin", steps: [{ id: "x1", action: "Open /login" }, { id: "x2", action: "Sign in" }] }],
    testPlans: [{ id: "p1", projectId: "proj-1", name: "Atlas regression", releaseId: "rel-1", status: "in-progress" }],
    testRuns: [
      {
        id: "r0", projectId: "proj-1", name: "Nightly API", status: "completed", createdAt: ago(5), completedAt: ago(4), caseIds: ["c3"],
        results: [{ caseId: "c3", status: "failed", executedAt: ago(4), executedBy: "bob", defects: ["CY-3"] }],
      },
      {
        id: "r1", projectId: "proj-1", planId: "p1", name: "RC1 regression", status: "in-progress", environment: "staging", build: "2.0.0-rc.1",
        createdAt: ago(2), dueDate: new Date(NOW + 3 * 86400000).toISOString().slice(0, 10), caseIds: ["c1", "c2", "c3"],
        assignments: { c1: "alice", c2: "alice", c3: "bob" },
        results: [{ caseId: "c2", status: "passed", executedAt: ago(1), executedBy: "alice" }],
      },
    ],
  }));
}

function renderPage(search = "") {
  mockSearch = search;
  return render(<TestsPage />);
}

const openTab = (name) => fireEvent.click(screen.getByRole("tab", { name: new RegExp(name) }));

describe("TestsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAppStore();
    window.localStorage.clear();
    window.localStorage.setItem("corechestra_testing_samples_seeded_proj-1", "1");
    mockCanPerform.mockReturnValue(true);
    mockCreateTask.mockImplementation((data) => ({ ...data, id: "CY-900" }));
    seed();
  });

  it("shows the overview and navigates between URL-addressable tabs", () => {
    renderPage();
    expect(screen.getByTestId("tests-overview")).toBeInTheDocument();
    expect(within(screen.getByTestId("kpi-total-cases")).getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Overview/ })).toHaveAttribute("aria-selected", "true");

    openTab("Repository");
    expect(screen.getByTestId("tests-case-table")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^tests-case-row-/)).toHaveLength(3);

    openTab("Plans");
    expect(screen.getByTestId("tests-plan-p1")).toHaveTextContent("Atlas regression");
    expect(screen.getByTestId("tests-plan-p1")).toHaveTextContent("v2.0.0");
  });

  it("opens the tab from the URL", () => {
    renderPage("tab=plans");
    expect(screen.getByTestId("tests-plans")).toBeInTheDocument();
    expect(screen.getByTestId("tests-cycle-r1")).toHaveTextContent("RC1 regression");
  });

  it("filters the repository by folder and search, and creates folders and cases", () => {
    renderPage("tab=repository");
    fireEvent.click(screen.getByTestId("tests-folder-f-auth"));
    expect(screen.getAllByTestId(/^tests-case-row-/)).toHaveLength(2);
    fireEvent.click(screen.getByRole("treeitem", { name: /All test cases/ }));
    fireEvent.change(screen.getByTestId("tests-case-search"), { target: { value: "tc-3" } });
    expect(screen.getAllByTestId(/^tests-case-row-/)).toHaveLength(1);
    expect(screen.getByTestId("tests-case-row-c3")).toHaveTextContent("Token refresh");
    fireEvent.click(screen.getByTestId("tests-clear-filters"));

    // New sub-folder inside Auth.
    fireEvent.click(screen.getByTestId("tests-folder-f-auth"));
    fireEvent.click(screen.getByTestId("tests-new-folder"));
    fireEvent.change(screen.getByTestId("tests-folder-name"), { target: { value: "Sessions" } });
    fireEvent.click(screen.getByTestId("tests-folder-submit"));
    const folder = useAppStore.getState().testSuites.find((suite) => suite.name === "Sessions");
    expect(folder).toEqual(expect.objectContaining({ parentId: "f-auth", projectId: "proj-1" }));

    // New case with steps (header button).
    fireEvent.click(screen.getByTestId("tests-new-case"));
    const form = screen.getByTestId("tests-case-form");
    fireEvent.change(within(form).getByLabelText("Title"), { target: { value: "Session expires" } });
    fireEvent.change(within(form).getByLabelText("Step 1 action"), { target: { value: "Wait 30 minutes" } });
    fireEvent.change(within(form).getByLabelText("Step 1 expected result"), { target: { value: "Signed out" } });
    fireEvent.click(within(form).getByTestId("tests-case-create"));
    const created = useAppStore.getState().testCases.find((testCase) => testCase.title === "Session expires");
    expect(created).toEqual(expect.objectContaining({ seq: 4, suiteId: folder.id, owner: "alice" }));
    expect(created.steps).toEqual([expect.objectContaining({ action: "Wait 30 minutes", expected: "Signed out" })]);
    expect(screen.getByTestId("tests-case-drawer")).toHaveTextContent("TC-4");
  });

  it("applies bulk actions in a single update and deletes after confirmation", () => {
    renderPage("tab=repository");
    fireEvent.click(within(screen.getByTestId("tests-case-row-c1")).getByRole("checkbox"));
    fireEvent.click(within(screen.getByTestId("tests-case-row-c2")).getByRole("checkbox"));
    const bar = screen.getByTestId("tests-bulk-bar");
    expect(bar).toHaveTextContent("2 selected");
    fireEvent.click(within(bar).getByTitle("Set priority"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Critical" }));
    const updated = useAppStore.getState().testCases.filter((testCase) => ["c1", "c2"].includes(testCase.id));
    expect(updated.every((testCase) => testCase.priority === "critical")).toBe(true);
    expect(updated[0].history.at(-1)).toEqual(expect.objectContaining({ by: "alice", fields: ["priority"] }));

    fireEvent.click(within(screen.getByTestId("tests-bulk-bar")).getByTestId("tests-bulk-delete"));
    fireEvent.click(screen.getByTestId("tests-confirm"));
    expect(useAppStore.getState().testCases.map((testCase) => testCase.id)).toEqual(["c3"]);
    // Open cycle drops deleted cases from its scope.
    expect(useAppStore.getState().testRuns.find((run) => run.id === "r1").caseIds).toEqual(["c3"]);
  });

  it("supports keyboard navigation in the case grid", () => {
    renderPage("tab=repository");
    const grid = screen.getByTestId("tests-case-table");
    fireEvent.keyDown(grid, { key: "ArrowDown" });
    fireEvent.keyDown(grid, { key: " " });
    expect(within(screen.getByTestId("tests-case-row-c2")).getByRole("checkbox")).toBeChecked();
    fireEvent.keyDown(grid, { key: "Enter" });
    expect(screen.getByTestId("tests-case-drawer")).toHaveTextContent("TC-2");
    expect(screen.getByTestId("tests-case-title-input")).toHaveValue("Logout works");
  });

  it("edits a case: fields with history, steps with shared steps, comments", () => {
    renderPage("tab=repository&case=c1");
    const drawer = screen.getByTestId("tests-case-drawer");
    fireEvent.change(within(drawer).getByTestId("tests-case-priority"), { target: { value: "critical" } });
    let c1 = useAppStore.getState().testCases.find((testCase) => testCase.id === "c1");
    expect(c1.priority).toBe("critical");
    expect(c1.history.at(-1).changes.priority).toEqual({ from: "high", to: "critical" });

    fireEvent.click(within(drawer).getByRole("tab", { name: /^Steps/ }));
    fireEvent.click(within(drawer).getByTestId("tests-add-step"));
    fireEvent.change(within(drawer).getByLabelText("Step 3 action"), { target: { value: "Check avatar" } });
    fireEvent.click(within(drawer).getByTitle("Call shared steps"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Login as admin/ }));
    fireEvent.click(within(drawer).getByTestId("tests-save-steps"));
    c1 = useAppStore.getState().testCases.find((testCase) => testCase.id === "c1");
    expect(c1.steps.map((step) => step.action || step.sharedStepsId)).toEqual(["Open login", "Submit", "Check avatar", "g1"]);

    fireEvent.click(within(drawer).getByRole("tab", { name: /^Comments/ }));
    fireEvent.change(within(drawer).getByTestId("tests-comment-input"), { target: { value: "Verified on staging" } });
    fireEvent.click(within(drawer).getByRole("button", { name: "Comment" }));
    expect(useAppStore.getState().testCases.find((testCase) => testCase.id === "c1").comments[0]).toEqual(expect.objectContaining({ author: "alice", text: "Verified on staging" }));

    fireEvent.click(within(drawer).getByRole("tab", { name: /^History/ }));
    expect(within(screen.getByTestId("tests-case-history")).getAllByRole("listitem").length).toBeGreaterThanOrEqual(2);
  });

  it("creates a cycle with the wizard (scope + round-robin assignment)", () => {
    renderPage("tab=plans");
    fireEvent.click(screen.getByTestId("tests-new-cycle"));
    const wizard = screen.getByTestId("tests-cycle-wizard");
    fireEvent.click(within(wizard).getByTestId("tests-wizard-next"));
    expect(within(wizard).getByRole("alert")).toHaveTextContent(/name/i);
    fireEvent.change(within(wizard).getByTestId("tests-cycle-name"), { target: { value: "RC2 regression" } });
    fireEvent.change(within(wizard).getByLabelText("Test plan"), { target: { value: "p1" } });
    fireEvent.click(within(wizard).getByTestId("tests-wizard-next"));
    expect(within(wizard).getByTestId("tests-wizard-preview")).toHaveTextContent("Login works");
    fireEvent.click(within(wizard).getByTestId("tests-wizard-next"));
    fireEvent.click(within(wizard).getByTestId("tests-wizard-next"));
    expect(within(wizard).getByTestId("tests-wizard-review")).toHaveTextContent("RC2 regression");
    fireEvent.click(within(wizard).getByTestId("tests-wizard-create"));

    const run = useAppStore.getState().testRuns.find((item) => item.name === "RC2 regression");
    expect(run).toEqual(expect.objectContaining({ planId: "p1", releaseId: "rel-1", status: "in-progress", projectId: "proj-1", results: [] }));
    expect(run.caseIds).toEqual(["c1", "c2", "c3"]);
    expect(Object.values(run.assignments)).toEqual(["alice", "bob", "alice"]);
    expect(screen.getByTestId("tests-cycle-drawer")).toHaveTextContent("RC2 regression");
  });

  it("executes with keyboard shortcuts, step verdicts and creates a linked defect", () => {
    renderPage("tab=plans&run=r1");
    const runner = screen.getByTestId("tests-runner");
    expect(within(runner).getByTestId("tests-runner-title")).toHaveTextContent("Login works");

    fireEvent.keyDown(window, { key: "p" });
    let r1 = useAppStore.getState().testRuns.find((run) => run.id === "r1");
    expect(r1.results.find((result) => result.caseId === "c1")).toEqual(expect.objectContaining({ status: "passed", executedBy: "alice" }));
    // Auto-advanced to the next open case.
    expect(within(runner).getByTestId("tests-runner-title")).toHaveTextContent("Token refresh");

    fireEvent.click(within(runner).getByRole("button", { name: /Previous case/ }));
    fireEvent.click(within(runner).getByRole("button", { name: /Previous case/ }));
    expect(within(runner).getByTestId("tests-runner-title")).toHaveTextContent("Login works");
    const steps = within(runner).getAllByTestId("tests-runner-step");
    fireEvent.click(within(steps[0]).getByRole("button", { name: "Pass" }));
    fireEvent.click(within(steps[1]).getByRole("button", { name: "Fail" }));
    fireEvent.change(within(steps[1]).getByLabelText("Step 2 actual result"), { target: { value: "Spinner forever" } });
    expect(within(runner).getByText(/Suggested from steps/)).toHaveTextContent("Failed");

    fireEvent.click(within(runner).getByTestId("tests-create-defect"));
    const dialog = screen.getByTestId("tests-defect-dialog");
    expect(within(dialog).getByTestId("tests-defect-title")).toHaveValue("[TC-1] Login works — step 2 failed");
    expect(within(dialog).getByLabelText(/Description/).value).toContain("Actual: Spinner forever");
    fireEvent.click(within(dialog).getByTestId("tests-defect-submit"));

    expect(mockCreateTask).toHaveBeenCalledWith(expect.objectContaining({
      type: "bug", priority: "high", labels: ["lbl-qa"], linkedItems: [expect.objectContaining({ targetType: "test-case", targetId: "c1" })],
    }), "active");
    r1 = useAppStore.getState().testRuns.find((run) => run.id === "r1");
    const c1Result = r1.results.find((result) => result.caseId === "c1");
    expect(c1Result).toEqual(expect.objectContaining({ status: "failed", defects: ["CY-900"] }));
    expect(c1Result.stepResults).toEqual([{ stepId: "s1", status: "passed" }, { stepId: "s2", status: "failed", actual: "Spinner forever" }]);
    expect(c1Result.attempts).toHaveLength(1);
    expect(useAppStore.getState().testCases.find((testCase) => testCase.id === "c1").defectIds).toEqual(["CY-900"]);

    fireEvent.keyDown(window, { key: "?" });
    expect(screen.getByTestId("tests-shortcut-help")).toBeInTheDocument();
  });

  it("shows the traceability matrix and creates a case for an uncovered requirement", () => {
    renderPage("tab=traceability");
    expect(screen.getByTestId("tests-trace-row-CY-1")).toHaveTextContent("Login story");
    expect(screen.getByTestId("tests-trace-row-CY-2")).toHaveTextContent("Not covered");
    fireEvent.click(screen.getByTestId("tests-trace-create-CY-2"));
    const form = screen.getByTestId("tests-case-form");
    expect(within(form).getByLabelText("Title")).toHaveValue("Verify: Uncovered feature");
    expect(form).toHaveTextContent("Uncovered feature");
  });

  it("lists linked defects and opens them in the task panel", () => {
    const listener = jest.fn();
    window.addEventListener(OPEN_TASK_EVENT, listener);
    renderPage("tab=defects");
    const row = screen.getByTestId("tests-defect-CY-3");
    expect(row).toHaveTextContent("Token bug");
    expect(row).toHaveTextContent("TC-3");
    fireEvent.click(within(row).getByRole("button", { name: "Token bug" }));
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: { task: expect.objectContaining({ id: "CY-3" }) } }));
    window.removeEventListener(OPEN_TASK_EVENT, listener);
  });

  it("renders a cycle report and exports CSV", () => {
    const createObjectURL = jest.fn(() => "blob:report");
    const revoke = jest.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revoke;
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderPage("tab=reports&report=cycle:r1");
    expect(screen.getByTestId("tests-report-document")).toHaveTextContent("Test cycle report");
    expect(screen.getByTestId("tests-report-document")).toHaveTextContent("RC1 regression");
    fireEvent.click(screen.getByTestId("tests-report-csv"));
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
    expect(mockAddToast).toHaveBeenCalledWith("Report exported as CSV", "success");
    fireEvent.click(screen.getByRole("tab", { name: "Release quality" }));
    expect(screen.getByTestId("tests-report-document")).toHaveTextContent("Release quality report");
  });

  it("is read-only without tests:edit / tests:execute", () => {
    mockCanPerform.mockImplementation((key) => !["tests:edit", "tests:execute", "task:create"].includes(key));
    renderPage("tab=repository");
    expect(screen.getByTestId("tests-read-only-hint")).toHaveTextContent("Read-only access");
    expect(screen.queryByTestId("tests-new-case")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tests-new-suite")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tests-new-case-here")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tests-case-row-c1"));
    expect(screen.getByTestId("tests-case-priority")).toBeDisabled();
  });

  it("disables recording in the runner without tests:execute", () => {
    mockCanPerform.mockImplementation((key) => key !== "tests:execute");
    renderPage("tab=plans&run=r1");
    expect(screen.getByTestId("tests-runner-readonly")).toHaveTextContent(/can view executions/);
    expect(screen.getByTestId("tests-verdict-passed")).toBeDisabled();
    fireEvent.keyDown(window, { key: "p" });
    expect(useAppStore.getState().testRuns.find((run) => run.id === "r1").results).toHaveLength(1);
    expect(mockAddToast).toHaveBeenCalledWith("Your role can't record test results", "error");
  });

  it("auto-seeds sample data once for an empty project and removes it on request", async () => {
    act(() => useAppStore.setState({ testSuites: [], testCases: [], testRuns: [], testPlans: [], testSharedSteps: [] }));
    window.localStorage.clear();
    renderPage();
    await waitFor(() => expect(useAppStore.getState().testSuites.length).toBeGreaterThan(5));
    const state = useAppStore.getState();
    expect(state.testCases.every((testCase) => testCase.sample && testCase.projectId === "proj-1")).toBe(true);
    expect(state.testPlans.find((plan) => plan.releaseId === "rel-1")).toBeTruthy();
    expect(window.localStorage.getItem("corechestra_testing_samples_seeded_proj-1")).toBe("1");
    expect(mockAddToast).toHaveBeenCalledWith(expect.stringMatching(/sample test workspace/), "success");

    fireEvent.click(screen.getByTestId("tests-options"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Remove sample data/ }));
    fireEvent.click(screen.getByTestId("tests-confirm"));
    expect(useAppStore.getState().testSuites).toEqual([]);
    expect(useAppStore.getState().testRuns).toEqual([]);
    expect(screen.getByTestId("tests-empty")).toBeInTheDocument();
  });

  it("does not auto-seed for read-only users or when already seeded", () => {
    act(() => useAppStore.setState({ testSuites: [], testCases: [], testRuns: [], testPlans: [], testSharedSteps: [] }));
    renderPage();
    expect(useAppStore.getState().testSuites).toEqual([]);
    expect(screen.getByTestId("tests-empty-load-samples")).toBeInTheDocument();

    window.localStorage.clear();
    mockCanPerform.mockImplementation((key) => key !== "tests:edit");
    renderPage();
    expect(useAppStore.getState().testSuites).toEqual([]);
  });

  it("imports cases from CSV, creating folders by path", () => {
    renderPage("tab=repository");
    fireEvent.click(screen.getByTestId("tests-options"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Import cases from CSV/ }));
    const modal = screen.getByTestId("tests-csv-import");
    fireEvent.change(within(modal).getByTestId("tests-csv-text"), {
      target: { value: 'Title,Folder,Priority,Steps\n"Reset password",Web App / Auth / Recovery,High,"1. Open | | Form\n2. Submit | x@y.z | Mail sent"\nRate limit,API,Low,' },
    });
    expect(within(modal).getAllByRole("row")).toHaveLength(3);
    fireEvent.click(within(modal).getByTestId("tests-csv-submit"));
    const state = useAppStore.getState();
    const recovery = state.testSuites.find((suite) => suite.name === "Recovery");
    expect(recovery).toEqual(expect.objectContaining({ parentId: "f-auth", projectId: "proj-1" }));
    const imported = state.testCases.filter((testCase) => ["Reset password", "Rate limit"].includes(testCase.title));
    expect(imported.map((testCase) => [testCase.title, testCase.suiteId, testCase.seq])).toEqual([["Reset password", recovery.id, 4], ["Rate limit", "s-api", 5]]);
    expect(imported[0].steps).toEqual([expect.objectContaining({ action: "Open", expected: "Form" }), expect.objectContaining({ action: "Submit", data: "x@y.z", expected: "Mail sent" })]);
    expect(mockAddToast).toHaveBeenCalledWith("Imported 2 test cases and 1 folder", "success");
  });

  it("moves cases by dragging them onto a folder and reorders folders by drag", () => {
    renderPage("tab=repository");
    const store = {};
    const dataTransfer = {
      setData: (type, value) => { store[type] = value; },
      getData: (type) => store[type],
      get types() { return Object.keys(store); },
      effectAllowed: "move",
      dropEffect: "move",
    };
    fireEvent.dragStart(screen.getByTestId("tests-case-row-c3"), { dataTransfer });
    const folder = screen.getByTestId("tests-folder-f-auth");
    fireEvent.dragOver(folder, { dataTransfer });
    fireEvent.drop(folder, { dataTransfer });
    expect(useAppStore.getState().testCases.find((testCase) => testCase.id === "c3").suiteId).toBe("f-auth");

    Object.keys(store).forEach((key) => delete store[key]);
    fireEvent.dragStart(screen.getByTestId("tests-folder-s-api"), { dataTransfer });
    fireEvent.dragOver(screen.getByTestId("tests-folder-s-web"), { dataTransfer });
    fireEvent.drop(screen.getByTestId("tests-folder-s-web"), { dataTransfer });
    // jsdom has no layout → drop zone "inside": API becomes a sub-folder of Web App.
    expect(useAppStore.getState().testSuites.find((suite) => suite.id === "s-api").parentId).toBe("s-web");
  });

  it("deletes a folder with its cases after confirmation", () => {
    renderPage("tab=repository");
    const tree = screen.getByTestId("tests-suite-tree");
    fireEvent.click(screen.getByTestId("tests-folder-s-web"));
    fireEvent.keyDown(tree, { key: "Delete" });
    expect(screen.getByRole("alertdialog")).toHaveTextContent("2 test cases and 1 sub-folder will be deleted.");
    fireEvent.click(screen.getByTestId("tests-confirm"));
    const state = useAppStore.getState();
    expect(state.testSuites.map((suite) => suite.id)).toEqual(["s-api"]);
    expect(state.testCases.map((testCase) => testCase.id)).toEqual(["c3"]);
  });

  it("creates a shared step group in the library", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("tests-options"));
    fireEvent.click(screen.getByRole("menuitem", { name: /Shared steps library/ }));
    const library = screen.getByTestId("tests-shared-steps");
    expect(library).toHaveTextContent("used by 0 cases");
    fireEvent.click(within(library).getByTestId("tests-shared-new"));
    fireEvent.change(within(library).getByTestId("tests-shared-name"), { target: { value: "Reset test data" } });
    fireEvent.change(within(library).getByLabelText("Step 1 action"), { target: { value: "POST /fixtures/reset" } });
    fireEvent.click(within(library).getByTestId("tests-shared-save"));
    expect(useAppStore.getState().testSharedSteps.map((group) => group.name)).toEqual(["Login as admin", "Reset test data"]);
    expect(useAppStore.getState().testSharedSteps[1].steps[0].action).toBe("POST /fixtures/reset");
  });

  it("shows my queue grouped by cycle and starts the runner at the first open case", () => {
    renderPage("tab=executions");
    const group = screen.getByTestId("tests-queue-r1");
    expect(group).toHaveTextContent("1 open of 2");
    fireEvent.click(within(group).getByTestId("tests-queue-start-r1"));
    expect(screen.getByTestId("tests-runner-title")).toHaveTextContent("Login works");
  });

  it("closes stacked overlays one layer at a time with Escape", () => {
    renderPage("tab=plans&cycle=r1");
    expect(screen.getByTestId("tests-cycle-drawer")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("tests-cycle-run"));
    expect(screen.getByTestId("tests-runner")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("tests-runner")).not.toBeInTheDocument();
    expect(screen.getByTestId("tests-cycle-drawer")).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByTestId("tests-cycle-drawer")).not.toBeInTheDocument();
  });
});
