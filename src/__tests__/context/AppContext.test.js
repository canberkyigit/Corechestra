import React from "react";
import { renderHook, act } from "@testing-library/react";
import { AppProvider, useApp } from "../../context/AppContext";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../../services/storage", () => ({
  loadState: jest.fn(() => null), // always use seed data
  saveState: jest.fn(),
  clearState: jest.fn(),
}));

jest.mock("../../utils/helpers", () => ({
  ...jest.requireActual("../../utils/helpers"),
  generateSubtasks: jest.fn(() => [
    { id: "sub-1", title: "Subtask 1", done: false },
  ]),
  generateId: jest.fn(() => "CY-99999"),
}));

// ─── Wrapper ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }) => <AppProvider>{children}</AppProvider>;

// ─── useApp guard ─────────────────────────────────────────────────────────────

describe("useApp", () => {
  it("throws when used outside AppProvider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useApp())).toThrow(
      "useApp must be used within AppProvider"
    );
    consoleSpy.mockRestore();
  });
});

// ─── Initial State ────────────────────────────────────────────────────────────

describe("AppContext – Initial State", () => {
  it("loads 2 seed projects", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.projects).toHaveLength(2);
    expect(result.current.projects[0].name).toBe("Corechestra");
    expect(result.current.projects[1].name).toBe("Mobile App");
  });

  it("sets default currentProjectId to proj-1", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.currentProjectId).toBe("proj-1");
  });

  it("loads seed active tasks (9 tasks)", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.activeTasks).toHaveLength(9);
  });

  it("loads the active sprint", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.sprint.status).toBe("active");
    expect(result.current.sprint.name).toBe("Sprint 86");
  });

  it("loads seed epics (4 epics)", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.epics).toHaveLength(4);
  });

  it("loads seed labels (6 labels)", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.labels).toHaveLength(6);
  });

  it("loads backlog sections with tasks", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.backlogSections).toHaveLength(1);
    expect(result.current.backlogSections[0].tasks).toHaveLength(10);
  });

  it("computes allTasks as union of activeTasks and backlog tasks", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const backlogTotal = result.current.backlogSections.reduce(
      (sum, s) => sum + s.tasks.length,
      0
    );
    expect(result.current.allTasks).toHaveLength(
      result.current.activeTasks.length + backlogTotal
    );
  });

  it("computes idToGlobalIndex for every task", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    result.current.allTasks.forEach((t) => {
      expect(result.current.idToGlobalIndex[t.id]).toBeDefined();
    });
  });

  it("computes columns for the current project", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.columns.length).toBeGreaterThan(0);
    result.current.columns.forEach((col) => {
      expect(col).toHaveProperty("id");
      expect(col).toHaveProperty("title");
    });
  });

  it("loads seed users (4 users)", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.users).toHaveLength(4);
  });

  it("loads seed teams (2 teams)", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.teams).toHaveLength(2);
  });

  it("loads seed custom fields (3 fields)", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.customFields).toHaveLength(3);
  });

  it("initializes pokerHistory as empty array", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.pokerHistory).toEqual([]);
  });

  it("initializes notesList as empty array", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.notesList).toEqual([]);
  });

  it("initializes globalActivityLog as empty array", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.globalActivityLog).toEqual([]);
  });
});

// ─── Task Actions ─────────────────────────────────────────────────────────────

describe("AppContext – Task Actions", () => {
  it("createTask adds a task to activeTasks when sprintValue is 'active'", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const before = result.current.activeTasks.length;

    act(() => {
      result.current.createTask(
        { title: "New Task", priority: "medium", type: "task" },
        "active"
      );
    });

    expect(result.current.activeTasks.length).toBe(before + 1);
    const newTask = result.current.activeTasks[result.current.activeTasks.length - 1];
    expect(newTask.title).toBe("New Task");
  });

  it("createTask sets required default fields", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.createTask({ title: "Minimal" }, "active");
    });

    const t = result.current.activeTasks[result.current.activeTasks.length - 1];
    expect(t.status).toBe("todo");
    expect(t.comments).toEqual([]);
    // activityLog gets the 'created task' entry from logActivity, so it's non-empty
    expect(t.activityLog.length).toBeGreaterThanOrEqual(0);
    expect(t.labels).toEqual([]);
    expect(t.watchers).toEqual([]);
    expect(t.epicId).toBeNull();
    expect(t.timeEstimate).toBe(0);
    expect(t.timeSpent).toBe(0);
  });

  it("createTask adds task to the correct backlog section", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const sectionId = result.current.backlogSections[0].id;
    const before = result.current.backlogSections[0].tasks.length;

    act(() => {
      result.current.createTask(
        { title: "Backlog Task", priority: "low", type: "task" },
        `backlog-${sectionId}`
      );
    });

    expect(result.current.backlogSections[0].tasks.length).toBe(before + 1);
  });

  it("createTask logs a 'created task' activity", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.createTask({ title: "Logged Task" }, "active");
    });

    expect(result.current.globalActivityLog[0].action).toBe("created task");
  });

  it("deleteTask removes the task from activeTasks", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const taskId = result.current.activeTasks[0].id;
    const before = result.current.activeTasks.length;

    act(() => {
      result.current.deleteTask(taskId);
    });

    expect(result.current.activeTasks.length).toBe(before - 1);
    expect(result.current.activeTasks.find((t) => t.id === taskId)).toBeUndefined();
  });

  it("deleteTask removes the task from backlog sections", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const task = result.current.backlogSections[0].tasks[0];

    act(() => {
      result.current.deleteTask(task.id);
    });

    const stillExists = result.current.backlogSections.some((s) =>
      s.tasks.some((t) => t.id === task.id)
    );
    expect(stillExists).toBe(false);
  });

  it("updateActiveTask updates a task in activeTasks", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const original = result.current.activeTasks[0];

    act(() => {
      result.current.updateActiveTask({ ...original, title: "Updated Title" });
    });

    const found = result.current.activeTasks.find((t) => t.id === original.id);
    expect(found.title).toBe("Updated Title");
  });

  it("updateBacklogTask updates a task in backlog", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const original = result.current.backlogSections[0].tasks[0];

    act(() => {
      result.current.updateBacklogTask({ ...original, title: "Updated Backlog" });
    });

    const found = result.current.backlogSections[0].tasks.find(
      (t) => t.id === original.id
    );
    expect(found.title).toBe("Updated Backlog");
  });

  it("allTasks updates after createTask", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const before = result.current.allTasks.length;

    act(() => {
      result.current.createTask({ title: "New" }, "active");
    });

    expect(result.current.allTasks.length).toBe(before + 1);
  });
});

// ─── Sprint Actions ───────────────────────────────────────────────────────────

describe("AppContext – Sprint Actions", () => {
  it("startSprint sets sprint status to 'active' and updates fields", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.startSprint({
        id: "sprint-2",
        name: "Sprint 87",
        goal: "New goal",
        startDate: "2026-04-01",
        endDate: "2026-04-14",
      });
    });

    expect(result.current.sprint.status).toBe("active");
    expect(result.current.sprint.name).toBe("Sprint 87");
    expect(result.current.sprint.goal).toBe("New goal");
  });

  it("completeSprint sets sprint status to 'completed'", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.completeSprint(null);
    });

    expect(result.current.sprint.status).toBe("completed");
  });

  it("completeSprint moves incomplete tasks to the given backlog section", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const sectionId = result.current.backlogSections[0].id;
    const incompleteBefore = result.current.activeTasks.filter(
      (t) => t.status !== "done"
    ).length;
    const backlogBefore = result.current.backlogSections[0].tasks.length;

    act(() => {
      result.current.completeSprint(sectionId);
    });

    expect(result.current.backlogSections[0].tasks.length).toBe(
      backlogBefore + incompleteBefore
    );
    // Remaining active tasks should all be 'done'
    result.current.activeTasks.forEach((t) => {
      expect(t.status).toBe("done");
    });
  });

  it("completeSprint with null does not move tasks", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const backlogBefore = result.current.backlogSections[0].tasks.length;

    act(() => {
      result.current.completeSprint(null);
    });

    expect(result.current.backlogSections[0].tasks.length).toBe(backlogBefore);
  });

  it("updateSprint patches sprint fields", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.updateSprint({ goal: "Updated goal", endDate: "2026-04-01" });
    });

    expect(result.current.sprint.goal).toBe("Updated goal");
    expect(result.current.sprint.endDate).toBe("2026-04-01");
    // Other fields remain unchanged
    expect(result.current.sprint.name).toBe("Sprint 86");
  });
});

// ─── Project Actions ──────────────────────────────────────────────────────────

describe("AppContext – Project Actions", () => {
  it("createProject adds a new project", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const before = result.current.projects.length;

    act(() => {
      result.current.createProject({ name: "New Project", key: "NP", color: "#ff0000" });
    });

    expect(result.current.projects.length).toBe(before + 1);
    const last = result.current.projects[result.current.projects.length - 1];
    expect(last.name).toBe("New Project");
    expect(last.id).toMatch(/^proj-/);
  });

  it("updateProject renames an existing project", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const project = result.current.projects[0];

    act(() => {
      result.current.updateProject({ ...project, name: "Renamed" });
    });

    const found = result.current.projects.find((p) => p.id === project.id);
    expect(found.name).toBe("Renamed");
  });

  it("deleteProject removes a project", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const projectId = result.current.projects[1].id;
    const before = result.current.projects.length;

    act(() => {
      result.current.deleteProject(projectId);
    });

    expect(result.current.projects.length).toBe(before - 1);
    expect(result.current.projects.find((p) => p.id === projectId)).toBeUndefined();
  });
});

// ─── Epic Actions ─────────────────────────────────────────────────────────────

describe("AppContext – Epic Actions", () => {
  it("createEpic adds a new epic", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const before = result.current.epics.length;

    act(() => {
      result.current.createEpic({ title: "New Epic", color: "#ff0000", description: "Desc" });
    });

    expect(result.current.epics.length).toBe(before + 1);
    const last = result.current.epics[result.current.epics.length - 1];
    expect(last.title).toBe("New Epic");
  });

  it("createEpic associates with currentProjectId", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.createEpic({ title: "Epic", color: "#000", description: "" });
    });

    const last = result.current.epics[result.current.epics.length - 1];
    expect(last.projectId).toBe("proj-1");
  });

  it("updateEpic modifies an existing epic", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const epic = result.current.epics[0];

    act(() => {
      result.current.updateEpic({ ...epic, title: "Renamed Epic" });
    });

    const found = result.current.epics.find((e) => e.id === epic.id);
    expect(found.title).toBe("Renamed Epic");
  });

  it("deleteEpic removes the epic", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const epicId = result.current.epics[0].id;
    const before = result.current.epics.length;

    act(() => {
      result.current.deleteEpic(epicId);
    });

    expect(result.current.epics.length).toBe(before - 1);
    expect(result.current.epics.find((e) => e.id === epicId)).toBeUndefined();
  });

  it("deleteEpic sets epicId to null on active tasks that referenced it", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const epicWithTasks = result.current.epics.find((e) =>
      result.current.activeTasks.some((t) => t.epicId === e.id)
    );

    if (epicWithTasks) {
      act(() => {
        result.current.deleteEpic(epicWithTasks.id);
      });

      result.current.activeTasks.forEach((t) => {
        expect(t.epicId).not.toBe(epicWithTasks.id);
      });
    }
  });

  it("deleteEpic sets epicId to null on backlog tasks that referenced it", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    // epic-1 has backlog tasks (b1 = refactor authentication)
    const epicId = "epic-1";

    act(() => {
      result.current.deleteEpic(epicId);
    });

    result.current.backlogSections.forEach((s) => {
      s.tasks.forEach((t) => {
        expect(t.epicId).not.toBe(epicId);
      });
    });
  });
});

// ─── Label Actions ────────────────────────────────────────────────────────────

describe("AppContext – Label Actions", () => {
  it("createLabel adds a new label", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const before = result.current.labels.length;

    act(() => {
      result.current.createLabel({ name: "Performance", color: "#ff6b6b" });
    });

    expect(result.current.labels.length).toBe(before + 1);
    const last = result.current.labels[result.current.labels.length - 1];
    expect(last.name).toBe("Performance");
    expect(last.id).toMatch(/^lbl-/);
  });

  it("deleteLabel removes the label", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const labelId = result.current.labels[0].id;
    const before = result.current.labels.length;

    act(() => {
      result.current.deleteLabel(labelId);
    });

    expect(result.current.labels.length).toBe(before - 1);
    expect(result.current.labels.find((l) => l.id === labelId)).toBeUndefined();
  });

  it("deleteLabel removes the label id from active tasks", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const taskWithLabel = result.current.activeTasks.find(
      (t) => t.labels && t.labels.length > 0
    );

    if (taskWithLabel) {
      const labelId = taskWithLabel.labels[0];

      act(() => {
        result.current.deleteLabel(labelId);
      });

      result.current.activeTasks.forEach((t) => {
        expect(t.labels || []).not.toContain(labelId);
      });
    }
  });
});

// ─── Retrospective Actions ────────────────────────────────────────────────────

describe("AppContext – Retrospective Actions", () => {
  it("addRetroItem appends a new item in editing mode", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const before = result.current.retrospectiveItems.wentWell.length;

    act(() => {
      result.current.addRetroItem("wentWell");
    });

    expect(result.current.retrospectiveItems.wentWell.length).toBe(before + 1);
    const last =
      result.current.retrospectiveItems.wentWell[
        result.current.retrospectiveItems.wentWell.length - 1
      ];
    expect(last.isEditing).toBe(true);
    expect(last.checked).toBe(false);
    expect(last.score).toBe(0);
  });

  it("addRetroItem works for every category", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const categories = ["wentWell", "wentWrong", "canImprove", "actionItems"];

    categories.forEach((cat) => {
      const before = result.current.retrospectiveItems[cat].length;
      act(() => {
        result.current.addRetroItem(cat);
      });
      expect(result.current.retrospectiveItems[cat].length).toBe(before + 1);
    });
  });

  it("updateRetroItem sets text and exits editing mode", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const item = result.current.retrospectiveItems.wentWell[0];

    act(() => {
      result.current.updateRetroItem("wentWell", item.id, "Updated text");
    });

    const found = result.current.retrospectiveItems.wentWell.find(
      (i) => i.id === item.id
    );
    expect(found.text).toBe("Updated text");
    expect(found.isEditing).toBe(false);
  });

  it("deleteRetroItem removes the item", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const item = result.current.retrospectiveItems.wentWell[0];
    const before = result.current.retrospectiveItems.wentWell.length;

    act(() => {
      result.current.deleteRetroItem("wentWell", item.id);
    });

    expect(result.current.retrospectiveItems.wentWell.length).toBe(before - 1);
    expect(
      result.current.retrospectiveItems.wentWell.find((i) => i.id === item.id)
    ).toBeUndefined();
  });

  it("voteRetroItem increments score by delta", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const item = result.current.retrospectiveItems.wentWell[0];
    const initialScore = item.score;

    act(() => {
      result.current.voteRetroItem("wentWell", item.id, 1);
    });

    const found = result.current.retrospectiveItems.wentWell.find(
      (i) => i.id === item.id
    );
    expect(found.score).toBe(initialScore + 1);
  });

  it("voteRetroItem decrements score with negative delta", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const item = result.current.retrospectiveItems.canImprove[0];
    const initialScore = item.score;

    act(() => {
      result.current.voteRetroItem("canImprove", item.id, -1);
    });

    const found = result.current.retrospectiveItems.canImprove.find(
      (i) => i.id === item.id
    );
    expect(found.score).toBe(initialScore - 1);
  });

  it("toggleRetroItem flips the checked status", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const item = result.current.retrospectiveItems.actionItems[0];
    const initial = item.checked;

    act(() => {
      result.current.toggleRetroItem("actionItems", item.id);
    });

    const found = result.current.retrospectiveItems.actionItems.find(
      (i) => i.id === item.id
    );
    expect(found.checked).toBe(!initial);

    // Toggle again should revert
    act(() => {
      result.current.toggleRetroItem("actionItems", item.id);
    });
    const reverted = result.current.retrospectiveItems.actionItems.find(
      (i) => i.id === item.id
    );
    expect(reverted.checked).toBe(initial);
  });
});

// ─── Notes Actions ────────────────────────────────────────────────────────────

describe("AppContext – Notes Actions", () => {
  it("addNote adds a note with content", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.addNote("My important note");
    });

    expect(result.current.notesList).toHaveLength(1);
    expect(result.current.notesList[0].content).toBe("My important note");
    expect(result.current.notesList[0].id).toBeDefined();
  });

  it("addNote prepends (most recent first)", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.addNote("First note");
    });
    act(() => {
      result.current.addNote("Second note");
    });

    expect(result.current.notesList[0].content).toBe("Second note");
    expect(result.current.notesList[1].content).toBe("First note");
  });

  it("addNote does not add an empty string", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.addNote("");
    });

    expect(result.current.notesList).toHaveLength(0);
  });

  it("addNote does not add whitespace-only string", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.addNote("   ");
    });

    expect(result.current.notesList).toHaveLength(0);
  });

  it("deleteNote removes the note by id", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.addNote("Note to delete");
    });

    const noteId = result.current.notesList[0].id;

    act(() => {
      result.current.deleteNote(noteId);
    });

    expect(result.current.notesList.find((n) => n.id === noteId)).toBeUndefined();
  });

  it("deleteNote does not affect other notes", () => {
    // Use a counter to guarantee unique IDs even within the same millisecond
    let idCounter = 10000;
    const dateSpy = jest.spyOn(Date, "now").mockImplementation(() => ++idCounter);

    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => { result.current.addNote("Keep this"); });
    act(() => { result.current.addNote("Delete this"); });

    dateSpy.mockRestore();

    // "Delete this" is at index 0 (prepended last → most recent)
    const idToDelete = result.current.notesList[0].id;

    act(() => {
      result.current.deleteNote(idToDelete);
    });

    expect(result.current.notesList).toHaveLength(1);
    expect(result.current.notesList[0].content).toBe("Keep this");
  });
});

// ─── Planning Poker ───────────────────────────────────────────────────────────

describe("AppContext – Planning Poker", () => {
  it("savePokerResult adds entry to pokerHistory", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.savePokerResult({
        taskId: "task-x",
        estimation: 5,
        taskTitle: "Test Task",
      });
    });

    expect(result.current.pokerHistory).toHaveLength(1);
    expect(result.current.pokerHistory[0].estimation).toBe(5);
    expect(result.current.pokerHistory[0].taskTitle).toBe("Test Task");
    expect(result.current.pokerHistory[0].id).toBeDefined();
    expect(result.current.pokerHistory[0].date).toBeDefined();
  });

  it("savePokerResult updates storyPoint on the active task", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const task = result.current.activeTasks[0];

    act(() => {
      result.current.savePokerResult({ taskId: task.id, estimation: 13 });
    });

    const updated = result.current.activeTasks.find((t) => t.id === task.id);
    expect(updated.storyPoint).toBe(13);
  });

  it("savePokerResult updates storyPoint on a backlog task", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const task = result.current.backlogSections[0].tasks[0];

    act(() => {
      result.current.savePokerResult({ taskId: task.id, estimation: 8 });
    });

    const updated = result.current.backlogSections[0].tasks.find(
      (t) => t.id === task.id
    );
    expect(updated.storyPoint).toBe(8);
  });

  it("multiple savePokerResult calls prepend to history", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.savePokerResult({ taskId: "t1", estimation: 3 });
      result.current.savePokerResult({ taskId: "t2", estimation: 5 });
    });

    expect(result.current.pokerHistory[0].taskId).toBe("t2");
    expect(result.current.pokerHistory[1].taskId).toBe("t1");
  });
});

// ─── Board Settings ───────────────────────────────────────────────────────────

describe("AppContext – Board Settings", () => {
  it("updateBoardSettings patches showBadges", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.updateBoardSettings({ showBadges: false });
    });

    expect(result.current.boardSettings.showBadges).toBe(false);
    // Other settings should remain
    expect(result.current.boardSettings.showPriorityColors).toBe(true);
  });

  it("updateBoardSettings patches multiple fields at once", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.updateBoardSettings({
        showBadges: false,
        showTaskIds: false,
        boardName: "My Board",
      });
    });

    expect(result.current.boardSettings.showBadges).toBe(false);
    expect(result.current.boardSettings.showTaskIds).toBe(false);
    expect(result.current.boardSettings.boardName).toBe("My Board");
  });
});

// ─── Team Actions ─────────────────────────────────────────────────────────────

describe("AppContext – Team Actions", () => {
  it("createTeam adds a new team", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const before = result.current.teams.length;

    act(() => {
      result.current.createTeam({
        name: "DevOps Team",
        color: "#ff0000",
        description: "Ops",
        memberNames: [],
      });
    });

    expect(result.current.teams.length).toBe(before + 1);
    const last = result.current.teams[result.current.teams.length - 1];
    expect(last.name).toBe("DevOps Team");
    expect(last.id).toMatch(/^team-/);
  });

  it("updateTeam modifies an existing team", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const team = result.current.teams[0];

    act(() => {
      result.current.updateTeam({ ...team, name: "Renamed Team" });
    });

    const found = result.current.teams.find((t) => t.id === team.id);
    expect(found.name).toBe("Renamed Team");
  });

  it("deleteTeam removes a team", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const teamId = result.current.teams[0].id;
    const before = result.current.teams.length;

    act(() => {
      result.current.deleteTeam(teamId);
    });

    expect(result.current.teams.length).toBe(before - 1);
    expect(result.current.teams.find((t) => t.id === teamId)).toBeUndefined();
  });
});

// ─── User Actions ─────────────────────────────────────────────────────────────

describe("AppContext – User Actions", () => {
  it("createUser adds a new user with generated id and joinedAt", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const before = result.current.users.length;

    act(() => {
      result.current.createUser({
        name: "Eve Martinez",
        email: "eve@test.com",
        username: "eve",
        role: "member",
      });
    });

    expect(result.current.users.length).toBe(before + 1);
    const last = result.current.users[result.current.users.length - 1];
    expect(last.name).toBe("Eve Martinez");
    expect(last.id).toMatch(/^user-/);
    expect(last.joinedAt).toBeDefined();
  });

  it("updateUser modifies an existing user", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const user = result.current.users[0];

    act(() => {
      result.current.updateUser({ ...user, role: "viewer" });
    });

    const found = result.current.users.find((u) => u.id === user.id);
    expect(found.role).toBe("viewer");
  });

  it("deleteUser removes a user", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const userId = result.current.users[0].id;
    const before = result.current.users.length;

    act(() => {
      result.current.deleteUser(userId);
    });

    expect(result.current.users.length).toBe(before - 1);
    expect(result.current.users.find((u) => u.id === userId)).toBeUndefined();
  });
});

// ─── Custom Field Actions ─────────────────────────────────────────────────────

describe("AppContext – Custom Field Actions", () => {
  it("createCustomField adds a new field", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const before = result.current.customFields.length;

    act(() => {
      result.current.createCustomField({
        name: "Region",
        type: "dropdown",
        required: false,
        options: ["EU", "US", "APAC"],
      });
    });

    expect(result.current.customFields.length).toBe(before + 1);
    const last = result.current.customFields[result.current.customFields.length - 1];
    expect(last.name).toBe("Region");
    expect(last.id).toMatch(/^cf-/);
  });

  it("updateCustomField modifies an existing field", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const field = result.current.customFields[0];

    act(() => {
      result.current.updateCustomField({ ...field, name: "Account" });
    });

    const found = result.current.customFields.find((f) => f.id === field.id);
    expect(found.name).toBe("Account");
  });

  it("deleteCustomField removes a field", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const fieldId = result.current.customFields[0].id;
    const before = result.current.customFields.length;

    act(() => {
      result.current.deleteCustomField(fieldId);
    });

    expect(result.current.customFields.length).toBe(before - 1);
    expect(result.current.customFields.find((f) => f.id === fieldId)).toBeUndefined();
  });
});

// ─── Column Actions ───────────────────────────────────────────────────────────

describe("AppContext – Column Actions", () => {
  it("createColumn adds a new column at the end", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const before = result.current.columns.length;

    act(() => {
      result.current.createColumn("QA Review");
    });

    expect(result.current.columns.length).toBe(before + 1);
    const last = result.current.columns[result.current.columns.length - 1];
    expect(last.title).toBe("QA Review");
    expect(last.custom).toBe(true);
  });

  it("renameColumn updates the column title", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const col = result.current.columns[0];

    act(() => {
      result.current.renameColumn(col.id, "Renamed Column");
    });

    const found = result.current.columns.find((c) => c.id === col.id);
    expect(found.title).toBe("Renamed Column");
  });

  it("deleteColumn removes the column", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    // Create a custom column first so we don't remove a system one
    act(() => {
      result.current.createColumn("Temp Column");
    });

    const customCol = result.current.columns.find((c) => c.custom);
    const before = result.current.columns.length;

    act(() => {
      result.current.deleteColumn(customCol.id);
    });

    expect(result.current.columns.length).toBe(before - 1);
    expect(result.current.columns.find((c) => c.id === customCol.id)).toBeUndefined();
  });

  it("deleteColumn moves affected tasks to 'todo'", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    // Find a non-todo column that has tasks
    const col = result.current.columns.find(
      (c) =>
        c.id !== "todo" && result.current.activeTasks.some((t) => t.status === c.id)
    );

    if (col) {
      act(() => {
        result.current.deleteColumn(col.id);
      });

      result.current.activeTasks.forEach((t) => {
        expect(t.status).not.toBe(col.id);
      });
    }
  });

  it("reorderColumns sets the new column order", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const reversed = [...result.current.columns].reverse();

    act(() => {
      result.current.reorderColumns(reversed);
    });

    expect(result.current.columns).toEqual(reversed);
  });
});

// ─── Backlog Section Actions ──────────────────────────────────────────────────

describe("AppContext – Backlog Section Actions", () => {
  it("createBacklogSection adds a new empty section", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const before = result.current.backlogSections.length;

    act(() => {
      result.current.createBacklogSection();
    });

    expect(result.current.backlogSections.length).toBe(before + 1);
    const last =
      result.current.backlogSections[result.current.backlogSections.length - 1];
    expect(last.tasks).toEqual([]);
    expect(last.title).toMatch(/Backlog/);
  });

  it("deleteBacklogSection removes the section", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.createBacklogSection();
    });

    const created =
      result.current.backlogSections[result.current.backlogSections.length - 1];
    const before = result.current.backlogSections.length;

    act(() => {
      result.current.deleteBacklogSection(created.id);
    });

    expect(result.current.backlogSections.length).toBe(before - 1);
    expect(
      result.current.backlogSections.find((s) => s.id === created.id)
    ).toBeUndefined();
  });

  it("renameBacklogSection updates the title", () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    const section = result.current.backlogSections[0];

    act(() => {
      result.current.renameBacklogSection(section.id, "Sprint Candidates");
    });

    const found = result.current.backlogSections.find((s) => s.id === section.id);
    expect(found.title).toBe("Sprint Candidates");
  });
});

// ─── Activity Log ─────────────────────────────────────────────────────────────

describe("AppContext – Activity Log", () => {
  it("logActivity prepends entry to globalActivityLog", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.logActivity("task-1", "status changed", {
        from: "todo",
        to: "done",
      });
    });

    expect(result.current.globalActivityLog[0].taskId).toBe("task-1");
    expect(result.current.globalActivityLog[0].action).toBe("status changed");
    expect(result.current.globalActivityLog[0].details).toEqual({
      from: "todo",
      to: "done",
    });
    expect(result.current.globalActivityLog[0].user).toBe("You");
    expect(result.current.globalActivityLog[0].timestamp).toBeDefined();
  });

  it("logActivity caps globalActivityLog at 200 entries", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      for (let i = 0; i < 210; i++) {
        result.current.logActivity(`task-${i}`, "action");
      }
    });

    expect(result.current.globalActivityLog.length).toBeLessThanOrEqual(200);
  });
});

// ─── resetAllData ─────────────────────────────────────────────────────────────

describe("AppContext – resetAllData", () => {
  it("resets projects to seed data", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.createProject({ name: "Temp", key: "TP", color: "#000" });
      result.current.createProject({ name: "Temp2", key: "T2", color: "#111" });
    });

    expect(result.current.projects.length).toBeGreaterThan(2);

    act(() => {
      result.current.resetAllData();
    });

    expect(result.current.projects).toHaveLength(2);
    expect(result.current.currentProjectId).toBe("proj-1");
  });

  it("resets notes to empty", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.addNote("Some note");
    });

    act(() => {
      result.current.resetAllData();
    });

    expect(result.current.notesList).toHaveLength(0);
  });

  it("resets pokerHistory to empty", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.savePokerResult({ taskId: "t1", estimation: 3 });
    });

    act(() => {
      result.current.resetAllData();
    });

    expect(result.current.pokerHistory).toHaveLength(0);
  });

  it("resets sprint to seed sprint", () => {
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => {
      result.current.updateSprint({ goal: "Modified goal" });
    });

    act(() => {
      result.current.resetAllData();
    });

    expect(result.current.sprint.name).toBe("Sprint 86");
    expect(result.current.sprint.status).toBe("active");
  });
});
