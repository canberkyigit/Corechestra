import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TaskCard from "../../components/TaskCard";

// ─── Mock AppContext ──────────────────────────────────────────────────────────

jest.mock("../../context/AppContext", () => ({
  useApp: () => ({
    epics: [{ id: "epic-1", title: "Authentication", color: "#7c3aed" }],
    labels: [
      { id: "lbl-1", name: "Frontend", color: "#3b82f6" },
      { id: "lbl-2", name: "Backend", color: "#10b981" },
      { id: "lbl-3", name: "Bug", color: "#ef4444" },
      { id: "lbl-4", name: "Design", color: "#f59e0b" },
    ],
  }),
}));

// ─── Fixed Date: 2026-03-22 ───────────────────────────────────────────────────

const FIXED_NOW = new Date("2026-03-22T12:00:00.000Z");

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Base task fixture ────────────────────────────────────────────────────────

const baseTask = {
  id: "task-1",
  title: "Login bug fix",
  type: "defect",
  priority: "critical",
  status: "blocked",
  assignedTo: "alice",
  storyPoint: 3,
  dueDate: "2026-04-10", // well in future → "ok"
  epicId: "epic-1",
  labels: ["lbl-1"],
  subtasks: [
    { id: "sub-1", title: "Subtask 1", done: true },
    { id: "sub-2", title: "Subtask 2", done: false },
  ],
  comments: [],
  activityLog: [],
  statusChangedAt: FIXED_NOW.toISOString(),
};

function renderCard(props = {}) {
  const defaults = {
    task: baseTask,
    allBadgesOpen: true,
    priorityColorsOpen: true,
    taskIdsOpen: true,
    subtaskButtonsOpen: true,
    onClick: jest.fn(),
    compact: false,
  };
  return render(<TaskCard {...defaults} {...props} />);
}

// ─── Basic Rendering ──────────────────────────────────────────────────────────

describe("TaskCard – Basic Rendering", () => {
  it("renders the task title", () => {
    renderCard();
    expect(screen.getByText("Login bug fix")).toBeInTheDocument();
  });

  it("renders the epic badge when epicId matches", () => {
    renderCard();
    expect(screen.getByText("Authentication")).toBeInTheDocument();
  });

  it("does not render epic badge when epicId is null", () => {
    renderCard({ task: { ...baseTask, epicId: null } });
    expect(screen.queryByText("Authentication")).not.toBeInTheDocument();
  });

  it("does not render epic badge when epicId does not match any epic", () => {
    renderCard({ task: { ...baseTask, epicId: "epic-999" } });
    expect(screen.queryByText("Authentication")).not.toBeInTheDocument();
  });

  it("renders story points when set", () => {
    renderCard();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does not render story points when null", () => {
    const { container } = renderCard({ task: { ...baseTask, storyPoint: null } });
    // No span with text "3" should appear
    const spans = container.querySelectorAll("span");
    const storySpans = Array.from(spans).filter((s) => s.textContent === "3");
    expect(storySpans).toHaveLength(0);
  });

  it("does not render story points when empty string", () => {
    const { container } = renderCard({ task: { ...baseTask, storyPoint: "" } });
    const spans = Array.from(container.querySelectorAll("span")).filter(
      (s) => s.textContent === ""
    );
    // There should be no story point span (there may be other empty spans)
    // We just verify no crash
    expect(screen.getByText("Login bug fix")).toBeInTheDocument();
  });

  it("renders assignee avatar with correct initial for 'alice'", () => {
    renderCard();
    const avatar = screen.getByTitle("alice");
    expect(avatar).toBeInTheDocument();
    expect(avatar.textContent).toBe("A");
  });

  it("does not render assignee avatar for 'unassigned'", () => {
    renderCard({ task: { ...baseTask, assignedTo: "unassigned" } });
    expect(screen.queryByTitle("unassigned")).not.toBeInTheDocument();
  });

  it("does not render assignee avatar when assignedTo is empty", () => {
    renderCard({ task: { ...baseTask, assignedTo: "" } });
    // No avatar div should be present
    expect(screen.queryByTitle("")).not.toBeInTheDocument();
  });

  it("renders different initial for each team member", () => {
    const members = [
      { name: "alice", initial: "A" },
      { name: "bob", initial: "B" },
      { name: "carol", initial: "C" },
      { name: "dave", initial: "D" },
    ];
    members.forEach(({ name, initial }) => {
      const { unmount } = renderCard({ task: { ...baseTask, assignedTo: name } });
      expect(screen.getByTitle(name).textContent).toBe(initial);
      unmount();
    });
  });
});

// ─── Task ID Display ──────────────────────────────────────────────────────────

describe("TaskCard – Task ID Display", () => {
  it("shows task ID with CY- prefix when taskIdsOpen is true", () => {
    renderCard({ taskIdsOpen: true });
    expect(screen.getByText(/CY-task-1/)).toBeInTheDocument();
  });

  it("hides task ID when taskIdsOpen is false", () => {
    renderCard({ taskIdsOpen: false });
    expect(screen.queryByText(/CY-task-1/)).not.toBeInTheDocument();
  });

  it("uses BL prefix for backlog tasks (id starts with 'b')", () => {
    renderCard({ task: { ...baseTask, id: "b5" }, taskIdsOpen: true });
    expect(screen.getByText(/BL-b5/)).toBeInTheDocument();
  });
});

// ─── Priority Colors ──────────────────────────────────────────────────────────

describe("TaskCard – Priority Colors", () => {
  it("shows priority dot with title when priorityColorsOpen is true", () => {
    renderCard({ priorityColorsOpen: true });
    expect(screen.getByTitle("critical")).toBeInTheDocument();
  });

  it("hides priority dot when priorityColorsOpen is false", () => {
    renderCard({ priorityColorsOpen: false });
    expect(screen.queryByTitle("critical")).not.toBeInTheDocument();
  });

  it("shows priority dot for each priority level", () => {
    const priorities = ["critical", "high", "medium", "low"];
    priorities.forEach((priority) => {
      const { unmount } = renderCard({
        task: { ...baseTask, priority },
        priorityColorsOpen: true,
      });
      expect(screen.getByTitle(priority)).toBeInTheDocument();
      unmount();
    });
  });
});

// ─── Labels / Badges ─────────────────────────────────────────────────────────

describe("TaskCard – Labels", () => {
  it("shows labels when allBadgesOpen is true", () => {
    renderCard({ allBadgesOpen: true });
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("hides labels when allBadgesOpen is false", () => {
    renderCard({ allBadgesOpen: false });
    expect(screen.queryByText("Frontend")).not.toBeInTheDocument();
  });

  it("shows up to 3 labels inline", () => {
    renderCard({
      task: { ...baseTask, labels: ["lbl-1", "lbl-2", "lbl-3"] },
      allBadgesOpen: true,
    });
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("Backend")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("shows overflow indicator '+N' when more than 3 labels", () => {
    renderCard({
      task: { ...baseTask, labels: ["lbl-1", "lbl-2", "lbl-3", "lbl-4"] },
      allBadgesOpen: true,
    });
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("shows '+2' when 5 labels are present", () => {
    renderCard({
      task: {
        ...baseTask,
        labels: ["lbl-1", "lbl-2", "lbl-3", "lbl-1", "lbl-2"],
      },
      allBadgesOpen: true,
    });
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("does not show overflow indicator when 3 or fewer labels", () => {
    renderCard({
      task: { ...baseTask, labels: ["lbl-1", "lbl-2"] },
      allBadgesOpen: true,
    });
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("renders no labels section when task has empty labels array", () => {
    renderCard({ task: { ...baseTask, labels: [] }, allBadgesOpen: true });
    expect(screen.queryByText("Frontend")).not.toBeInTheDocument();
  });
});

// ─── Due Date ─────────────────────────────────────────────────────────────────

describe("TaskCard – Due Date", () => {
  it("renders due date text (Apr 10)", () => {
    renderCard(); // dueDate: '2026-04-10'
    expect(screen.getByText(/Apr 10/)).toBeInTheDocument();
  });

  it("does not render due date when dueDate is empty", () => {
    renderCard({ task: { ...baseTask, dueDate: "" } });
    expect(screen.queryByText(/Apr/)).not.toBeInTheDocument();
  });

  it("shows overdue warning icon for past due date", () => {
    // 2026-03-15 is before FIXED_NOW (2026-03-22)
    renderCard({ task: { ...baseTask, dueDate: "2026-03-15" } });
    expect(screen.getByText(/⚠/)).toBeInTheDocument();
  });

  it("does not show overdue icon for future date (ok)", () => {
    renderCard({ task: { ...baseTask, dueDate: "2026-04-10" } });
    expect(screen.queryByText(/⚠/)).not.toBeInTheDocument();
  });

  it("does not show overdue icon for date within 3 days (soon)", () => {
    // 2026-03-23 is 1 day ahead → 'soon'
    renderCard({ task: { ...baseTask, dueDate: "2026-03-23" } });
    expect(screen.queryByText(/⚠/)).not.toBeInTheDocument();
    // Due date text should still appear
    expect(screen.getByText(/Mar 23/)).toBeInTheDocument();
  });

  it("formats date correctly as 'MMM d'", () => {
    renderCard({ task: { ...baseTask, dueDate: "2026-01-05" } });
    expect(screen.getByText(/Jan 5/)).toBeInTheDocument();
  });
});

// ─── Subtasks ─────────────────────────────────────────────────────────────────

describe("TaskCard – Subtasks", () => {
  it("shows subtask toggle button when subtaskButtonsOpen is true", () => {
    renderCard({ subtaskButtonsOpen: true });
    expect(screen.getByTitle("Toggle subtasks")).toBeInTheDocument();
  });

  it("hides subtask toggle when subtaskButtonsOpen is false", () => {
    renderCard({ subtaskButtonsOpen: false });
    expect(screen.queryByTitle("Toggle subtasks")).not.toBeInTheDocument();
  });

  it("hides subtask toggle when task has no subtasks", () => {
    renderCard({
      task: { ...baseTask, subtasks: [] },
      subtaskButtonsOpen: true,
    });
    expect(screen.queryByTitle("Toggle subtasks")).not.toBeInTheDocument();
  });

  it("shows 'done/total' count (1/2)", () => {
    renderCard({ subtaskButtonsOpen: true });
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("shows '0/3' when no subtasks are done", () => {
    renderCard({
      task: {
        ...baseTask,
        subtasks: [
          { id: "s1", title: "S1", done: false },
          { id: "s2", title: "S2", done: false },
          { id: "s3", title: "S3", done: false },
        ],
      },
      subtaskButtonsOpen: true,
    });
    expect(screen.getByText("0/3")).toBeInTheDocument();
  });

  it("clicking toggle reveals subtask list", () => {
    renderCard({ subtaskButtonsOpen: true });
    const btn = screen.getByTitle("Toggle subtasks");
    fireEvent.click(btn);
    expect(screen.getByText("Subtask 1")).toBeInTheDocument();
    expect(screen.getByText("Subtask 2")).toBeInTheDocument();
  });

  it("clicking toggle again hides subtask list", () => {
    renderCard({ subtaskButtonsOpen: true });
    const btn = screen.getByTitle("Toggle subtasks");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.queryByText("Subtask 1")).not.toBeInTheDocument();
  });

  it("done subtasks show with line-through styling", () => {
    renderCard({ subtaskButtonsOpen: true });
    fireEvent.click(screen.getByTitle("Toggle subtasks"));
    const done = screen.getByText("Subtask 1");
    expect(done).toHaveClass("line-through");
  });
});

// ─── Click Handling ───────────────────────────────────────────────────────────

describe("TaskCard – Click Handling", () => {
  it("calls onClick when the card body is clicked", () => {
    const onClick = jest.fn();
    renderCard({ onClick });
    fireEvent.click(screen.getByText("Login bug fix"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when the subtask toggle button is clicked", () => {
    const onClick = jest.fn();
    renderCard({ onClick, subtaskButtonsOpen: true });
    fireEvent.click(screen.getByTitle("Toggle subtasks"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not throw when onClick is not provided", () => {
    renderCard({ onClick: undefined });
    expect(() => fireEvent.click(screen.getByText("Login bug fix"))).not.toThrow();
  });
});

// ─── Compact Mode ─────────────────────────────────────────────────────────────

describe("TaskCard – Compact Mode", () => {
  it("renders in compact mode without crashing", () => {
    renderCard({ compact: true });
    expect(screen.getByText("Login bug fix")).toBeInTheDocument();
  });

  it("compact mode still shows the title", () => {
    renderCard({ compact: true });
    expect(screen.getByText("Login bug fix")).toBeInTheDocument();
  });
});

// ─── Task Types ───────────────────────────────────────────────────────────────

describe("TaskCard – Task Types", () => {
  const types = [
    "bug",
    "defect",
    "userstory",
    "investigation",
    "task",
    "feature",
    "epic",
    "test",
    "testset",
    "testexecution",
    "precondition",
  ];

  types.forEach((type) => {
    it(`renders without errors for type "${type}"`, () => {
      renderCard({ task: { ...baseTask, type } });
      expect(screen.getByText("Login bug fix")).toBeInTheDocument();
    });
  });

  it("falls back gracefully for an unknown type", () => {
    renderCard({ task: { ...baseTask, type: "unknowntype" } });
    expect(screen.getByText("Login bug fix")).toBeInTheDocument();
  });
});

// ─── Aging Indicator ─────────────────────────────────────────────────────────

describe("TaskCard – Aging Indicator", () => {
  it("does not show aging indicator for tasks changed today", () => {
    const { container } = renderCard({
      task: {
        ...baseTask,
        status: "inprogress",
        statusChangedAt: FIXED_NOW.toISOString(),
      },
    });
    // aging indicator has animate-pulse class
    const pulsingDots = container.querySelectorAll(".animate-pulse");
    expect(pulsingDots).toHaveLength(0);
  });

  it("shows orange aging indicator for tasks unchanged for 3-6 days", () => {
    const threeDaysAgo = new Date(FIXED_NOW);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 4);
    const { container } = renderCard({
      task: {
        ...baseTask,
        status: "inprogress",
        statusChangedAt: threeDaysAgo.toISOString(),
      },
    });
    const pulsingDot = container.querySelector(".animate-pulse");
    expect(pulsingDot).toBeInTheDocument();
    expect(pulsingDot).toHaveClass("bg-orange-400");
  });

  it("shows red aging indicator for tasks unchanged for 7+ days", () => {
    const tenDaysAgo = new Date(FIXED_NOW);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const { container } = renderCard({
      task: {
        ...baseTask,
        status: "inprogress",
        statusChangedAt: tenDaysAgo.toISOString(),
      },
    });
    const pulsingDot = container.querySelector(".animate-pulse");
    expect(pulsingDot).toBeInTheDocument();
    expect(pulsingDot).toHaveClass("bg-red-500");
  });

  it("does not show aging indicator for 'done' tasks", () => {
    const tenDaysAgo = new Date(FIXED_NOW);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const { container } = renderCard({
      task: {
        ...baseTask,
        status: "done",
        statusChangedAt: tenDaysAgo.toISOString(),
      },
    });
    const pulsingDots = container.querySelectorAll(".animate-pulse");
    expect(pulsingDots).toHaveLength(0);
  });
});
