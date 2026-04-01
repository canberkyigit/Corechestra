import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SprintModal from "./SprintModal";

const mockUseApp = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

describe("SprintModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits the start flow with merged sprint data", async () => {
    const startSprint = jest.fn();
    const onClose = jest.fn();

    mockUseApp.mockReturnValue({
      sprint: { id: "s1", status: "planned" },
      activeTasks: [],
      backlogSections: [{ id: 1, title: "Backlog" }],
      startSprint,
      completeSprint: jest.fn(),
      updateSprint: jest.fn(),
    });

    const { container } = render(<SprintModal open onClose={onClose} mode="start" />);

    fireEvent.change(screen.getByPlaceholderText(/Sprint 87/i), { target: { value: "Sprint 42" } });
    fireEvent.change(container.querySelector('input[name="startDate"]'), { target: { value: "2026-04-01" } });
    fireEvent.change(container.querySelector('input[name="endDate"]'), { target: { value: "2026-04-14" } });
    fireEvent.click(screen.getByRole("button", { name: /Start Sprint/i }));

    await waitFor(() => {
      expect(startSprint).toHaveBeenCalledWith(expect.objectContaining({
        id: "s1",
        name: "Sprint 42",
        startDate: "2026-04-01",
        endDate: "2026-04-14",
      }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("submits edits through updateSprint", async () => {
    const updateSprint = jest.fn();
    const onClose = jest.fn();

    mockUseApp.mockReturnValue({
      sprint: { id: "s1", name: "Sprint 1", goal: "Old", startDate: "2026-04-01", endDate: "2026-04-14", status: "active" },
      activeTasks: [],
      backlogSections: [{ id: 1, title: "Backlog" }],
      startSprint: jest.fn(),
      completeSprint: jest.fn(),
      updateSprint,
    });

    render(<SprintModal open onClose={onClose} mode="edit" />);

    fireEvent.change(screen.getByPlaceholderText(/goal of this sprint/i), { target: { value: "New goal" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateSprint).toHaveBeenCalledWith(expect.objectContaining({ goal: "New goal" }));
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("completes the sprint using the selected backlog section", () => {
    const completeSprint = jest.fn();
    const onClose = jest.fn();

    mockUseApp.mockReturnValue({
      sprint: { id: "s1", name: "Sprint 1", status: "active" },
      activeTasks: [
        { id: "done", status: "done" },
        { id: "todo", status: "todo" },
      ],
      backlogSections: [
        { id: 1, title: "Backlog A" },
        { id: 2, title: "Backlog B" },
      ],
      startSprint: jest.fn(),
      completeSprint,
      updateSprint: jest.fn(),
    });

    render(<SprintModal open onClose={onClose} mode="complete" />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Complete Sprint/i }));

    expect(completeSprint).toHaveBeenCalledWith(2);
    expect(onClose).toHaveBeenCalled();
  });
});
