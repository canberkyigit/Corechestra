import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import AutomationTab from "./AutomationTab";

const mockUseApp = jest.fn();
const mockAuth = { role: "admin", isAdmin: true };
const mockAddToast = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

jest.mock("../../../shared/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

const COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

function buildApp(overrides = {}) {
  return {
    automationRules: [],
    automationLog: [],
    createAutomationRule: jest.fn(),
    updateAutomationRule: jest.fn(),
    toggleAutomationRule: jest.fn(),
    duplicateAutomationRule: jest.fn(),
    deleteAutomationRule: jest.fn(),
    clearAutomationLog: jest.fn(),
    currentProjectId: "p1",
    projects: [{ id: "p1", name: "Mobile" }],
    columns: COLUMNS,
    users: [{ id: "u1", username: "alice", name: "Alice", status: "active" }],
    labels: [],
    epics: [],
    allTasks: [{ id: "CY-1", title: "Login bug", projectId: "p1" }],
    ...overrides,
  };
}

describe("AutomationTab", () => {
  beforeEach(() => {
    mockAuth.role = "admin";
    mockAuth.isAdmin = true;
    mockAddToast.mockClear();
  });

  it("creates a rule from a template", () => {
    const app = buildApp();
    mockUseApp.mockReturnValue(app);
    render(<AutomationTab />);

    expect(screen.getByText("Put repetitive work on autopilot")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tell the reporter when work is done/i }));

    const dialog = screen.getByRole("dialog", { name: /new automation rule/i });
    expect(within(dialog).getByLabelText("Rule name")).toHaveValue("Tell the reporter when work is done");
    fireEvent.click(within(dialog).getByRole("button", { name: "Create rule" }));

    expect(app.createAutomationRule).toHaveBeenCalledWith(expect.objectContaining({
      name: "Tell the reporter when work is done",
      projectId: "p1",
      trigger: { type: "status_changed", config: { from: "", to: "done" } },
      actions: [expect.objectContaining({ type: "notify", config: expect.objectContaining({ to: "reporter" }) })],
    }));
  });

  it("builds a rule from scratch and blocks saving until it is valid", () => {
    const app = buildApp();
    mockUseApp.mockReturnValue(app);
    render(<AutomationTab />);

    fireEvent.click(screen.getByRole("button", { name: /new rule/i }));
    const dialog = screen.getByRole("dialog", { name: /new automation rule/i });

    fireEvent.click(within(dialog).getByRole("button", { name: "Create rule" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Give the rule a name.");
    expect(app.createAutomationRule).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText("Rule name"), { target: { value: "Review ready" } });
    fireEvent.change(within(dialog).getByLabelText("To status"), { target: { value: "review" } });
    fireEvent.change(within(dialog).getByLabelText("Add action"), { target: { value: "set_assignee" } });
    fireEvent.change(within(dialog).getByLabelText("Assignee mode"), { target: { value: "reporter" } });

    expect(within(dialog).getByText("status changes to Review")).toBeInTheDocument();
    expect(within(dialog).getByText("assign to the reporter")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Create rule" }));
    expect(app.createAutomationRule).toHaveBeenCalledWith(expect.objectContaining({
      name: "Review ready",
      trigger: { type: "status_changed", config: { from: "", to: "review" } },
      actions: [expect.objectContaining({ type: "set_assignee", config: { mode: "reporter", user: "" } })],
    }));
  });

  it("lists rules with their log and lets admins toggle them", () => {
    const app = buildApp({
      automationRules: [
        {
          id: "r1",
          name: "Notify on done",
          enabled: true,
          projectId: "p1",
          trigger: { type: "status_changed", config: { to: "done" } },
          conditions: [],
          actions: [{ id: "a1", type: "notify", config: { to: "reporter" } }],
          runCount: 2,
          lastStatus: "success",
        },
        {
          id: "r2",
          name: "Workspace kickoff",
          enabled: false,
          projectId: null,
          trigger: { type: "sprint_started", config: {} },
          conditions: [],
          actions: [{ id: "a2", type: "notify", config: { to: "everyone" } }],
        },
      ],
      automationLog: [
        { id: "l1", ruleId: "r1", ruleName: "Notify on done", projectId: "p1", taskId: "CY-1", trigger: "status_changed", status: "error", message: "Notification has no recipient.", at: new Date().toISOString(), depth: 0 },
      ],
    });
    mockUseApp.mockReturnValue(app);
    render(<AutomationTab />);

    expect(screen.getByRole("article", { name: /notify on done/i })).toHaveTextContent("status changes to Done");
    expect(screen.getByText("All projects", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Notification has no recipient.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /disable notify on done/i }));
    expect(app.toggleAutomationRule).toHaveBeenCalledWith("r1", false);
  });

  it("is read-only for members without the permission", () => {
    mockAuth.role = "member";
    mockAuth.isAdmin = false;
    mockUseApp.mockReturnValue(buildApp({
      automationRules: [{
        id: "r1",
        name: "Notify on done",
        enabled: true,
        projectId: "p1",
        trigger: { type: "status_changed", config: { to: "done" } },
        conditions: [],
        actions: [{ id: "a1", type: "notify", config: { to: "reporter" } }],
      }],
    }));
    render(<AutomationTab />);

    expect(screen.queryByRole("button", { name: /new rule/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit notify on done/i })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /disable notify on done/i })).toBeDisabled();
  });
});
