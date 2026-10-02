import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import BacklogTab from "./BacklogTab";

const mockUseApp = jest.fn();
let mockDragEnd = null;

jest.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ onDragEnd, children }) => {
    mockDragEnd = onDragEnd;
    return children;
  },
  Droppable: ({ children }) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, { isDraggingOver: false }),
  Draggable: ({ children }) => children({ innerRef: () => {}, draggableProps: { style: {} }, dragHandleProps: {} }, { isDragging: false }),
}));
jest.mock("react-datepicker", () => () => null);
jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/AuthContext", () => ({ useAuth: () => ({ role: "member", isAdmin: false }) }));
jest.mock("../../../shared/context/ToastContext", () => ({ useToast: () => ({ addToast: jest.fn() }) }));

function appMock(overrides = {}) {
  return {
    activeTasks: [],
    setActiveTasks: jest.fn(),
    backlogSections: [{
      id: 7,
      title: "Backlog",
      tasks: [
        { id: "CY-1", title: "Alpha login" },
        { id: "CY-2", title: "Beta report" },
        { id: "CY-3", title: "Gamma login" },
      ],
    }],
    setBacklogSections: jest.fn(),
    updateTask: jest.fn(() => ({ ok: true })),
    handleBacklogDragEnd: jest.fn(),
    createBacklogSection: jest.fn(),
    deleteBacklogSection: jest.fn(),
    renameBacklogSection: jest.fn(),
    currentProjectId: "proj-1",
    teamMembers: [{ value: "", label: "All Members" }],
    columns: [{ id: "todo", title: "To Do" }, { id: "done", title: "Done" }],
    projects: [],
    projectColumns: {},
    ...overrides,
  };
}

describe("BacklogTab", () => {
  it("maps drag indices from the searched list onto the full section list", () => {
    const app = appMock();
    mockUseApp.mockReturnValue(app);
    render(<BacklogTab onTaskClick={jest.fn()} onPokerClick={jest.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Search backlog tasks/i), { target: { value: "login" } });
    // Visible: Alpha (0), Gamma (1). Drag Gamma above Alpha.
    act(() => {
      mockDragEnd({
        draggableId: "CY-3",
        source: { droppableId: "backlog-7", index: 1 },
        destination: { droppableId: "backlog-7", index: 0 },
      });
    });

    expect(app.handleBacklogDragEnd).toHaveBeenCalledWith(expect.objectContaining({
      draggableId: "CY-3",
      source: expect.objectContaining({ index: 2 }),
      destination: expect.objectContaining({ droppableId: "backlog-7", index: 0 }),
    }));
  });

  it("shows task keys and wires the planning poker shortcut", () => {
    const onPokerClick = jest.fn();
    mockUseApp.mockReturnValue(appMock());
    render(<BacklogTab onTaskClick={jest.fn()} onPokerClick={onPokerClick} />);

    expect(screen.getByText("CY-1")).toBeInTheDocument();
    fireEvent.click(screen.getAllByTitle("Estimate with Planning Poker")[0]);
    expect(onPokerClick).toHaveBeenCalledWith(expect.objectContaining({ id: "CY-1" }));
  });

  it("warns that deleting a section archives its tasks and closes on Escape", () => {
    const app = appMock();
    mockUseApp.mockReturnValue(app);
    render(<BacklogTab onTaskClick={jest.fn()} />);

    fireEvent.click(screen.getByTitle("Delete section"));
    expect(screen.getByText(/3 task\(s\) will be moved to the archive/)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText(/will be moved to the archive/)).not.toBeInTheDocument();
    expect(app.deleteBacklogSection).not.toHaveBeenCalled();
  });
});
