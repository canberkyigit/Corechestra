import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ReleasesPage, { isReleaseVisibleInProject, matchesTaskQuery } from "./ReleasesPage";

const mockUseApp = jest.fn();
const mockAddToast = jest.fn();
const mockCanPerform = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canPerform: (key) => mockCanPerform(key), canAccessPage: () => true }),
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
    mockCanPerform.mockReturnValue(true);
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

  it("matches tasks by key as well as title", () => {
    expect(matchesTaskQuery({ id: "CY-123", title: "Login" }, "cy-123")).toBe(true);
    expect(matchesTaskQuery({ id: "CY-123", title: "Login" }, "123")).toBe(true);
    expect(matchesTaskQuery({ id: 77, title: "Legacy" }, "CY-77")).toBe(true);
    expect(matchesTaskQuery({ id: "CY-123", title: "Login" }, "logout")).toBe(false);
  });

  it("scopes releases to the current project while keeping legacy releases visible", () => {
    expect(isReleaseVisibleInProject({ projectId: "proj-1" }, "proj-1")).toBe(true);
    expect(isReleaseVisibleInProject({}, "proj-1")).toBe(true);
    expect(isReleaseVisibleInProject({ projectId: "proj-2" }, "proj-1")).toBe(false);

    mockUseApp.mockReturnValue(createAppMock({
      currentProjectId: "proj-1",
      releases: [
        { id: "rel-a", version: "2.0.0", name: "Mine", status: "planned", projectId: "proj-1" },
        { id: "rel-b", version: "3.0.0", name: "Legacy", status: "planned" },
        { id: "rel-c", version: "4.0.0", name: "Theirs", status: "planned", projectId: "proj-2" },
      ],
    }));

    render(<ReleasesPage />);

    expect(screen.getByRole("button", { name: /2.0.0/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /3.0.0/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /4.0.0/ })).not.toBeInTheDocument();
  });

  it("stamps new releases with the current project and finds tasks by key in the form", () => {
    const appMock = createAppMock({
      currentProjectId: "proj-1",
      allTasks: [
        { id: "CY-321", title: "Checkout flow", status: "todo" },
        { id: "CY-654", title: "Profile page", status: "done" },
      ],
    });
    mockUseApp.mockReturnValue(appMock);

    render(<ReleasesPage />);

    fireEvent.click(screen.getAllByRole("button", { name: /New/i })[0]);
    fireEvent.change(screen.getByPlaceholderText("v1.0.0"), { target: { value: "5.0.0" } });
    fireEvent.change(screen.getByPlaceholderText(/Search by title or key/i), { target: { value: "cy-654" } });
    expect(screen.queryByText("Checkout flow")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Profile page"));
    fireEvent.click(screen.getByRole("button", { name: /Create Release/i }));

    expect(appMock.createRelease).toHaveBeenCalledWith(expect.objectContaining({
      version: "5.0.0",
      projectId: "proj-1",
      taskIds: ["CY-654"],
    }));
  });

  it("renders legacy and helper timeline events with their author", () => {
    mockUseApp.mockReturnValue(createAppMock({
      releases: [
        {
          id: "rel-t",
          version: "6.0.0",
          name: "Timeline",
          status: "planned",
          taskIds: [],
          changelog: [],
          checklist: [],
          deploymentTimeline: [
            { id: "e1", type: "created", text: "Release created", actor: "bob", timestamp: "2026-04-01T10:00:00.000Z" },
            { id: "e2", eventType: "deploy", text: "Pushed to prod", author: "carol", createdAt: "2026-04-02T10:00:00.000Z" },
          ],
        },
      ],
    }));

    render(<ReleasesPage />);
    fireEvent.click(screen.getByRole("button", { name: /6.0.0/ }));

    expect(screen.getByText("by bob")).toBeInTheDocument();
    expect(screen.getByText("by carol")).toBeInTheDocument();
    expect(screen.getByText("Deployment")).toBeInTheDocument();
  });

  describe("viewer read-only mode", () => {
    const viewerRelease = {
      id: "rel-v",
      version: "7.0.0",
      name: "Viewer Release",
      status: "in-progress",
      description: "Read me",
      taskIds: ["CY-1"],
      changelog: [{ id: "log-1", type: "feature", text: "New dashboard" }],
      checklist: [{ id: "chk-1", title: "QA sign-off", completed: false }],
      deploymentTimeline: [],
      createdAt: "2026-04-01T10:00:00.000Z",
    };

    beforeEach(() => {
      mockCanPerform.mockImplementation((key) => key !== "releases:manage");
    });

    it("hides every release mutation control and shows a read-only hint", () => {
      const appMock = createAppMock({
        releases: [viewerRelease],
        allTasks: [{ id: "CY-1", title: "Ship dashboard", status: "done" }],
      });
      mockUseApp.mockReturnValue(appMock);

      render(<ReleasesPage />);

      expect(screen.getByTestId("releases-read-only-hint")).toHaveTextContent(/Read-only/i);
      expect(screen.queryByRole("button", { name: /^New$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /New Release/i })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /7.0.0/i }));

      // Content stays readable
      expect(screen.getByText("Read me")).toBeInTheDocument();
      expect(screen.getByText("New dashboard")).toBeInTheDocument();
      expect(screen.getByText("Ship dashboard")).toBeInTheDocument();

      // Header/status actions
      expect(screen.queryByTestId("release-mark-released")).not.toBeInTheDocument();
      expect(screen.queryByTestId("release-move-to-planned")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Delete$/i })).not.toBeInTheDocument();
      // Section actions
      expect(screen.queryByRole("button", { name: /Add Event/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Add Entry/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Add Task/i })).not.toBeInTheDocument();
      expect(screen.queryByTitle("Edit description")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Delete entry")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Unlink task")).not.toBeInTheDocument();

      // Checklist is visible but disabled; clicking it does not write
      const checklistItem = screen.getByTestId("release-checklist-chk-1");
      expect(checklistItem).toBeDisabled();
      fireEvent.click(checklistItem);
      fireEvent.click(screen.getByText("Read me"));
      expect(screen.queryByPlaceholderText(/Describe what's in this release/i)).not.toBeInTheDocument();

      expect(appMock.updateRelease).not.toHaveBeenCalled();
      expect(appMock.createRelease).not.toHaveBeenCalled();
      expect(appMock.deleteRelease).not.toHaveBeenCalled();
      expect(appMock.addChangelogEntry).not.toHaveBeenCalled();
      expect(appMock.deleteChangelogEntry).not.toHaveBeenCalled();
    });

    it("does not show the read-only hint when the user can manage releases", () => {
      mockCanPerform.mockReturnValue(true);
      render(<ReleasesPage />);
      expect(screen.queryByTestId("releases-read-only-hint")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^New$/i })).toBeInTheDocument();
    });
  });
});
