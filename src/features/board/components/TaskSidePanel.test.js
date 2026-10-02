import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import TaskSidePanel from "./TaskSidePanel";

const mockUseApp = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }) => children,
  motion: {
    div: ({ children, initial, animate, exit, transition, ...props }) => <div {...props}>{children}</div>,
  },
}));

jest.mock("@headlessui/react", () => {
  const Listbox = ({ children }) => <div>{children}</div>;
  Listbox.Button = ({ children, ...props }) => <button type="button" {...props}>{children}</button>;
  Listbox.Options = ({ children }) => <div>{children}</div>;
  Listbox.Option = ({ children, className, value, ...props }) => (
    <div
      {...props}
      data-value={value}
      className={typeof className === "function" ? className({ active: false, selected: false }) : className}
    >
      {typeof children === "function" ? children({ active: false, selected: false }) : children}
    </div>
  );
  return { Listbox };
});

jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("../../../shared/context/ToastContext", () => ({ useToast: () => ({ addToast: jest.fn() }) }));
jest.mock("../../docs/components/CommentSection", () => () => <div data-testid="comment-section" />);
jest.mock("./SubtaskDetailPanel", () => () => null);
jest.mock("./TaskDetailModal", () => (props) => (
  <div data-testid="full-view">
    <span>{props.task.title}</span>
    <span>{`dirty:${String(props.initialDirty)}`}</span>
  </div>
));

const TASK = {
  id: "CY-10",
  title: "Original title",
  status: "todo",
  priority: "medium",
  assignedTo: "alice",
  projectId: "proj-1",
};

function appMock(overrides = {}) {
  return {
    labels: [],
    deleteTask: jest.fn(),
    logActivity: jest.fn(),
    allTasks: [TASK],
    users: [],
    teamMembers: [
      { value: "", label: "All Members" },
      { value: "unassigned", label: "Unassigned" },
      { value: "alice", label: "Alice" },
    ],
    currentProjectId: "proj-1",
    projects: [{ id: "proj-1", workflowRules: { captureBlockReason: true } }],
    projectColumns: {
      "proj-1": [
        { id: "todo", title: "To Do" },
        { id: "custom_qa", title: "QA" },
        { id: "blocked", title: "Blocked" },
      ],
    },
    columns: [],
    epics: [{ id: "epic-a", title: "Mine", projectId: "proj-1" }, { id: "epic-b", title: "Foreign", projectId: "proj-2" }],
    docPages: [],
    spaces: [],
    releases: [],
    testSuites: [],
    testCases: [],
    testRuns: [],
    ...overrides,
  };
}

describe("TaskSidePanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApp.mockReturnValue(appMock());
    mockUseAuth.mockReturnValue({ role: "member", isAdmin: false });
  });

  it("opens the full TaskDetailModal with unsaved edits when no onOpenModal is given", async () => {
    render(<TaskSidePanel open task={TASK} onClose={jest.fn()} onTaskUpdate={jest.fn()} />);

    fireEvent.change(screen.getByDisplayValue("Original title"), { target: { value: "Edited title" } });
    fireEvent.click(screen.getByTitle("Open full view"));

    const fullView = await screen.findByTestId("full-view");
    expect(fullView).toHaveTextContent("Edited title");
    expect(fullView).toHaveTextContent("dirty:true");
  });

  it("passes the draft to onOpenModal when the host handles the full view", () => {
    const onOpenModal = jest.fn();
    render(<TaskSidePanel open task={TASK} onClose={jest.fn()} onTaskUpdate={jest.fn()} onOpenModal={onOpenModal} />);

    fireEvent.change(screen.getByDisplayValue("Original title"), { target: { value: "Draft" } });
    fireEvent.click(screen.getByTitle("Open full view"));

    expect(onOpenModal).toHaveBeenCalledWith(expect.objectContaining({ title: "Draft" }), { hasChanges: true });
  });

  it("closes on Escape when there are no unsaved changes", () => {
    const onClose = jest.fn();
    render(<TaskSidePanel open task={TASK} onClose={onClose} onTaskUpdate={jest.fn()} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("offers custom project columns as statuses and only the project's epics", () => {
    render(<TaskSidePanel open task={TASK} onClose={jest.fn()} onTaskUpdate={jest.fn()} />);

    expect(screen.getByText("QA")).toBeInTheDocument();
    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(screen.queryByText("Foreign")).not.toBeInTheDocument();
  });

  it("hides delete and disables editing for viewers", () => {
    mockUseAuth.mockReturnValue({ role: "viewer", isAdmin: false });
    render(<TaskSidePanel open task={TASK} onClose={jest.fn()} onTaskUpdate={jest.fn()} />);

    expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Original title")).toBeDisabled();
  });
  it("auto-saves custom fields on blur / toggle and rejects malformed values", () => {
    const onTaskUpdate = jest.fn();
    mockUseApp.mockReturnValue(appMock({
      customFieldDefs: [
        { id: "cf-cu", projectId: "proj-1", name: "Customer", type: "text", order: 0 },
        { id: "cf-url", projectId: "proj-1", name: "Spec", type: "url", order: 1 },
        { id: "cf-chk", projectId: "proj-1", name: "Customer facing", type: "checkbox", order: 2 },
        { id: "cf-bug", projectId: "proj-1", name: "Bug only", type: "text", order: 3, appliesToTypes: ["bug"] },
      ],
    }));
    render(<TaskSidePanel open task={{ ...TASK, customFields: { "cf-cu": "Acme" } }} onClose={jest.fn()} onTaskUpdate={onTaskUpdate} />);
    expect(screen.queryByText("Bug only")).not.toBeInTheDocument();

    const customer = screen.getByLabelText("Customer", { selector: "input" });
    fireEvent.blur(customer, { target: { value: "Acme" } });
    expect(onTaskUpdate).not.toHaveBeenCalled(); // unchanged value

    fireEvent.change(customer, { target: { value: "Beta" } });
    expect(onTaskUpdate).not.toHaveBeenCalled(); // drafts are not saved while typing
    fireEvent.blur(customer, { target: { value: "Beta" } });
    expect(onTaskUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ customFields: { "cf-cu": "Beta" } }));

    fireEvent.click(screen.getByRole("checkbox", { name: "Customer facing" }));
    expect(onTaskUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ customFields: expect.objectContaining({ "cf-chk": true }) }));

    onTaskUpdate.mockClear();
    const spec = screen.getByLabelText("Spec", { selector: "input" });
    fireEvent.change(spec, { target: { value: "nope" } });
    fireEvent.blur(spec, { target: { value: "nope" } });
    expect(onTaskUpdate).not.toHaveBeenCalled();
  });

});
