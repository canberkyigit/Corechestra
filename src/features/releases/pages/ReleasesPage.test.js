import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ReleasesPage from "./ReleasesPage";

const mockUseApp = jest.fn();
const mockAddToast = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

jest.mock("../../../shared/components/Skeleton", () => ({
  ReleasesSkeleton: () => <div>Loading releases</div>,
}));

function createAppMock(overrides = {}) {
  return {
    releases: [
      {
        id: "rel-1",
        version: "1.1.0",
        name: "Core Release",
        status: "planned",
        taskIds: [],
        changelog: [],
        checklist: [],
        deploymentTimeline: [],
        createdAt: "2026-04-01T10:00:00.000Z",
      },
    ],
    createRelease: jest.fn(),
    updateRelease: jest.fn(),
    deleteRelease: jest.fn(),
    addChangelogEntry: jest.fn(),
    deleteChangelogEntry: jest.fn(),
    allTasks: [],
    templateRegistry: { release: [] },
    currentUser: "alice",
    users: [],
    dbReady: true,
    ...overrides,
  };
}

describe("ReleasesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApp.mockReturnValue(createAppMock());
  });

  it("moves planned releases to in progress from the header action", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    render(<ReleasesPage />);

    fireEvent.click(screen.getByRole("button", { name: /1.1.0/i }));
    fireEvent.click(screen.getByTestId("release-start"));

    expect(appMock.updateRelease).toHaveBeenCalledWith(expect.objectContaining({
      id: "rel-1",
      status: "in-progress",
      deploymentTimeline: expect.arrayContaining([
        expect.objectContaining({
          eventType: "started",
          author: "alice",
        }),
      ]),
    }));
    expect(mockAddToast).toHaveBeenCalledWith("Release moved to In Progress", "success");
  });

  it("marks in-progress releases as released from the header action", () => {
    const appMock = createAppMock({
      releases: [
        {
          id: "rel-2",
          version: "1.2.0",
          name: "April Release",
          status: "in-progress",
          taskIds: [],
          changelog: [],
          checklist: [],
          deploymentTimeline: [],
          createdAt: "2026-04-01T10:00:00.000Z",
        },
      ],
    });
    mockUseApp.mockReturnValue(appMock);

    render(<ReleasesPage />);

    fireEvent.click(screen.getByRole("button", { name: /1.2.0/i }));
    fireEvent.click(screen.getByTestId("release-mark-released"));

    expect(appMock.updateRelease).toHaveBeenCalledWith(expect.objectContaining({
      id: "rel-2",
      status: "released",
      releaseDate: new Date().toISOString().slice(0, 10),
      deploymentTimeline: expect.arrayContaining([
        expect.objectContaining({
          eventType: "release",
          author: "alice",
        }),
      ]),
    }));
    expect(mockAddToast).toHaveBeenCalledWith("Release moved to Released", "success");
  });

  it("moves in-progress releases back to planned from the header action", () => {
    const appMock = createAppMock({
      releases: [
        {
          id: "rel-3",
          version: "1.3.0",
          name: "Rollback Release",
          status: "in-progress",
          taskIds: [],
          changelog: [],
          checklist: [],
          deploymentTimeline: [],
          createdAt: "2026-04-01T10:00:00.000Z",
        },
      ],
    });
    mockUseApp.mockReturnValue(appMock);

    render(<ReleasesPage />);

    fireEvent.click(screen.getByRole("button", { name: /1.3.0/i }));
    fireEvent.click(screen.getByTestId("release-move-to-planned"));

    expect(appMock.updateRelease).toHaveBeenCalledWith(expect.objectContaining({
      id: "rel-3",
      status: "planned",
      deploymentTimeline: expect.arrayContaining([
        expect.objectContaining({
          eventType: "replanned",
          author: "alice",
        }),
      ]),
    }));
    expect(mockAddToast).toHaveBeenCalledWith("Release moved back to Planned", "info");
  });
});
