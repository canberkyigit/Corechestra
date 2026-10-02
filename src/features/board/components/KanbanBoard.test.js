import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import KanbanBoard from "./KanbanBoard";

const mockUseApp = jest.fn();
const mockUseAuth = jest.fn();
const mockAddToast = jest.fn();
let mockDragEnd = null;

jest.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ onDragEnd, children }) => {
    mockDragEnd = onDragEnd;
    return children;
  },
  Droppable: ({ droppableId, children }) => (
    <div data-testid="droppable" data-droppable-id={droppableId}>
      {children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, { isDraggingOver: false })}
    </div>
  ),
  Draggable: ({ children }) => children(
    { innerRef: () => {}, draggableProps: { style: {} }, dragHandleProps: {} },
    { isDragging: false }
  ),
}));

jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("../../../shared/context/ToastContext", () => ({ useToast: () => ({ addToast: mockAddToast }) }));

const COLUMNS = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "blocked", title: "Blocked" },
];

function appMock(overrides = {}) {
  return {
    teamMembers: [
      { value: "", label: "All Members" },
      { value: "alice", label: "Alice", color: "#3b82f6" },
      { value: "bob", label: "Bob", color: "#10b981" },
    ],
    currentProjectId: "proj-1",
    projects: [{ id: "proj-1", workflowRules: { captureBlockReason: true } }],
    projectColumns: { "proj-1": COLUMNS },
    columns: COLUMNS,
    epics: [],
    labels: [],
    users: [],
    moveTask: jest.fn(() => ({ ok: true })),
    createTask: jest.fn(),
    ...overrides,
  };
}

const TASKS = [
  { id: "CY-1", title: "First", status: "todo", assignedTo: "alice", projectId: "proj-1" },
  { id: "CY-2", title: "Second", status: "todo", assignedTo: "bob", projectId: "proj-1" },
  { id: "CY-3", title: "Third", status: "todo", assignedTo: "alice", projectId: "proj-1" },
  { id: "CY-4", title: "Legacy", status: "removed_status", projectId: "proj-1" },
];

function renderBoard(props = {}) {
  return render(
    <KanbanBoard
      tasks={TASKS}
      visibleTasks={TASKS}
      columns={COLUMNS}
      allBadgesOpen
      priorityColorsOpen
      taskIdsOpen
      subtaskButtonsOpen
      onTaskClick={jest.fn()}
      {...props}
    />
  );
}

describe("KanbanBoard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockUseAuth.mockReturnValue({ role: "member", isAdmin: false });
  });

  it("renders task keys without double prefixes and shows unmapped tasks", () => {
    mockUseApp.mockReturnValue(appMock());
    renderBoard();

    expect(screen.getByText("CY-1")).toBeInTheDocument();
    expect(screen.queryByText(/CY-CY-/)).not.toBeInTheDocument();
    expect(screen.getByText("Other / Unmapped")).toBeInTheDocument();
    expect(screen.getByText("Legacy")).toBeInTheDocument();
  });

  it("maps filtered drop indices to anchor task ids when moving across columns", async () => {
    const app = appMock();
    mockUseApp.mockReturnValue(app);
    // Filter hides CY-2: rendered index 0 must anchor before CY-1, not the
    // unfiltered array position.
    renderBoard({ visibleTasks: [TASKS[0], TASKS[2]] });

    await act(async () => {
      await mockDragEnd({
        draggableId: "CY-3",
        source: { droppableId: "todo", index: 1 },
        destination: { droppableId: "todo", index: 0 },
      });
    });

    expect(app.moveTask).toHaveBeenCalledWith("CY-3", expect.objectContaining({
      status: "todo",
      beforeTaskId: "CY-1",
      afterTaskId: null,
      patch: {},
    }));
  });

  it("uses unique droppable ids per swimlane and reassigns on cross-lane drops", async () => {
    const app = appMock();
    mockUseApp.mockReturnValue(app);
    renderBoard({ swimlaneMode: "assignee" });

    const ids = screen.getAllByTestId("droppable").map((node) => node.getAttribute("data-droppable-id"));
    expect(new Set(ids).size).toBe(ids.length);

    await act(async () => {
      await mockDragEnd({
        draggableId: "CY-1",
        source: { droppableId: "todo::alice", index: 0 },
        destination: { droppableId: "inprogress::bob", index: 0 },
      });
    });

    expect(app.moveTask).toHaveBeenCalledWith("CY-1", expect.objectContaining({
      status: "inprogress",
      patch: { assignedTo: "bob" },
    }));
  });

  it("asks for a blocker reason before moving into Blocked", async () => {
    const app = appMock();
    mockUseApp.mockReturnValue(app);
    renderBoard();

    let pending;
    act(() => {
      pending = mockDragEnd({
        draggableId: "CY-1",
        source: { droppableId: "todo", index: 0 },
        destination: { droppableId: "blocked", index: 0 },
      });
    });

    const reason = await screen.findByLabelText("Blocker reason");
    expect(app.moveTask).not.toHaveBeenCalled();
    fireEvent.change(reason, { target: { value: "Waiting for API keys" } });
    fireEvent.click(screen.getByRole("button", { name: /Mark as blocked/i }));
    await act(async () => { await pending; });

    expect(app.moveTask).toHaveBeenCalledWith("CY-1", expect.objectContaining({
      status: "blocked",
      blockReason: "Waiting for API keys",
    }));
  });

  it("rejects moves that break workflow rules with a toast", async () => {
    const app = appMock({
      projects: [{ id: "proj-1", workflowRules: { allowBackwardMoves: false, captureBlockReason: false } }],
    });
    mockUseApp.mockReturnValue(app);
    renderBoard({ visibleTasks: [{ ...TASKS[0], status: "inprogress" }] });

    await act(async () => {
      await mockDragEnd({
        draggableId: "CY-1",
        source: { droppableId: "inprogress", index: 0 },
        destination: { droppableId: "todo", index: 0 },
      });
    });

    expect(app.moveTask).not.toHaveBeenCalled();
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(expect.stringMatching(/Backward moves/), "error"));
  });

  it("disables dragging and inline create for viewers", async () => {
    mockUseAuth.mockReturnValue({ role: "viewer", isAdmin: false });
    const app = appMock();
    mockUseApp.mockReturnValue(app);
    renderBoard();

    expect(screen.queryByTitle("Add task")).not.toBeInTheDocument();
    await act(async () => {
      await mockDragEnd({
        draggableId: "CY-1",
        source: { droppableId: "todo", index: 0 },
        destination: { droppableId: "inprogress", index: 0 },
      });
    });
    expect(app.moveTask).not.toHaveBeenCalled();
  });
});
