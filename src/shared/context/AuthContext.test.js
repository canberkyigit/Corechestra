import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockSignOut = jest.fn();
const mockSignIn = jest.fn();
const mockSetPersistence = jest.fn();
const mockSendReset = jest.fn();
let mockAuthCallback = null;

jest.mock("../services/firebase", () => ({
  auth: { __type: "auth" },
  db: { __type: "db" },
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (auth, callback) => {
    mockAuthCallback = callback;
    return () => {};
  },
  signOut: (...args) => mockSignOut(...args),
  signInWithEmailAndPassword: (...args) => mockSignIn(...args),
  setPersistence: (...args) => mockSetPersistence(...args),
  sendPasswordResetEmail: (...args) => mockSendReset(...args),
  browserLocalPersistence: "local",
  browserSessionPersistence: "session",
}));

jest.mock("firebase/firestore", () => ({
  doc: (db, collection, id) => ({ path: `${collection}/${id}` }),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
}));

const mockFlushUserPrefs = jest.fn();
const mockFlushPendingWrites = jest.fn();
jest.mock("../services/storage", () => ({
  flushPendingWrites: (...args) => mockFlushPendingWrites(...args),
}));

jest.mock("../services/userPrefsStorage", () => ({
  flushUserPrefs: (...args) => mockFlushUserPrefs(...args),
}));

function snapshot(data) {
  return { exists: () => data !== null && data !== undefined, data: () => data };
}

function mockDocs(map) {
  mockGetDoc.mockImplementation((ref) => Promise.resolve(snapshot(map[ref.path] ?? null)));
}

let latest = null;
function Probe() {
  latest = useAuth();
  const { user, role, authError } = latest;
  return (
    <div>
      <span data-testid="user">{user === undefined ? "loading" : user ? user.uid : "none"}</span>
      <span data-testid="role">{role || "-"}</span>
      <span data-testid="error">{authError || ""}</span>
    </div>
  );
}

const FIREBASE_USER = { uid: "uid-9", email: "Nina@Example.com" };

async function signIn(user = FIREBASE_USER) {
  await act(async () => {
    await mockAuthCallback(user);
  });
}

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthCallback = null;
    mockSetDoc.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
    mockOnSnapshot.mockReturnValue(() => {});
    mockSetPersistence.mockResolvedValue(undefined);
    mockSignIn.mockResolvedValue({});
    mockSendReset.mockResolvedValue(undefined);
    mockFlushUserPrefs.mockResolvedValue(false);
    mockFlushPendingWrites.mockResolvedValue();
  });

  it("refuses a deactivated account and keeps the reason for the login page", async () => {
    mockDocs({ "users/uid-9": { email: "nina@example.com", role: "member", disabled: true, status: "inactive" } });
    render(<AuthProvider><Probe /></AuthProvider>);

    await signIn();

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(screen.getByTestId("error")).toHaveTextContent(/deactivated/i);
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it("refuses a deleted account without re-creating its profile", async () => {
    mockDocs({ "users/uid-9": { email: "nina@example.com", role: "member", deleted: true } });
    render(<AuthProvider><Probe /></AuthProvider>);

    await signIn();

    expect(screen.getByTestId("error")).toHaveTextContent(/removed from the workspace/i);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("applies a pending invite role on first login", async () => {
    mockDocs({ "invites/nina@example.com": { role: "viewer", status: "pending", name: "Nina" } });
    render(<AuthProvider><Probe /></AuthProvider>);

    await signIn();

    expect(screen.getByTestId("user")).toHaveTextContent("uid-9");
    expect(screen.getByTestId("role")).toHaveTextContent("viewer");
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: "users/uid-9" },
      { email: "Nina@Example.com", role: "viewer", name: "Nina" }
    );
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: "invites/nina@example.com" },
      expect.objectContaining({ status: "accepted", acceptedUid: "uid-9" }),
      { merge: true }
    );
  });

  it("refuses a revoked invite on first login", async () => {
    mockDocs({ "invites/nina@example.com": { role: "member", status: "revoked" } });
    render(<AuthProvider><Probe /></AuthProvider>);

    await signIn();

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("signs out when an admin deactivates the account during the session", async () => {
    mockDocs({ "users/uid-9": { email: "nina@example.com", role: "admin" } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn();
    expect(screen.getByTestId("role")).toHaveTextContent("admin");

    const onNext = mockOnSnapshot.mock.calls[0][1];
    act(() => {
      onNext(snapshot({ email: "nina@example.com", role: "admin", disabled: true }));
    });

    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(screen.getByTestId("error")).toHaveTextContent(/deactivated/i);
  });

  it("falls back to member for an unknown stored role", async () => {
    mockDocs({ "users/uid-9": { email: "nina@example.com", role: "owner" } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn();
    expect(screen.getByTestId("role")).toHaveTextContent("member");
  });

  it("uses session persistence when remember-me is off and clears old errors", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => {
      await latest.login("nina@example.com", "pw", { remember: false });
    });
    expect(mockSetPersistence).toHaveBeenCalledWith({ __type: "auth" }, "session");
    expect(mockSignIn).toHaveBeenCalledWith({ __type: "auth" }, "nina@example.com", "pw");
  });

  it("sends password reset emails and validates the address", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => {
      await latest.sendPasswordReset(" nina@example.com ");
    });
    expect(mockSendReset).toHaveBeenCalledWith({ __type: "auth" }, "nina@example.com");
    await expect(latest.sendPasswordReset("")).rejects.toMatchObject({ code: "auth/missing-email" });
  });

  it("never writes access-control fields from a profile update", async () => {
    mockDocs({ "users/uid-9": { email: "nina@example.com", role: "member" } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn();

    await act(async () => {
      await latest.updateProfile({ name: "Nina", role: "admin", disabled: false });
    });
    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalledWith({ path: "users/uid-9" }, { name: "Nina" }, { merge: true });
    });
  });

  it("flushes pending prefs and workspace writes before signing out", async () => {
    const order = [];
    mockFlushUserPrefs.mockImplementation(async () => { order.push("flush"); return true; });
    mockFlushPendingWrites.mockImplementation(async () => { order.push("flushWorkspace"); });
    mockSignOut.mockImplementation(async () => { order.push("signOut"); });
    mockDocs({ "users/uid-9": { email: "nina@example.com", role: "member" } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn();

    await act(async () => {
      await latest.logout();
    });

    expect(order).toEqual(["flush", "flushWorkspace", "signOut"]);
  });

  it("still signs out when the prefs flush never settles", async () => {
    jest.useFakeTimers();
    mockFlushUserPrefs.mockReturnValue(new Promise(() => {}));
    mockDocs({ "users/uid-9": { email: "nina@example.com", role: "member" } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await signIn();

    let done;
    act(() => {
      done = latest.logout();
    });
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await done;
    });

    expect(mockSignOut).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
