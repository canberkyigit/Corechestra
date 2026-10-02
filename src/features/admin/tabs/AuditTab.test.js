import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AuditTab, filterAuditEntries } from "./AuditTab";

const mockUseApp = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

const NOW = Date.parse("2026-10-02T12:00:00.000Z");

const LOG = [
  { id: 1, action: "role_changed", scope: "security", severity: "warning", user: "alice", timestamp: "2026-10-02T11:00:00.000Z", details: { name: "Bob", email: "bob@example.com", previousRole: "member", nextRole: "admin", reason: "Team lead" } },
  { id: 2, action: "workspace_security_updated", scope: "workspace", severity: "info", user: "carol", timestamp: "2026-09-20T10:00:00.000Z", details: { changedSections: ["templates"] } },
  { id: 3, action: "status_changed", taskId: "CY-1", scope: "task", user: "bob", timestamp: "2026-10-02T10:00:00.000Z", details: {} },
];

describe("filterAuditEntries", () => {
  it("defaults to audit events only (security + workspace)", () => {
    expect(filterAuditEntries(LOG, { now: NOW }).map((entry) => entry.id)).toEqual([1, 2]);
  });

  it("filters by severity, actor, time range and search", () => {
    expect(filterAuditEntries(LOG, { severity: "warning", now: NOW }).map((e) => e.id)).toEqual([1]);
    expect(filterAuditEntries(LOG, { scope: "all", actor: "bob", now: NOW }).map((e) => e.id)).toEqual([3]);
    expect(filterAuditEntries(LOG, { range: "7d", now: NOW }).map((e) => e.id)).toEqual([1]);
    expect(filterAuditEntries(LOG, { query: "team lead", now: NOW }).map((e) => e.id)).toEqual([1]);
  });
});

describe("AuditTab", () => {
  beforeEach(() => {
    mockUseApp.mockReturnValue({ globalActivityLog: LOG });
  });

  it("shows audit details and lets admins include task activity", () => {
    render(<AuditTab />);

    expect(screen.getAllByTestId("audit-entry")).toHaveLength(2);
    expect(screen.getByText(/member → admin/)).toBeInTheDocument();
    expect(screen.getByText(/Reason: “Team lead”/)).toBeInTheDocument();
    expect(screen.getByText(/Changed: templates/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Scope"), { target: { value: "all" } });
    expect(screen.getAllByTestId("audit-entry")).toHaveLength(3);

    fireEvent.change(screen.getByLabelText("Actor"), { target: { value: "carol" } });
    expect(screen.getAllByTestId("audit-entry")).toHaveLength(1);
  });
});
