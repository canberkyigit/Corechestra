import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import CommentSection from "./CommentSection";

const mockUseApp = jest.fn();
const mockCanPerform = jest.fn();

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canPerform: (key) => mockCanPerform(key), canAccessPage: () => true }),
}));

const users = [
  { id: "u-1", username: "alice", name: "Alice", color: "#4f46e5" },
  { id: "u-2", username: "bob", name: "Bob", color: "#10b981" },
  { id: "u-3", username: "carol", name: "Carol", color: "#f59e0b" },
];

function setup({ savedComments = [], allTasks = [], currentUser = "alice" } = {}) {
  const addNotification = jest.fn();
  const onUpdate = jest.fn();
  mockUseApp.mockReturnValue({
    addNotification,
    currentUser,
    users,
    teamMembers: users.map((user) => ({ value: user.username, label: user.name })),
  });
  render(
    <CommentSection
      savedComments={savedComments}
      allTasks={allTasks}
      onUpdate={onUpdate}
      taskTitle="Fix login"
      taskId="CY-1"
    />
  );
  return { addNotification, onUpdate };
}

describe("CommentSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanPerform.mockReturnValue(true);
  });

  it("stores new comments with the real author in the shared comment shape", () => {
    const { onUpdate } = setup();

    fireEvent.change(screen.getByPlaceholderText(/Add a comment/i), { target: { value: "Looks good" } });
    fireEvent.click(screen.getByRole("button", { name: /Send/i }));

    const [comments] = onUpdate.mock.calls[0];
    expect(comments[0]).toMatchObject({ author: "alice", text: "Looks good", replyTo: null });
    expect(typeof comments[0].createdAt).toBe("string");
    expect(comments[0]).not.toHaveProperty("user");
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("only lets the author edit or delete their own comments; legacy 'You' comments are not owned", () => {
    setup({
      savedComments: [
        { id: "c-own", author: "alice", text: "mine", createdAt: "2026-04-01T10:00:00.000Z" },
        { id: "c-bob", author: "bob", text: "his", createdAt: "2026-04-01T10:00:00.000Z" },
        { id: 3, user: "You", text: "legacy", timestamp: "2026-04-01T10:00:00.000Z" },
      ],
    });

    const own = screen.getByTestId("task-comment-c-own");
    const bob = screen.getByTestId("task-comment-c-bob");
    const legacy = screen.getByTestId("task-comment-3");

    expect(within(own).getByTitle("Edit")).toBeInTheDocument();
    expect(within(own).getByTitle("Delete")).toBeInTheDocument();
    expect(within(bob).queryByTitle("Edit")).not.toBeInTheDocument();
    expect(within(bob).queryByTitle("Delete")).not.toBeInTheDocument();
    expect(within(legacy).queryByTitle("Delete")).not.toBeInTheDocument();
    expect(within(legacy).getByText("Unknown author")).toBeInTheDocument();
  });

  it("sends targeted notifications to mentioned users and the assignee, never to the author", () => {
    const { addNotification } = setup({
      allTasks: [{ id: "CY-1", title: "Fix login", assignedTo: "carol", watchers: ["alice"] }],
    });

    fireEvent.change(screen.getByPlaceholderText(/Add a comment/i), {
      target: { value: "@bob @alice @nobody can you check?" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send/i }));

    const calls = addNotification.mock.calls.map(([notification]) => notification);
    expect(calls).toEqual([
      expect.objectContaining({ type: "mention", recipient: "bob", actor: "alice", taskId: "CY-1" }),
      expect.objectContaining({ type: "comment", recipient: "carol", actor: "alice", taskId: "CY-1" }),
    ]);
  });

  it("inserts task references as CY- keys (no CY-CY- double prefix)", () => {
    setup({ allTasks: [{ id: "CY-42", title: "Payment bug" }] });
    const textarea = screen.getByPlaceholderText(/Add a comment/i);

    fireEvent.change(textarea, { target: { value: "#42", selectionStart: 3 } });
    fireEvent.mouseDown(screen.getByText("Payment bug"));

    expect(textarea.value).toBe("CY-42 ");
  });

  it("is read-only for roles without task:edit: comments stay visible but cannot be added or changed", () => {
    mockCanPerform.mockImplementation((key) => key !== "task:edit");
    const { onUpdate } = setup({
      savedComments: [
        { id: "c-own", author: "alice", text: "mine", createdAt: "2026-04-01T10:00:00.000Z", reactions: { "👍": ["bob"] } },
      ],
    });

    expect(mockCanPerform).toHaveBeenCalledWith("task:edit");
    expect(screen.getByText("mine")).toBeInTheDocument();
    expect(screen.getByTestId("task-comments-read-only")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Add a comment/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Reply$/i })).not.toBeInTheDocument();

    const own = screen.getByTestId("task-comment-c-own");
    expect(within(own).queryByTitle("Edit")).not.toBeInTheDocument();
    expect(within(own).queryByTitle("Delete")).not.toBeInTheDocument();
    expect(within(own).queryByTitle(/^Pin$/)).not.toBeInTheDocument();

    const reactionChip = within(own).getByTitle("bob");
    expect(reactionChip).toBeDisabled();
    fireEvent.click(reactionChip);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
