import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ForYouPage, { selectDueSoonTasks, selectOverdueTasks } from "./ForYouPage";
import { NAVIGATE_EVENT, OPEN_TASK_EVENT } from "../../../shared/components/appNavigation";

const mockUseApp = jest.fn();

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canAccessPage: () => true, canPerform: () => true }),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
}));

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/components/Skeleton", () => ({
  ForYouSkeleton: () => <div>loading</div>,
}));

describe("ForYouPage", () => {
  beforeEach(() => {
    mockUseApp.mockReturnValue({
      dbReady: true,
      currentUser: "alice",
      notifications: [],
      markNotifRead: jest.fn(),
      markAllNotifsRead: jest.fn(),
      activeTasks: [
        {
          id: 101,
          title: "Fix login",
          assignedTo: "alice",
          status: "inprogress",
          dueDate: "2026-04-05",
          comments: [
            {
              id: "c-1",
              author: "bob",
              text: "@alice please review the latest fix",
              createdAt: "2026-04-01T10:00:00.000Z",
            },
          ],
        },
      ],
      backlogSections: [],
      docPages: [
        {
          id: "page-1",
          title: "Auth RFC",
          createdAt: "2026-04-01T09:00:00.000Z",
          comments: [],
        },
      ],
      releases: [
        {
          id: "rel-1",
          version: "v2.0.0",
          name: "Spring Release",
          createdAt: "2026-04-01T08:00:00.000Z",
          changelog: [],
        },
      ],
      testRuns: [
        {
          id: "run-1",
          name: "Nightly Auth",
          createdAt: "2026-04-01T07:00:00.000Z",
          completedAt: "2026-04-01T11:00:00.000Z",
        },
      ],
      globalActivityLog: [
        {
          id: 1,
          taskId: 101,
          action: "updated task",
          user: "alice",
          timestamp: "2026-04-01T06:00:00.000Z",
        },
      ],
    });
  });

  it("shows due soon, mention items and universal activity sections", () => {
    render(<ForYouPage />);

    expect(screen.getByText(/Due Soon/i)).toBeInTheDocument();
    expect(screen.getByText(/Mentions/i)).toBeInTheDocument();
    expect(screen.getByText(/Universal Activity/i)).toBeInTheDocument();
    expect(screen.getAllByText("Fix login").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/please review the latest fix/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Test run completed/i)).toBeInTheDocument();
  });

  it("renders task keys without the cy-CY- double prefix", () => {
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      activeTasks: [{ id: "CY-42", title: "Blocked thing", assignedTo: "alice", status: "blocked" }],
    });

    render(<ForYouPage />);

    expect(screen.getByText("CY-42")).toBeInTheDocument();
    expect(screen.queryByText(/cy-CY-/i)).not.toBeInTheDocument();
  });

  it("only shows notifications targeted at the current user (or broadcasts) and opens the task on click", () => {
    const markNotifRead = jest.fn();
    const task = { id: "CY-7", title: "Review API", assignedTo: "bob", status: "todo" };
    mockUseApp.mockReturnValue({
      ...mockUseApp(),
      markNotifRead,
      activeTasks: [task],
      notifications: [
        { id: "n-1", type: "mention", text: "bob mentioned you", recipient: "alice", taskId: "CY-7", read: false, timestamp: new Date().toISOString() },
        { id: "n-2", type: "mention", text: "for carol only", recipient: "carol", read: false, timestamp: new Date().toISOString() },
        { id: "n-3", type: "sprint_started", text: "Sprint started", read: false, timestamp: new Date().toISOString() },
      ],
    });
    const opened = jest.fn();
    const navigated = jest.fn();
    const onOpen = (event) => opened(event.detail.task);
    const onNavigate = (event) => navigated(event.detail.route);
    window.addEventListener(OPEN_TASK_EVENT, onOpen);
    window.addEventListener(NAVIGATE_EVENT, onNavigate);

    render(<ForYouPage />);

    expect(screen.getByText("bob mentioned you")).toBeInTheDocument();
    expect(screen.queryByText("for carol only")).not.toBeInTheDocument();
    expect(screen.getByText(/2 unread notifications/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("bob mentioned you"));
    expect(markNotifRead).toHaveBeenCalledWith("n-1");
    expect(opened).toHaveBeenCalledWith(task);

    fireEvent.click(screen.getByText("Sprint started"));
    expect(navigated).toHaveBeenCalledWith("board");

    window.removeEventListener(OPEN_TASK_EVENT, onOpen);
    window.removeEventListener(NAVIGATE_EVENT, onNavigate);
  });

  it("treats YYYY-MM-DD due dates as local days (tasks due today are included)", () => {
    const now = new Date(2026, 3, 5, 23, 30); // Apr 5, 23:30 local
    const tasks = [
      { id: "a", dueDate: "2026-04-05" },
      { id: "b", dueDate: "2026-04-12" },
      { id: "c", dueDate: "2026-04-13" },
      { id: "d", dueDate: "2026-04-04" },
      { id: "e", dueDate: "not-a-date" },
    ];

    expect(selectDueSoonTasks(tasks, now).map((task) => task.id)).toEqual(["a", "b"]);
  });

  it("lists open overdue tasks, most overdue first", () => {
    const now = new Date(2026, 9, 2, 15, 0);
    const tasks = [
      { id: "late-1", dueDate: "2026-09-30", status: "todo" },
      { id: "late-2", dueDate: "2026-09-01", status: "inprogress" },
      { id: "done", dueDate: "2026-09-01", status: "done" },
      { id: "today", dueDate: "2026-10-02", status: "todo" },
    ];
    expect(selectOverdueTasks(tasks, now).map((task) => task.id)).toEqual(["late-2", "late-1"]);
  });
});
