import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProfilePage from "./ProfilePage";

const mockUseApp = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({
    rolePermissions: jest.requireActual("../../../shared/constants/permissions").DEFAULT_PERMISSION_MATRIX.viewer,
  }),
}));

const USER = { uid: "uid-1", email: "alice@example.com", providerData: [{ providerId: "password" }] };
const PROFILE = { email: "alice@example.com", name: "Alice", fullName: "Alice Doe", title: "Engineer", timezone: "UTC", bio: "Hi", color: "#059669" };

function createAppMock(overrides = {}) {
  return {
    activeTasks: [],
    users: [{ id: "uid-1", name: "Alice Doe", username: "alice", email: "alice@example.com", color: "#059669", status: "active", role: "viewer" }],
    updateUser: jest.fn(),
    globalActivityLog: [],
    notificationPreferences: { inApp: { assignments: true, mentions: false }, email: {}, digest: "daily" },
    setNotificationPreferences: jest.fn(),
    workspaceSettings: { supportEmail: "help@acme.io" },
    ...overrides,
  };
}

function createAuthMock(overrides = {}) {
  return {
    user: USER,
    role: "viewer",
    profile: PROFILE,
    logout: jest.fn(),
    updateProfile: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("ProfilePage", () => {
  let appMock;
  let authMock;

  beforeEach(() => {
    appMock = createAppMock();
    authMock = createAuthMock();
    mockUseApp.mockImplementation(() => appMock);
    mockUseAuth.mockImplementation(() => authMock);
  });

  it("edits the real store notification preferences", () => {
    render(<ProfilePage />);

    const mentions = screen.getByRole("switch", { name: "Mentions" });
    expect(mentions).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: "Assignments" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(mentions);
    const updater = appMock.setNotificationPreferences.mock.calls[0][0];
    expect(updater(appMock.notificationPreferences).inApp).toEqual({ assignments: true, mentions: true });

    fireEvent.click(screen.getByRole("switch", { name: "Comments" }));
    const second = appMock.setNotificationPreferences.mock.calls[1][0];
    expect(second(appMock.notificationPreferences).inApp.comments).toBe(false);
  });

  it("saves profile fields without notifPrefs and mirrors only identity to People", async () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Alice Smith" } });
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    await waitFor(() => expect(authMock.updateProfile).toHaveBeenCalled());
    const fields = authMock.updateProfile.mock.calls[0][0];
    expect(fields).toEqual(expect.objectContaining({ fullName: "Alice Smith", timezone: "UTC" }));
    expect(fields).not.toHaveProperty("notifPrefs");

    const peopleRecord = appMock.updateUser.mock.calls[0][0];
    expect(peopleRecord).toEqual(expect.objectContaining({ id: "uid-1", name: "Alice Smith" }));
    expect(peopleRecord).not.toHaveProperty("bio");
    expect(peopleRecord).not.toHaveProperty("timezone");
  });

  it("shows an error and stays in edit mode when saving fails", async () => {
    authMock.updateProfile = jest.fn().mockRejectedValue(new Error("offline"));
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not save your profile/i);
    expect(screen.getByRole("button", { name: /^Save$/i })).toBeInTheDocument();
    expect(appMock.updateUser).not.toHaveBeenCalled();
  });

  it("cancel restores the saved values", () => {
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    fireEvent.change(screen.getByLabelText("Job Title"), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(screen.getAllByText("Engineer").length).toBeGreaterThan(0);
    expect(screen.queryByText("Changed")).not.toBeInTheDocument();
  });

  it("sends a password reset through the auth context and handles errors", async () => {
    authMock.sendPasswordReset = jest.fn().mockRejectedValueOnce(Object.assign(new Error("x"), { code: "auth/too-many-requests" }));
    render(<ProfilePage />);

    fireEvent.click(screen.getByRole("button", { name: /Change Password/i }));
    expect(await screen.findByText(/Too many requests/i)).toBeInTheDocument();
    expect(authMock.sendPasswordReset).toHaveBeenCalledWith("alice@example.com");
  });

  it("shows the role's access and the workspace support contact", () => {
    render(<ProfilePage />);

    expect(screen.getByText("Your access")).toBeInTheDocument();
    expect(screen.getByText("Read-only")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "help@acme.io" })).toHaveAttribute("href", "mailto:help@acme.io");
  });
});
