import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import TestsPage from "./TestsPage";

const mockUseApp = jest.fn();
const mockAddToast = jest.fn();
const mockCanPerform = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: "/tests" }),
}), { virtual: true });
jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/ToastContext", () => ({ useToast: () => ({ addToast: mockAddToast }) }));
jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canPerform: (key) => mockCanPerform(key), canAccessPage: () => true }),
}));
jest.mock("../../../shared/components/Skeleton", () => ({ TestsSkeleton: () => <div>loading tests</div> }));
jest.mock("../../../shared/components/SavedViewsBar", () => () => <div data-testid="saved-views" />);
jest.mock("../../../shared/context/hooks/useSavedViews", () => ({
  useSavedViews: () => ({ views: [], activeViewId: null, saveCurrentView: jest.fn(), deleteView: jest.fn() }),
}));

const baseCases = [
  { id: "case-1-1", suiteId: "suite-1", title: "Login works", priority: "high", steps: ["Open", "Submit"], expectedResult: "Dashboard" },
  { id: "tc-2", suiteId: "suite-1", title: "Logout works", priority: "medium", regressionPacks: ["smoke"] },
  { id: "tc-3", suiteId: "suite-1", title: "Reset password", priority: "critical", regressionPacks: ["smoke"] },
];

function createAppValue(overrides = {}) {
  return {
    dbReady: true,
    currentUser: "alice",
    currentProjectId: "proj-1",
    projects: [{ id: "proj-1", name: "Corechestra" }],
    users: [{ id: "u-1", username: "alice", name: "Alice" }],
    labels: [{ id: "lbl-qa", name: "QA" }],
    allTasks: [],
    releases: [],
    testSuites: [
      { id: "suite-1", projectId: "proj-1", name: "Auth Suite" },
      { id: "ts-2", projectId: "proj-1", name: "Billing Suite" },
      { id: "ts-other", projectId: "proj-2", name: "Other Project Suite" },
    ],
    testCases: baseCases,
    testRuns: [],
    testPlans: [],
    createTask: jest.fn(() => ({ id: "CY-777" })),
    createTestPlan: jest.fn(),
    updateTestPlan: jest.fn(),
    deleteTestPlan: jest.fn(),
    createTestSuite: jest.fn((data) => ({ ...data, id: "ts-new" })),
    updateTestSuite: jest.fn(),
    deleteTestSuite: jest.fn(),
    createTestCase: jest.fn(),
    updateTestCase: jest.fn(),
    deleteTestCase: jest.fn(),
    createTestRun: jest.fn((data) => ({ ...data, id: "tr-new" })),
    createTestRuns: jest.fn((items) => items),
    updateTestRun: jest.fn(),
    deleteTestRun: jest.fn(),
    updateTestRunResult: jest.fn(),
    ...overrides,
  };
}

function renderPage(overrides) {
  const app = createAppValue(overrides);
  mockUseApp.mockReturnValue(app);
  const utils = render(<TestsPage />);
  return { app, ...utils };
}

const openTab = (name) => fireEvent.click(screen.getByRole("tab", { name: new RegExp(name) }));

describe("TestsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanPerform.mockReturnValue(true);
  });

  it("renders the skeleton until data is ready", () => {
    renderPage({ dbReady: false });
    expect(screen.getByText("loading tests")).toBeInTheDocument();
  });

  it("scopes suites to the current project and defaults to the queue", () => {
    renderPage();
    expect(screen.getByText("Auth Suite")).toBeInTheDocument();
    expect(screen.queryByText("Other Project Suite")).not.toBeInTheDocument();
    expect(screen.getByText("Tester Queue")).toBeInTheDocument();
  });

  it("does not crash on runs without createdAt and shows scoped run progress", () => {
    renderPage({
      testRuns: [
        { id: "run-legacy", suiteId: "suite-1", name: "Legacy run", status: "in-progress", caseIds: ["tc-2", "tc-3"], results: [{ caseId: "tc-2", status: "passed" }, { caseId: "tc-3", status: "untested" }] },
      ],
    });
    openTab("Test Runs");
    const card = screen.getByTestId("run-card-run-legacy");
    expect(within(card).getByText("1 / 2 cases executed")).toBeInTheDocument();
    expect(within(card).getByText("50%")).toBeInTheDocument();
  });

  it("executes only the run's scoped cases and records verdicts", () => {
    const { app } = renderPage({
      testRuns: [
        { id: "tr-1", suiteId: "suite-1", name: "Smoke run", status: "in-progress", assignedTester: "alice", createdAt: "2026-05-01T00:00:00Z", caseIds: ["tc-2", "tc-3"], results: [] },
      ],
    });
    fireEvent.click(screen.getByText("Open Run"));
    expect(screen.getByText("Case 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Logout works")).toBeInTheDocument();
    expect(screen.queryByText("Login works")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Pass/ }));
    expect(app.updateTestRunResult).toHaveBeenCalledWith("tr-1", "tc-2", expect.objectContaining({ status: "passed" }));
  });

  it("asks for confirmation before completing a run with untested cases", () => {
    const { app } = renderPage({
      testRuns: [
        { id: "tr-1", suiteId: "suite-1", name: "Smoke run", status: "in-progress", assignedTester: "alice", createdAt: "2026-05-01T00:00:00Z", caseIds: ["tc-2"], results: [{ caseId: "tc-2", status: "untested" }] },
      ],
    });
    fireEvent.click(screen.getByText("Open Run"));
    fireEvent.click(screen.getByRole("button", { name: /Complete Run/ }));
    expect(screen.getByText("Complete run with untested cases?")).toBeInTheDocument();
    expect(app.updateTestRun).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Complete Run" }));
    expect(app.updateTestRun).toHaveBeenCalledWith(expect.objectContaining({ id: "tr-1", status: "completed" }));
  });

  it("shows correct untested counts in run results", () => {
    renderPage({
      testRuns: [
        {
          id: "tr-done", suiteId: "suite-1", name: "Done run", status: "completed", assignedTester: "alice",
          createdAt: "2026-05-01T00:00:00Z", completedAt: "2026-05-01T02:00:00Z",
          caseIds: ["case-1-1", "tc-2"],
          results: [{ caseId: "case-1-1", status: "failed" }, { caseId: "tc-2", status: "untested" }],
        },
      ],
    });
    openTab("Test Runs");
    fireEvent.click(screen.getByRole("button", { name: /View Results/ }));
    expect(screen.getByTestId("summary-untested")).toHaveTextContent("1Untested");
    expect(screen.getByTestId("summary-failed")).toHaveTextContent("1Failed");
    expect(screen.queryByText("Reset password")).not.toBeInTheDocument();
  });

  it("confirms suite deletion with cascade details", () => {
    const { app } = renderPage({ testPlans: [{ id: "plan-1", projectId: "proj-1", name: "Plan", suiteIds: ["suite-1"] }] });
    fireEvent.click(screen.getByRole("button", { name: "Delete suite Auth Suite" }));
    expect(screen.getByText(/removed from 1 test plan/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(app.deleteTestSuite).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete suite Auth Suite" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Suite" }));
    expect(app.deleteTestSuite).toHaveBeenCalledWith("suite-1");
  });

  it("confirms case deletion and routes suite edits to updateTestSuite", () => {
    const { app } = renderPage();
    fireEvent.click(screen.getByText("Auth Suite"));
    fireEvent.click(screen.getByRole("button", { name: "Delete case Login works" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Case" }));
    expect(app.deleteTestCase).toHaveBeenCalledWith("case-1-1");

    fireEvent.click(screen.getByRole("button", { name: "Auth Suite" }));
    const input = screen.getByLabelText("Suite name");
    fireEvent.change(input, { target: { value: "Auth Suite v2" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(app.updateTestSuite).toHaveBeenCalledWith({ id: "suite-1", name: "Auth Suite v2" });
    expect(app.updateTestCase).not.toHaveBeenCalled();
  });

  it("offers critical priority when creating a case and scopes it to the suite", () => {
    const { app } = renderPage();
    fireEvent.click(screen.getByText("Auth Suite"));
    fireEvent.click(screen.getByRole("button", { name: /New Test Case/ }));
    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Critical path" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "critical" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Test Case" }));
    expect(app.createTestCase).toHaveBeenCalledWith(expect.objectContaining({ title: "Critical path", priority: "critical", suiteId: "suite-1" }));
  });

  it("keeps Move to Draft as a manual override and starts plans through the facade", () => {
    const plan = { id: "plan-1", projectId: "proj-1", name: "Release plan", suiteIds: ["suite-1", "ts-2"], regressionPack: "smoke", status: "draft", assignedTester: "alice" };
    const { app, rerender } = renderPage({ testPlans: [plan] });
    openTab("Test Plans");
    fireEvent.click(screen.getByRole("button", { name: /Start Plan/ }));
    expect(app.createTestRuns).toHaveBeenCalledTimes(1);
    const inputs = app.createTestRuns.mock.calls[0][0];
    expect(inputs).toHaveLength(1); // Billing suite has no cases in scope
    expect(inputs[0]).toEqual(expect.objectContaining({ suiteId: "suite-1", planId: "plan-1", caseIds: ["tc-2", "tc-3"] }));
    expect(app.updateTestPlan).toHaveBeenCalledWith(expect.objectContaining({ id: "plan-1", status: "in-progress", statusOverride: false }));

    // In-progress run → derived "In Progress"; Move to Draft writes an override.
    const runs = [{ id: "tr-1", suiteId: "suite-1", planId: "plan-1", status: "in-progress", createdAt: "2026-05-01T00:00:00Z", caseIds: ["tc-2"], results: [] }];
    mockUseApp.mockReturnValue(createAppValue({ ...app, testPlans: [{ ...plan, status: "in-progress" }], testRuns: runs }));
    rerender(<TestsPage />);
    expect(screen.getByText("Tester Queue")).toBeInTheDocument(); // start switches to the queue
    openTab("Test Plans");
    const card = screen.getByTestId("plan-card-plan-1");
    expect(within(card).getByText("In Progress")).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /Start Plan/ })).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Move to Draft" }));
    expect(app.updateTestPlan).toHaveBeenLastCalledWith({ id: "plan-1", status: "draft", statusOverride: true });

    mockUseApp.mockReturnValue(createAppValue({ ...app, testPlans: [{ ...plan, status: "draft", statusOverride: true }], testRuns: runs }));
    rerender(<TestsPage />);
    expect(within(screen.getByTestId("plan-card-plan-1")).getByText("Draft")).toBeInTheDocument();
  });

  it("marks all-aborted plans as aborted, not completed", () => {
    renderPage({
      testPlans: [{ id: "plan-1", projectId: "proj-1", name: "Plan", suiteIds: ["suite-1"], status: "in-progress" }],
      testRuns: [{ id: "tr-1", suiteId: "suite-1", planId: "plan-1", status: "aborted", createdAt: "2026-05-01T00:00:00Z", results: [] }],
    });
    openTab("Test Plans");
    const card = screen.getByTestId("plan-card-plan-1");
    expect(within(card).getByText("Aborted")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /Restart Plan/ })).toBeInTheDocument();
  });

  it("creates a canonical bug from a failure and links it back", () => {
    const { app } = renderPage({
      testRuns: [{ id: "tr-1", suiteId: "suite-1", name: "Run", status: "in-progress", assignedTester: "alice", createdAt: "2026-05-01T00:00:00Z", caseIds: ["case-1-1"], results: [] }],
    });
    fireEvent.click(screen.getByText("Open Run"));
    fireEvent.click(screen.getByRole("button", { name: /Create Bug/ }));
    expect(app.createTask).toHaveBeenCalledWith(expect.objectContaining({ type: "bug", assignedTo: "unassigned", labels: ["lbl-qa"] }), "active");
    expect(app.updateTestCase).toHaveBeenCalledWith({ id: "case-1-1", linkedBugTaskId: "CY-777" });
    expect(app.updateTestRunResult).toHaveBeenCalledWith("tr-1", "case-1-1", { bugTaskId: "CY-777" });
  });

  it("is read-only for roles without edit permission", () => {
    mockCanPerform.mockReturnValue(false);
    renderPage({
      testRuns: [{ id: "tr-1", suiteId: "suite-1", name: "Run", status: "in-progress", createdAt: "2026-05-01T00:00:00Z", caseIds: ["tc-2"], results: [] }],
    });
    expect(screen.queryByTitle("New Suite")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete suite/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Auth Suite"));
    expect(screen.queryByRole("button", { name: /New Test Case/ })).not.toBeInTheDocument();
    openTab("Test Runs");
    expect(screen.queryByRole("button", { name: /New Test Run/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Abort run/ })).not.toBeInTheDocument();
  });

  it("shows analytics from the latest completed run by date", () => {
    renderPage({
      testRuns: [
        { id: "tr-new", suiteId: "suite-1", name: "Newest", status: "completed", createdAt: "2026-05-03T00:00:00Z", completedAt: "2026-05-03T01:00:00Z", caseIds: ["tc-2"], results: [{ caseId: "tc-2", status: "passed" }] },
        { id: "tr-old", suiteId: "suite-1", name: "Oldest", status: "completed", createdAt: "2026-05-01T00:00:00Z", completedAt: "2026-05-01T01:00:00Z", caseIds: ["tc-2"], results: [{ caseId: "tc-2", status: "failed" }] },
      ],
    });
    fireEvent.click(screen.getByText("Auth Suite"));
    openTab("Analytics");
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getAllByText("Newest").length).toBeGreaterThan(0);
  });
});
