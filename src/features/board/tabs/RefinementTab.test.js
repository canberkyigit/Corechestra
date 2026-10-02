import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import RefinementTab, { parseStoryPointInput } from "./RefinementTab";

const mockUseApp = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/AuthContext", () => ({ useAuth: () => ({ role: "member", isAdmin: false }) }));

function appMock(overrides = {}) {
  return {
    activeTasks: [
      { id: "CY-1", title: "Sprint bug", type: "bug", projectId: "proj-1", storyPoint: "3" },
      { id: "CY-2", title: "Other project", type: "task", projectId: "proj-2" },
    ],
    backlogSections: [{ id: 1, title: "Backlog", tasks: [{ id: "CY-3", title: "Backlog task", type: "task" }] }],
    pokerHistory: [],
    currentProjectId: "proj-1",
    updateTask: jest.fn(() => ({ ok: true })),
    ...overrides,
  };
}

describe("RefinementTab", () => {
  it("parses story point input into numbers", () => {
    expect(parseStoryPointInput("5")).toBe(5);
    expect(parseStoryPointInput("0")).toBe(0);
    expect(parseStoryPointInput("2,5")).toBe(2.5);
    expect(parseStoryPointInput("")).toBe("");
    expect(parseStoryPointInput("abc")).toBeNull();
    expect(parseStoryPointInput("-1")).toBeNull();
  });

  it("can switch the type filter back to All types", () => {
    mockUseApp.mockReturnValue(appMock());
    render(<RefinementTab onTaskClick={jest.fn()} onPokerClick={jest.fn()} />);

    const typeSelect = screen.getByDisplayValue("All types");
    fireEvent.change(typeSelect, { target: { value: "bug" } });
    expect(screen.queryByText("Backlog task")).not.toBeInTheDocument();

    fireEvent.change(typeSelect, { target: { value: "" } });
    expect(screen.getByText("Backlog task")).toBeInTheDocument();
    expect(screen.getByText("Sprint bug")).toBeInTheDocument();
    expect(screen.queryByText("Other project")).not.toBeInTheDocument();
  });

  it("saves inline story points as numbers through updateTask", () => {
    const app = appMock();
    mockUseApp.mockReturnValue(app);
    render(<RefinementTab onTaskClick={jest.fn()} onPokerClick={jest.fn()} />);

    fireEvent.click(screen.getAllByTitle("Click to edit story points")[1]);
    const input = screen.getByLabelText("Story points");
    fireEvent.change(input, { target: { value: "8" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(app.updateTask).toHaveBeenCalledWith(expect.objectContaining({ id: "CY-3", storyPoint: 8 }));
  });

  it("ignores non-numeric story point input", () => {
    const app = appMock();
    mockUseApp.mockReturnValue(app);
    render(<RefinementTab onTaskClick={jest.fn()} onPokerClick={jest.fn()} />);

    fireEvent.click(screen.getAllByTitle("Click to edit story points")[1]);
    const input = screen.getByLabelText("Story points");
    fireEvent.change(input, { target: { value: "lots" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(app.updateTask).not.toHaveBeenCalled();
  });
});
