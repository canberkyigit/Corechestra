import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import RetrospectiveTab from "./RetrospectiveTab";

const mockUseApp = jest.fn();
const mockUseProjectTasks = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/hooks/useProjectTasks", () => ({
  useProjectTasks: () => mockUseProjectTasks(),
}));

jest.mock("@uiw/react-md-editor", () => () => null);

describe("RetrospectiveTab", () => {
  it("uses project-scoped tasks for sprint statistics", () => {
    mockUseApp.mockReturnValue({
      retrospectiveItems: { wentWell: [], wentWrong: [], canImprove: [], actionItems: [] },
      addRetroItem: jest.fn(),
      updateRetroItem: jest.fn(),
      deleteRetroItem: jest.fn(),
      voteRetroItem: jest.fn(),
      toggleRetroItem: jest.fn(),
      setRetroItemEditing: jest.fn(),
    });
    mockUseProjectTasks.mockReturnValue({
      projectActiveTasks: [{ id: "project-task", status: "done", storyPoint: 5, priority: "high" }],
    });

    render(<RetrospectiveTab />);
    fireEvent.click(screen.getByRole("button", { name: /^statistics$/i }));

    const stats = screen.getByText("Sprint Task Statistics").parentElement;
    const totalLabel = within(stats).getAllByText("Total")[0];
    expect(totalLabel.previousSibling).toHaveTextContent("1");
    expect(mockUseProjectTasks).toHaveBeenCalled();
  });
});
