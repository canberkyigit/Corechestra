import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { format, addDays } from "date-fns";
import RoadmapPage, { computeBarGeometry } from "./RoadmapPage";

const mockUseApp = jest.fn();
const mockCanPerform = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));
jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canPerform: mockCanPerform }),
}));
jest.mock("../../../shared/hooks/useHorizontalWheelScroll", () => ({ useHorizontalWheelScroll: () => {} }));

describe("computeBarGeometry", () => {
  it("clips bars that start before the window to their real end", () => {
    // starts 5 days before the window, spans 10 days → 5 visible days
    expect(computeBarGeometry(-5, 10, 180, 20)).toEqual({ left: 0, width: 97, clippedStart: true, clippedEnd: false });
  });

  it("clips bars that run past the window end and hides bars fully outside", () => {
    expect(computeBarGeometry(175, 10, 180, 20)).toMatchObject({ left: 3500, width: 97, clippedEnd: true });
    expect(computeBarGeometry(-20, 10, 180, 20)).toBeNull();
    expect(computeBarGeometry(181, 3, 180, 20)).toBeNull();
  });
});

describe("RoadmapPage drag", () => {
  const today = new Date();
  const epic = {
    id: "epic-1",
    title: "Checkout",
    color: "#3b82f6",
    projectId: "proj-1",
    startDate: format(addDays(today, 2), "yyyy-MM-dd"),
    endDate: format(addDays(today, 6), "yyyy-MM-dd"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanPerform.mockReturnValue(true);
  });

  it("updates local position while dragging and writes the store once on drop", () => {
    const updateEpic = jest.fn();
    mockUseApp.mockReturnValue({
      epics: [epic], updateEpic, allTasks: [], sprint: null, currentProjectId: "proj-1", dbReady: true,
    });
    render(<RoadmapPage />);

    const bar = screen.getByTestId("roadmap-bar-epic-1");
    fireEvent.mouseDown(bar, { clientX: 100, button: 0 });
    fireEvent.mouseMove(document, { clientX: 140 });
    fireEvent.mouseMove(document, { clientX: 160 });
    expect(updateEpic).not.toHaveBeenCalled();
    fireEvent.mouseUp(document);

    expect(updateEpic).toHaveBeenCalledTimes(1);
    expect(updateEpic).toHaveBeenCalledWith(expect.objectContaining({
      id: "epic-1",
      startDate: format(addDays(today, 5), "yyyy-MM-dd"),
      endDate: format(addDays(today, 9), "yyyy-MM-dd"),
    }));
  });

  it("does not allow dragging for roles without task:edit", () => {
    mockCanPerform.mockReturnValue(false);
    const updateEpic = jest.fn();
    mockUseApp.mockReturnValue({
      epics: [epic], updateEpic, allTasks: [], sprint: null, currentProjectId: "proj-1", dbReady: true,
    });
    render(<RoadmapPage />);

    const bar = screen.getByTestId("roadmap-bar-epic-1");
    fireEvent.mouseDown(bar, { clientX: 100, button: 0 });
    fireEvent.mouseMove(document, { clientX: 200 });
    fireEvent.mouseUp(document);

    expect(updateEpic).not.toHaveBeenCalled();
    expect(screen.getByText(/read-only for your role/i)).toBeInTheDocument();
  });
});
