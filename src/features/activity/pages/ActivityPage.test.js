import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ActivityPage from "./ActivityPage";
import { NAVIGATE_EVENT } from "../../../shared/components/appNavigation";

const mockUseApp = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({ useApp: () => mockUseApp() }));

describe("ActivityPage", () => {
  it("renders a skeleton instead of nothing while loading", () => {
    mockUseApp.mockReturnValue({ dbReady: false });
    render(<ActivityPage />);
    expect(screen.getByTestId("activity-skeleton")).toBeInTheDocument();
  });

  it("navigates to the related doc page when a doc entry is clicked", () => {
    mockUseApp.mockReturnValue({
      dbReady: true,
      currentUser: "alice",
      globalActivityLog: [],
      activeTasks: [],
      backlogSections: [],
      docPages: [{ id: "page-1", title: "Runbook", createdAt: "2026-04-01T10:00:00.000Z" }],
      releases: [],
      testRuns: [],
    });
    const navigated = jest.fn();
    const listener = (event) => navigated(event.detail.route);
    window.addEventListener(NAVIGATE_EVENT, listener);

    render(<ActivityPage />);
    fireEvent.click(screen.getByRole("button", { name: /Page created/i }));

    expect(navigated).toHaveBeenCalledWith("docs?page=page-1");
    window.removeEventListener(NAVIGATE_EVENT, listener);
  });
});
