import React from "react";
import { render, screen } from "@testing-library/react";
import ForYouPage from "./ForYouPage";

const mockUseApp = jest.fn();

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
});
