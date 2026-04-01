import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminPage from "./AdminPage";

const mockUseApp = jest.fn();
const mockUseAuth = jest.fn();
const mockUsePermissions = jest.fn();
const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => mockUsePermissions(),
}));

jest.mock("../../../shared/services/firebase", () => ({
  db: { __type: "mock-db" },
}));

jest.mock("firebase/firestore", () => ({
  collection: (...args) => mockCollection(...args),
  getDocs: (...args) => mockGetDocs(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: jest.fn(),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: jest.fn(),
}));

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
    allTasks: [],
    ...overrides,
  };
}

describe("AdminPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { uid: "uid-1", email: "alice@example.com" } });
    mockUsePermissions.mockReturnValue({
      canPerform: () => true,
      canAccessPage: () => true,
      firstAccessiblePage: "board",
      sensitiveActionPolicy: {
        protectRoleChanges: false,
      },
    });
    mockUseApp.mockReturnValue(createAppMock());
    mockCollection.mockReturnValue("users-collection");
    mockDoc.mockImplementation((db, collectionName, id) => ({ db, collectionName, id }));
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: "uid-1", data: () => ({ email: "alice@example.com", role: "admin" }) },
        { id: "uid-2", data: () => ({ email: "bob@example.com", role: "member" }) },
      ],
    });
    mockUpdateDoc.mockResolvedValue(undefined);
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
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { db: { __type: "mock-db" }, collectionName: "users", id: "uid-2" },
        { role: "admin" }
      );
    });
    expect(appMock.updateUser).toHaveBeenCalledWith(expect.objectContaining({
      id: "uid-2",
      role: "admin",
    }));
  });
});
