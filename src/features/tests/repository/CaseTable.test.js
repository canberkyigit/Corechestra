import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CaseTable from "./CaseTable";
import { DEFAULT_VISIBLE_COLUMNS } from "../constants/testingConstants";

const makeCases = (count) => Array.from({ length: count }, (_, index) => ({
  id: `c${index + 1}`,
  key: `TC-${index + 1}`,
  displaySeq: index + 1,
  title: `Case ${index + 1}`,
  priority: "medium",
  type: "functional",
  automation: "manual",
  status: "ready",
  owner: null,
  tags: [],
  requirementIds: [],
  suiteId: "s1",
}));

function setupTable(cases, overrides = {}) {
  const props = {
    cases,
    columns: DEFAULT_VISIBLE_COLUMNS,
    users: [],
    latestMap: new Map(),
    pathById: new Map(),
    showPath: false,
    selectedIds: new Set(),
    onToggleSelect: jest.fn(),
    onSelectRange: jest.fn(),
    onSelectAll: jest.fn(),
    onOpen: jest.fn(),
    openId: null,
    sort: { by: "order", dir: "asc" },
    onSort: jest.fn(),
    canEdit: true,
    canReorder: true,
    onReorder: jest.fn(),
    ...overrides,
  };
  render(<CaseTable {...props} />);
  return props;
}

describe("CaseTable", () => {
  it("renders every row for small lists", () => {
    setupTable(makeCases(12));
    expect(screen.getAllByTestId(/^tests-case-row-/)).toHaveLength(12);
  });

  it("virtualizes large lists (renders a window, keeps full row count for a11y)", () => {
    const handlers = setupTable(makeCases(250));
    const grid = screen.getByTestId("tests-case-table");
    expect(grid).toHaveAttribute("aria-rowcount", "251");
    expect(screen.queryAllByTestId(/^tests-case-row-/).length).toBeLessThan(250);
    // Keyboard still works on the full list.
    fireEvent.keyDown(grid, { key: "End" });
    fireEvent.keyDown(grid, { key: "Enter" });
    expect(handlers.onOpen).toHaveBeenCalledWith("c250");
  });

  it("selects ranges with Shift+arrows and all with Ctrl+A, sorts from headers", () => {
    const handlers = setupTable(makeCases(5));
    const grid = screen.getByTestId("tests-case-table");
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    expect(handlers.onSelectRange).toHaveBeenLastCalledWith(["c1", "c2", "c3"]);
    fireEvent.keyDown(grid, { key: "a", ctrlKey: true });
    expect(handlers.onSelectAll).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Priority" }));
    expect(handlers.onSort).toHaveBeenCalledWith("priority");
  });
});
