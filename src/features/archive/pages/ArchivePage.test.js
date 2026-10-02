import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ArchivePage from "./ArchivePage";

const mockUseApp = jest.fn();
const mockAddToast = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/ToastContext", () => ({ useToast: () => ({ addToast: mockAddToast }) }));
jest.mock("../../../shared/components/Skeleton", () => ({ ArchiveSkeleton: () => <div>loading</div> }));

function appState(overrides = {}) {
  return {
    archivedTasks: [
      { id: "CY-1", title: "Old login", projectId: "proj-1", archivedAt: "2026-04-01T10:00:00.000Z", status: "done" },
      { id: 42, title: "Legacy numeric id", projectId: "proj-1", archivedAt: "2026-04-02T10:00:00.000Z", status: "todo" },
      { id: "CY-9", title: "Other project task", projectId: "proj-2", archivedAt: "2026-04-03T10:00:00.000Z" },
    ],
    archivedProjects: [],
    archivedEpics: [],
    restoreTask: jest.fn(),
    permanentDeleteTask: jest.fn(),
    emptyArchive: jest.fn(),
    projects: [{ id: "proj-1", name: "Core" }, { id: "proj-2", name: "Other" }],
    currentProjectId: "proj-1",
    dbReady: true,
    ...overrides,
  };
}

describe("ArchivePage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps the search box visible when nothing matches (and numeric ids do not crash)", () => {
    mockUseApp.mockReturnValue(appState());
    render(<ArchivePage />);

    const search = screen.getByPlaceholderText(/Search archived items/i);
    fireEvent.change(search, { target: { value: "zzz" } });

    expect(screen.getByPlaceholderText(/Search archived items/i)).toBeInTheDocument();
    expect(screen.getByText(/No results for "zzz"/)).toBeInTheDocument();
    expect(screen.queryByText(/Archive is empty/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Clear search/i }));
    expect(screen.getByText("Old login")).toBeInTheDocument();
  });

  it("empties only the current project's archived tasks in project scope", () => {
    const app = appState();
    mockUseApp.mockReturnValue(app);
    render(<ArchivePage />);

    fireEvent.click(screen.getByRole("button", { name: /Empty Project Archive/i }));
    expect(screen.getByText(/Delete 2 archived tasks from Core\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Yes, empty/i }));

    // One scoped write instead of a per-task delete loop.
    expect(app.emptyArchive).toHaveBeenCalledTimes(1);
    expect(app.emptyArchive).toHaveBeenCalledWith("proj-1");
    expect(app.permanentDeleteTask).not.toHaveBeenCalled();
  });

  it("empties the whole archive only from the All Projects view", () => {
    const app = appState();
    mockUseApp.mockReturnValue(app);
    render(<ArchivePage />);

    fireEvent.click(screen.getByRole("button", { name: /All Projects/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Empty Archive$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Yes, empty/i }));

    expect(app.emptyArchive).toHaveBeenCalledTimes(1);
    expect(app.emptyArchive).toHaveBeenCalledWith();
  });
});
