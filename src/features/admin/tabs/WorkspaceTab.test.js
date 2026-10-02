import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { WorkspaceTab } from "./WorkspaceTab";
import { DEFAULT_PERMISSION_MATRIX } from "../../../shared/constants/permissions";

const mockUseApp = jest.fn();
const mockUsePermissions = jest.fn();
const mockAddToast = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));

jest.mock("../../../shared/components/WorkspaceSetupChecklist", () => ({
  WorkspaceSetupChecklist: () => <div>Setup checklist</div>,
}));

const TEMPLATE_REGISTRY = {
  doc: [{ id: "doc-1", name: "Doc A" }, { id: "doc-2", name: "Doc B" }],
  sprint: [{ id: "sprint-1", name: "Sprint" }],
  release: [{ id: "release-1", name: "Release" }],
  onboarding: [{ id: "onb-1", name: "Onboarding" }],
  approval: [{ id: "appr-1", name: "Approval" }],
  incident: [{ id: "inc-1", name: "Incident" }],
};

function createAppMock(overrides = {}) {
  return {
    projects: [],
    users: [],
    teams: [],
    spaces: [],
    templateRegistry: TEMPLATE_REGISTRY,
    permissionMatrix: DEFAULT_PERMISSION_MATRIX,
    setPermissionMatrix: jest.fn(),
    workspaceSettings: { displayName: "Acme", supportEmail: "" },
    setWorkspaceSettings: jest.fn(),
    sensitiveActionPolicy: { requireConfirmation: true, protectRoleChanges: true, protectWorkspaceSettings: false, requireAdminReason: false },
    setSensitiveActionPolicy: jest.fn(),
    logAuditEvent: jest.fn(),
    ...overrides,
  };
}

describe("WorkspaceTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePermissions.mockReturnValue({ canPerform: () => true });
  });

  it("resyncs untouched drafts when the stored settings change", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);
    const { rerender } = render(<WorkspaceTab />);
    expect(screen.getByDisplayValue("Acme")).toBeInTheDocument();

    mockUseApp.mockReturnValue({ ...appMock, workspaceSettings: { displayName: "Renamed elsewhere" } });
    rerender(<WorkspaceTab />);

    expect(screen.getByDisplayValue("Renamed elsewhere")).toBeInTheDocument();
  });

  it("keeps local edits and flags remote changes until the admin loads the latest", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);
    const { rerender } = render(<WorkspaceTab />);

    fireEvent.change(screen.getByDisplayValue("Acme"), { target: { value: "My edit" } });
    mockUseApp.mockReturnValue({ ...appMock, workspaceSettings: { displayName: "Remote" } });
    rerender(<WorkspaceTab />);

    expect(screen.getByDisplayValue("My edit")).toBeInTheDocument();
    expect(screen.getByText(/changed elsewhere/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Load latest/i }));
    expect(screen.getByDisplayValue("Remote")).toBeInTheDocument();
  });

  it("locks the admin permissions that would cause a lockout", () => {
    mockUseApp.mockReturnValue(createAppMock());
    render(<WorkspaceTab />);

    expect(screen.getByTestId("perm-modules-admin-admin")).toBeDisabled();
    expect(screen.getByTestId("perm-actions-admin-workspace:manage")).toBeDisabled();
    expect(screen.getByTestId("perm-actions-admin-role:manage")).toBeDisabled();
    expect(screen.getByTestId("perm-actions-admin-audit:view")).not.toBeDisabled();
  });

  it("saves changes, keeps locked admin permissions and audits the changed sections", () => {
    const appMock = createAppMock({
      // A corrupted stored matrix that removed the admin module for admins.
      permissionMatrix: {
        ...DEFAULT_PERMISSION_MATRIX,
        admin: { ...DEFAULT_PERMISSION_MATRIX.admin, modules: { ...DEFAULT_PERMISSION_MATRIX.admin.modules, admin: false } },
      },
    });
    mockUseApp.mockReturnValue(appMock);
    render(<WorkspaceTab />);

    fireEvent.click(screen.getByTestId("perm-modules-member-archive"));
    fireEvent.click(screen.getByRole("button", { name: /Save workspace controls/i }));

    const savedMatrix = appMock.setPermissionMatrix.mock.calls[0][0];
    expect(savedMatrix.admin.modules.admin).toBe(true);
    expect(savedMatrix.member.modules.archive).toBe(true);
    expect(appMock.logAuditEvent).toHaveBeenCalledWith("workspace_security_updated", expect.objectContaining({
      changedSections: ["permissions"],
    }));
  });

  it("asks for confirmation on security changes when the workspace is protected", () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
    const appMock = createAppMock({
      sensitiveActionPolicy: { protectWorkspaceSettings: true },
    });
    mockUseApp.mockReturnValue(appMock);
    render(<WorkspaceTab />);

    fireEvent.click(screen.getByTestId("perm-modules-member-archive"));
    fireEvent.click(screen.getByRole("button", { name: /Save workspace controls/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(appMock.setPermissionMatrix).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("rejects an invalid support email", () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);
    render(<WorkspaceTab />);

    fireEvent.change(screen.getByPlaceholderText("ops@company.com"), { target: { value: "not-an-email" } });
    expect(screen.getByText(/Enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save workspace controls/i })).toBeDisabled();
  });

  it("disables template defaults without templates:manage", () => {
    mockUsePermissions.mockReturnValue({ canPerform: (key) => key !== "templates:manage" });
    mockUseApp.mockReturnValue(createAppMock());
    render(<WorkspaceTab />);

    expect(screen.getByDisplayValue("Doc A")).toBeDisabled();
    expect(screen.getByText(/Requires “Manage default templates”/i)).toBeInTheDocument();
  });

  it("requires typing the workspace name before resetting everything", async () => {
    const resetAllData = jest.fn().mockResolvedValue(true);
    mockUseApp.mockReturnValue(createAppMock({
      resetAllData,
      projects: [{ id: "p1" }, { id: "p2" }],
      docPages: [{ id: "d1" }],
    }));
    render(<WorkspaceTab />);

    fireEvent.click(screen.getByRole("button", { name: /Reset workspace/ }));
    expect(screen.getByText("2 projects")).toBeInTheDocument();
    expect(screen.getByText(/0 doc spaces and 1 page/)).toBeInTheDocument();

    const confirmButton = screen.getByTestId("workspace-reset-dialog-confirm");
    expect(confirmButton).toBeDisabled();
    fireEvent.change(screen.getByTestId("workspace-reset-dialog-input"), { target: { value: "Acm" } });
    expect(confirmButton).toBeDisabled();
    fireEvent.change(screen.getByTestId("workspace-reset-dialog-input"), { target: { value: "Acme" } });
    expect(confirmButton).toBeEnabled();

    const setTimeoutSpy = jest.spyOn(window, "setTimeout");
    await act(async () => { fireEvent.click(confirmButton); });
    expect(resetAllData).toHaveBeenCalledTimes(1);
    expect(mockAddToast).toHaveBeenCalledWith("Workspace reset. Reloading…", "success");
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 600);
    setTimeoutSpy.mockRestore();
  });
});
