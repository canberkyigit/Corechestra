import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Prevent real localStorage reads/writes during App tests
jest.mock("./services/storage", () => ({
  loadState: jest.fn(() => null),
  saveState: jest.fn(),
  clearState: jest.fn(),
}));

// Deterministic helpers
jest.mock("./utils/helpers", () => ({
  ...jest.requireActual("./utils/helpers"),
  generateSubtasks: jest.fn(() => []),
  generateId: jest.fn(() => "CY-00001"),
}));

// Mock heavy page components to avoid deep render trees in smoke tests
jest.mock("./pages/BoardPage", () => () => (
  <div data-testid="board-page">Board Page</div>
));
jest.mock("./pages/DashboardPage", () => () => (
  <div data-testid="dashboard-page">Dashboard</div>
));
jest.mock("./pages/TimelinePage", () => () => (
  <div data-testid="timeline-page">Timeline</div>
));
jest.mock("./pages/CalendarPage", () => () => (
  <div data-testid="calendar-page">Calendar</div>
));
jest.mock("./pages/ReportsPage", () => () => (
  <div data-testid="reports-page">Reports</div>
));
jest.mock("./pages/ProfilePage", () => () => (
  <div data-testid="profile-page">Profile</div>
));
jest.mock("./pages/AdminPage", () => () => (
  <div data-testid="admin-page">Admin</div>
));
jest.mock("./components/TaskDetailModal", () => () => null);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(document.body).toBeInTheDocument();
  });

  it("renders the board page by default", () => {
    render(<App />);
    expect(screen.getByTestId("board-page")).toBeInTheDocument();
  });

  it("renders the Layout wrapper", () => {
    const { container } = render(<App />);
    // Layout renders a root div – just verify something is rendered
    expect(container.firstChild).not.toBeNull();
  });
});
