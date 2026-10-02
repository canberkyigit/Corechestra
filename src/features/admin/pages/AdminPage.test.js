import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminPage from "./AdminPage";

const mockUseApp = jest.fn();
const mockUseAuth = jest.fn();
const mockUsePermissions = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockAddToast = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../shared/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));

jest.mock("../../../shared/services/firebase", () => ({
  db: { __type: "mock-db" },
}));

jest.mock("../../../shared/services/functions", () => ({
  isFunctionsEnabled: () => false,
  inviteUserFn: jest.fn(),
  deleteUserFn: jest.fn(),
  updateUserRoleFn: jest.fn(),
  setUserStatusFn: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  collection: (...args) => mockCollection(...args),
  getDocs: (...args) => mockGetDocs(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  updateDoc: (...args) => mockUpdateDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
}));

const usersRef = (id) => ({ db: { __type: "mock-db" }, collectionName: "users", id });

function createAppMock(overrides = {}) {
  return {
    teams: [],
    createTeam: jest.fn(),
    updateTeam: jest.fn(),
    deleteTeam: jest.fn(),
    projects: [{ id: "proj-1", name: "Corechestra", key: "CY", color: "#2563eb" }],
    createProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
    users: [
      { id: "uid-1", name: "Alice Admin", username: "alice", email: "alice@example.com", role: "admin", status: "active", color: "#2563eb" },
      { id: "uid-2", name: "Bob Member", username: "bob", email: "bob@example.com", role: "member", status: "active", color: "#10b981" },
    ],
    deletedUserIds: [],
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    setActiveTasks: jest.fn(),
    setBacklogSections: jest.fn(),
    updateTask: jest.fn(),
    logAuditEvent: jest.fn(),
    allTasks: [],
    workspaceSettings: { displayName: "Acme" },
    globalActivityLog: [],
    ...overrides,
  };
}

function mockAccounts(accounts) {
  mockGetDocs.mockResolvedValue({
    docs: accounts.map(({ uid, ...data }) => ({ id: uid, data: () => data })),
  });
}

function permissions({ denied = [], policy = {} } = {}) {
  return {
    canPerform: (key) => !denied.includes(key),
    canAccessPage: () => true,
    firstAccessiblePage: "board",
    sensitiveActionPolicy: {
      requireConfirmation: false,
      protectRoleChanges: false,
      requireAdminReason: false,
      ...policy,
    },
  };
}

async function openPeopleRow(name) {
  const label = await screen.findByText(name);
  return label.closest(".app-surface");
}

describe("AdminPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { uid: "uid-1", email: "alice@example.com" } });
    mockUsePermissions.mockReturnValue(permissions());
    mockUseApp.mockReturnValue(createAppMock());
    mockCollection.mockReturnValue("users-collection");
    mockDoc.mockImplementation((db, collectionName, id) => ({ db, collectionName, id }));
    mockAccounts([
      { uid: "uid-1", email: "alice@example.com", role: "admin" },
      { uid: "uid-2", email: "bob@example.com", role: "member" },
    ]);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockSetDoc.mockResolvedValue(undefined);
  });

  it("does not mutate tasks, users or teams on mount", async () => {
    const appMock = createAppMock({
      teams: [{ id: "team-1", name: "Core", memberNames: ["alice", "bob"], projectIds: [] }],
    });
    mockUseApp.mockReturnValue(appMock);

    render(<AdminPage />);
    await screen.findByText("Bob Member");

    expect(appMock.setActiveTasks).not.toHaveBeenCalled();
    expect(appMock.setBacklogSections).not.toHaveBeenCalled();
    expect(appMock.deleteUser).not.toHaveBeenCalled();
    expect(appMock.updateTeam).not.toHaveBeenCalled();
  });

  it("locks the current user in the access tab and lets admins change another user's role", async () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    render(<AdminPage />);

    fireEvent.click(screen.getByRole("button", { name: /Access/i }));

    expect(await screen.findByText(/Role changes are security-sensitive/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Cannot change your own role/i)).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("access-role-toggle-uid-2"), { target: { value: "admin" } });

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledWith(usersRef("uid-2"), { role: "admin" });
    });
    expect(appMock.updateUser).toHaveBeenCalledWith(expect.objectContaining({
      id: "uid-2",
      role: "admin",
    }));
    expect(appMock.logAuditEvent).toHaveBeenCalledWith("role_changed", expect.objectContaining({
      entityId: "uid-2",
      previousRole: "member",
      nextRole: "admin",
    }));
  });

  it("shows an error toast and re-enables the access UI when a role change fails", async () => {
    mockUpdateDoc.mockRejectedValueOnce(new Error("permission-denied"));
    render(<AdminPage />);
    fireEvent.click(screen.getByRole("button", { name: /Access/i }));

    const select = await screen.findByTestId("access-role-toggle-uid-2");
    fireEvent.change(select, { target: { value: "viewer" } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(expect.stringMatching(/Could not change role/i), "error");
    });
    expect(screen.getByTestId("access-role-toggle-uid-2")).not.toBeDisabled();
    expect(screen.getByTestId("access-role-toggle-uid-2")).toHaveValue("member");
  });

  it("hides soft-deleted accounts in the access tab", async () => {
    mockAccounts([
      { uid: "uid-1", email: "alice@example.com", role: "admin" },
      { uid: "uid-2", email: "bob@example.com", role: "member" },
      { uid: "uid-3", email: "gone@example.com", role: "member", deleted: true },
    ]);
    render(<AdminPage />);
    fireEvent.click(screen.getByRole("button", { name: /Access/i }));

    expect(await screen.findByText("bob@example.com")).toBeInTheDocument();
    expect(screen.queryByText("gone@example.com")).not.toBeInTheDocument();
  });

  it("refuses to demote the last active admin", async () => {
    // Current user is a member who was granted role:manage through the matrix.
    mockUseAuth.mockReturnValue({ user: { uid: "uid-2", email: "bob@example.com" } });
    render(<AdminPage />);
    fireEvent.click(screen.getByRole("button", { name: /Access/i }));

    const select = await screen.findByTestId("access-role-toggle-uid-1");
    fireEvent.change(select, { target: { value: "member" } });

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(expect.stringMatching(/last active admin/i), "error");
    });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it("asks for confirmation and a reason when the policy requires it", async () => {
    mockUsePermissions.mockReturnValue(permissions({ policy: { requireConfirmation: true, requireAdminReason: true } }));
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    const promptSpy = jest.spyOn(window, "prompt").mockReturnValue("Team lead");
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);

    render(<AdminPage />);
    fireEvent.click(screen.getByRole("button", { name: /Access/i }));
    fireEvent.change(await screen.findByTestId("access-role-toggle-uid-2"), { target: { value: "admin" } });

    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
    expect(confirmSpy).toHaveBeenCalled();
    expect(promptSpy).toHaveBeenCalled();
    expect(appMock.logAuditEvent).toHaveBeenCalledWith("role_changed", expect.objectContaining({ reason: "Team lead" }));
    confirmSpy.mockRestore();
    promptSpy.mockRestore();
  });

  it("changes the effective role from the People edit form", async () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);
    render(<AdminPage />);

    await screen.findByText("Bob Member");
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
    fireEvent.click(await screen.findByTestId("people-edit-uid-2"));
    fireEvent.click(screen.getByRole("radio", { name: "Viewer" }));
    fireEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledWith(usersRef("uid-2"), { role: "viewer" });
    });
    expect(appMock.updateUser).toHaveBeenCalledWith(expect.objectContaining({ id: "uid-2", role: "viewer", status: "active" }));
    const persisted = appMock.updateUser.mock.calls[0][0];
    expect(persisted).not.toHaveProperty("hasAccount");
  });

  it("deactivates an account so it is refused at login", async () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);
    render(<AdminPage />);

    await screen.findByText("Bob Member");
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
    fireEvent.click(await screen.findByTestId("people-toggle-status-uid-2"));

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledWith(
        usersRef("uid-2"),
        expect.objectContaining({ disabled: true, status: "inactive" }),
        { merge: true }
      );
    });
    expect(appMock.updateUser).toHaveBeenCalledWith(expect.objectContaining({ id: "uid-2", status: "inactive" }));
    expect(appMock.logAuditEvent).toHaveBeenCalledWith("user_deactivated", expect.objectContaining({ entityId: "uid-2" }));
  });

  it("soft-deletes the auth profile and removes the person from teams", async () => {
    const appMock = createAppMock({
      teams: [{ id: "team-1", name: "Core", memberNames: ["alice", "bob"], projectIds: [] }],
    });
    mockUseApp.mockReturnValue(appMock);
    render(<AdminPage />);

    await screen.findByText("Bob Member");
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
    fireEvent.click(await screen.findByTestId("people-delete-uid-2"));

    await waitFor(() => expect(appMock.deleteUser).toHaveBeenCalledWith("uid-2"));
    expect(mockSetDoc).toHaveBeenCalledWith(
      usersRef("uid-2"),
      expect.objectContaining({ deleted: true, disabled: true, status: "deleted" }),
      { merge: true }
    );
    expect(appMock.updateTeam).toHaveBeenCalledWith(expect.objectContaining({ id: "team-1", memberNames: ["alice"] }));
  });

  it("does not offer delete or deactivate for the signed-in admin", async () => {
    render(<AdminPage />);
    await screen.findByText("Bob Member");
    expect(screen.queryByTestId("people-delete-uid-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("people-toggle-status-uid-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("people-delete-uid-2")).toBeInTheDocument();
  });

  it("records an invite so the first login gets the invited role", async () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);
    render(<AdminPage />);

    fireEvent.click(await screen.findByRole("button", { name: /Invite New User/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Jane Doe"), { target: { value: "Carol New" } });
    fireEvent.change(screen.getByPlaceholderText("jane@company.io"), { target: { value: "Carol@Example.com" } });
    fireEvent.click(screen.getByRole("radio", { name: "Viewer" }));
    fireEvent.click(screen.getByRole("button", { name: /Invite User/i }));

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledWith(
        { db: { __type: "mock-db" }, collectionName: "invites", id: "carol@example.com" },
        expect.objectContaining({ role: "viewer", status: "pending" }),
        { merge: true }
      );
    });
    expect(appMock.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: "Carol@Example.com", role: "viewer" }));
  });

  it("rejects inviting an email that is already in the workspace", async () => {
    const appMock = createAppMock();
    mockUseApp.mockReturnValue(appMock);
    render(<AdminPage />);

    fireEvent.click(await screen.findByRole("button", { name: /Invite New User/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g. Jane Doe"), { target: { value: "Bob Again" } });
    fireEvent.change(screen.getByPlaceholderText("jane@company.io"), { target: { value: "bob@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Invite User/i }));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(expect.stringMatching(/already part of this workspace/i), "error");
    });
    expect(appMock.createUser).not.toHaveBeenCalled();
  });

  it("hides management controls the role is not allowed to use", async () => {
    mockUsePermissions.mockReturnValue(permissions({
      denied: ["user:invite", "user:manage", "project:manage", "team:manage"],
    }));
    render(<AdminPage />);

    await screen.findByText("Bob Member");
    expect(screen.queryByRole("button", { name: /Invite New User/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("people-edit-uid-2")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Projects/i }));
    expect(screen.queryByRole("button", { name: /Create New Project/i })).not.toBeInTheDocument();
    expect(screen.getByText(/requires “Manage projects”/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Teams/i }));
    expect(screen.queryByRole("button", { name: /Create New Team/i })).not.toBeInTheDocument();
  });

  it("offers an explicit clean-up for legacy demo records", async () => {
    const appMock = createAppMock({
      users: [
        ...createAppMock().users,
        { id: "seed-1", name: "Seed", username: "carol", email: "carol@corechestra.io", role: "member", status: "active" },
      ],
    });
    mockUseApp.mockReturnValue(appMock);
    render(<AdminPage />);

    const button = await screen.findByRole("button", { name: /Remove legacy records/i });
    expect(appMock.deleteUser).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(appMock.deleteUser).toHaveBeenCalledWith("seed-1");
    expect(appMock.deleteUser).toHaveBeenCalledTimes(1);
  });

  it("uses the effective auth role in the People list", async () => {
    mockAccounts([
      { uid: "uid-1", email: "alice@example.com", role: "admin" },
      { uid: "uid-2", email: "bob@example.com", role: "viewer" },
    ]);
    render(<AdminPage />);
    const row = await openPeopleRow("Bob Member");
    await waitFor(() => expect(within(row).getByText("Viewer")).toBeInTheDocument());
  });
});
