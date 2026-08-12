import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SprintReviewTab from "./SprintReviewTab";

const mockUseApp = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

describe("SprintReviewTab", () => {
  it("loads and persists sprint review notes", () => {
    const updateSprint = jest.fn();
    mockUseApp.mockReturnValue({
      activeTasks: [],
      setActiveTasks: jest.fn(),
      sprint: { id: "sprint-1", name: "Sprint 1", reviewNotes: "Existing note" },
      updateSprint,
      currentProjectId: "proj-1",
      completedSprints: [],
    });

    render(<SprintReviewTab />);
    expect(screen.getByText("Existing note")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    const notes = screen.getByPlaceholderText(/add review meeting notes/i);
    fireEvent.change(notes, { target: { value: "  Saved decision  " } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(updateSprint).toHaveBeenCalledWith({ reviewNotes: "Saved decision" });
  });
});
