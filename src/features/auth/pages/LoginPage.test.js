import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "./LoginPage";

const mockUseAuth = jest.fn();

jest.mock("../../../shared/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../shared/components/Logo", () => () => <div>Logo</div>);

jest.mock("framer-motion", () => {
  const ReactLib = require("react");
  const strip = ({ initial, animate, exit, transition, ...rest }) => rest;
  return {
    motion: {
      div: ReactLib.forwardRef(({ children, ...props }, ref) => <div ref={ref} {...strip(props)}>{children}</div>),
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

function createAuthMock(overrides = {}) {
  return {
    login: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    authError: null,
    clearAuthError: jest.fn(),
    ...overrides,
  };
}

describe("LoginPage", () => {
  let authMock;

  beforeEach(() => {
    window.localStorage.clear();
    authMock = createAuthMock();
    mockUseAuth.mockImplementation(() => authMock);
  });

  it("signs in with remember-me and remembers the email", async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: " alice@example.com " } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }));

    await waitFor(() => expect(authMock.login).toHaveBeenCalledWith("alice@example.com", "secret", { remember: true }));
    expect(window.localStorage.getItem("corechestra_remember_email")).toBe("alice@example.com");
  });

  it("uses session persistence when remember-me is unchecked", async () => {
    window.localStorage.setItem("corechestra_remember_email", "old@example.com");
    render(<LoginPage />);

    expect(screen.getByLabelText("Email")).toHaveValue("old@example.com");
    fireEvent.click(screen.getByRole("checkbox", { name: /Keep me signed in/i }));
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }));

    await waitFor(() => expect(authMock.login).toHaveBeenCalledWith("old@example.com", "secret", { remember: false }));
    expect(window.localStorage.getItem("corechestra_remember_email")).toBeNull();
  });

  it("maps auth errors to friendly messages", async () => {
    authMock.login = jest.fn().mockRejectedValue(Object.assign(new Error("x"), { code: "auth/user-disabled" }));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bob@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/deactivated/i);
  });

  it("validates missing fields without calling login", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Enter your email address/i);
    expect(authMock.login).not.toHaveBeenCalled();
  });

  it("shows the access-refused message from the auth context", () => {
    authMock.authError = "This account has been removed from the workspace.";
    render(<LoginPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(/removed from the workspace/i);
  });

  it("sends a password reset link from the forgot password view", async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /Forgot password/i }));
    expect(screen.getByText("Reset your password")).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alice@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Send reset link/i }));

    await waitFor(() => expect(authMock.sendPasswordReset).toHaveBeenCalledWith("alice@example.com"));
    expect(await screen.findByRole("status")).toHaveTextContent(/If an account exists for alice@example.com/i);

    fireEvent.click(screen.getByRole("button", { name: /Back to login/i }));
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("does not reveal whether the account exists when resetting", async () => {
    authMock.sendPasswordReset = jest.fn().mockRejectedValue(Object.assign(new Error("x"), { code: "auth/user-not-found" }));
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /Forgot password/i }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nobody@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Send reset link/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/If an account exists/i);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
