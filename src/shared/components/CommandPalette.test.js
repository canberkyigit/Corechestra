import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CommandPalette from "./CommandPalette";

const mockUseApp = jest.fn();
const mockUsePermissions = jest.fn();

jest.mock("framer-motion", () => {
  const strip = ({ initial, animate, exit, transition, ...rest }) => rest;
  return {
    motion: {
      div: ({ children, ...props }) => <div {...strip(props)}>{children}</div>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

jest.mock("../context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../context/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));

const tasks = [
  { id: "CY-123", title: "Payment retries", status: "todo", type: "task" },
  { id: "CY-456", title: "Search crash", status: "blocked", type: "bug" },
];

function setupPalette(overrides = {}) {
  const props = {
    open: true,
    onClose: jest.fn(),
    onOpenTask: jest.fn(),
    onNavigate: jest.fn(),
    onCreateTask: jest.fn(),
    onToggleDark: jest.fn(),
    ...overrides,
  };
  render(<CommandPalette {...props} />);
  return props;
}

describe("CommandPalette", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseApp.mockReturnValue({
      activeTasks: tasks,
      backlogSections: [],
      epics: [],
      docPages: [{ id: "page-9", title: "Payment runbook" }],
      releases: [],
      testSuites: [],
      recentItems: [],
      darkMode: false,
    });
    mockUsePermissions.mockReturnValue({
      canAccessPage: (page) => !["admin", "archive", "hr"].includes(page),
      canPerform: () => true,
    });
  });

  it("finds tasks by their CY- key", () => {
    const props = setupPalette();
    fireEvent.change(screen.getByPlaceholderText(/search tasks/i), { target: { value: "cy-456" } });

    fireEvent.click(screen.getByText("Search crash"));
    expect(props.onOpenTask).toHaveBeenCalledWith(tasks[1]);
  });

  it("opens the exact doc page from a doc result", () => {
    const props = setupPalette();
    fireEvent.change(screen.getByPlaceholderText(/search tasks/i), { target: { value: "runbook" } });

    fireEvent.click(screen.getByRole("button", { name: /Payment runbook/i }));
    expect(props.onNavigate).toHaveBeenCalledWith("docs?page=page-9");
  });

  it("only lists pages the role may open", () => {
    setupPalette();
    expect(screen.getByText("Releases")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive")).not.toBeInTheDocument();
  });

  it("selects the highlighted quick-navigation item with Enter on an empty query", () => {
    const props = setupPalette();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(props.onNavigate).toHaveBeenCalledWith("board");
    expect(props.onClose).toHaveBeenCalled();
  });

  it("hides the Create task action without task:create permission", () => {
    mockUsePermissions.mockReturnValue({ canAccessPage: () => true, canPerform: () => false });
    setupPalette();
    fireEvent.change(screen.getByPlaceholderText(/search tasks/i), { target: { value: "create" } });

    expect(screen.queryByText("Create task")).not.toBeInTheDocument();
  });
});
