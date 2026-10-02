import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ChatProvider, useChatUnread } from "../../../shared/context/ChatContext";
import { setChatBackend } from "../../../shared/services/chat/chatService";
import { createLocalChatBackend } from "../../../shared/services/chat/chatLocalBackend";
import ChatsPage from "./ChatsPage";
import { emitWorkspaceEvent } from "../../../shared/services/workspaceEvents";
import { projectChannelId } from "../../../shared/services/chat/chatModel";

const mockAddNotification = jest.fn();
const mockAddToast = jest.fn();
const mockCreateTask = jest.fn((task) => ({ ...task, id: "CY-1000" }));
let mockAuthUser = { uid: "u1", email: "ayse@corp.io" };

jest.mock("react-router-dom", () => ({
  useLocation: () => ({ search: "", key: "initial" }),
}), { virtual: true });

jest.mock("../../../shared/services/firebase", () => ({ db: null, auth: null }));

jest.mock("../../../shared/context/AppContext", () => ({
  useApp: () => ({
    users: [
      { id: "u1", name: "Ayşe Yılmaz", username: "ayse", email: "ayse@corp.io", color: "#6366f1", status: "active" },
      { id: "u2", name: "Mehmet Kaya", username: "mehmet", email: "mehmet@corp.io", color: "#10b981", status: "active" },
    ],
    deletedUserIds: [],
    addNotification: mockAddNotification,
    currentUser: "ayse",
    activeTasks: [],
    backlogSections: [],
    archivedTasks: [],
    projects: [{ id: "proj-1", name: "Corechestra" }],
    currentProjectId: "proj-1",
    createTask: mockCreateTask,
  }),
}));

jest.mock("../../../shared/context/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthUser, profile: null, isAdmin: false }),
}));

jest.mock("../../../shared/context/hooks/usePermissions", () => ({
  usePermissions: () => ({ canAccessPage: () => true, canPerform: () => true }),
}));

jest.mock("../../../shared/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

let backend;

function UnreadProbe() {
  const unread = useChatUnread();
  return <span data-testid="unread-badge">{unread.badge}</span>;
}

function renderChats() {
  return render(
    <ChatProvider>
      <UnreadProbe />
      <ChatsPage />
    </ChatProvider>
  );
}

async function sendFromComposer(text) {
  const input = await screen.findByTestId("chat-composer-input");
  fireEvent.change(input, { target: { value: text, selectionStart: text.length } });
  fireEvent.keyDown(input, { key: "Enter" });
}

describe("ChatsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockAuthUser = { uid: "u1", email: "ayse@corp.io" };
    backend = createLocalChatBackend({ storageKey: `chat-test-${Math.random()}` });
    setChatBackend(backend);
    // jsdom can't run the TipTap editor; use the plain markdown composer.
    backend.updateUserState("u1", { prefs: { richComposer: false } });
  });

  afterAll(() => setChatBackend(null));

  it("creates #general and sends a message with a mention", async () => {
    renderChats();
    expect(await screen.findByTestId("chat-row-general")).toBeInTheDocument();
    expect(await screen.findByText("Welcome to #general")).toBeInTheDocument();

    await sendFromComposer("Hello @Mehmet Kaya **team**");

    const list = screen.getByTestId("chat-message-list");
    await waitFor(() => expect(within(list).getByText("@Mehmet Kaya")).toBeInTheDocument());
    expect(within(list).getByText("team").tagName).toBe("STRONG");

    // Mehmet gets an inbox mention and an app notification targeted at his username.
    let inbox = [];
    backend.subscribeInbox("u2", (items) => { inbox = items; })();
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({ kind: "mention", channelId: "general" });
    expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "chat_mention", recipient: "mehmet" }));
  });

  it("shows unread DMs in the badge and clears them when opened", async () => {
    await backend.ensureChannel({ id: "dm_u1__u2", type: "dm", name: "", isPrivate: true, memberIds: ["u1", "u2"], seq: 0, createdAt: 1, lastMessageAt: 1 });
    renderChats();
    await screen.findByTestId("chat-row-general");

    await act(async () => {
      await backend.postMessage({
        message: { id: "m-dm-1", channelId: "dm_u1__u2", authorId: "u2", text: "Got a minute?", createdAt: Date.now(), reactions: {} },
        preview: "Got a minute?",
      });
    });
    await waitFor(() => expect(screen.getByTestId("unread-badge")).toHaveTextContent("1"));

    fireEvent.click(await screen.findByTestId("chat-row-dm_u1__u2"));
    expect(await screen.findByText("Got a minute?")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("unread-badge")).toHaveTextContent("0"), { timeout: 3000 });
  });

  it("opens a direct message from the new message dialog", async () => {
    renderChats();
    await screen.findByTestId("chat-row-general");
    fireEvent.click(screen.getByTestId("chat-new-message"));
    fireEvent.click(await screen.findByText("Mehmet Kaya"));
    fireEvent.click(screen.getByTestId("chat-open-dm"));
    expect(await screen.findByTestId("chat-row-dm_u1__u2")).toBeInTheDocument();
    expect(await screen.findByText(/very beginning of your conversation/)).toBeInTheDocument();
  });

  it("runs slash commands instead of posting them", async () => {
    renderChats();
    await screen.findByTestId("chat-row-general");
    await sendFromComposer("/topic Release week");
    await waitFor(() => expect(screen.getAllByText("Release week").length).toBeGreaterThan(0));
    let channels = [];
    backend.subscribeChannels("u1", (list) => { channels = list; })();
    expect(channels.find((entry) => entry.id === "general").topic).toBe("Release week");
  });

  it("creates a private channel through the dialog", async () => {
    renderChats();
    await screen.findByTestId("chat-row-general");
    fireEvent.click(screen.getByLabelText("Add channels"));
    fireEvent.click(within(screen.getByRole("menu")).getByText("Create a channel"));
    fireEvent.change(screen.getByTestId("chat-channel-name"), { target: { value: "Release Planning" } });
    fireEvent.click(screen.getByText("Private"));
    fireEvent.click(screen.getByTestId("chat-create-channel-next"));
    fireEvent.click(screen.getByTestId("chat-create-channel-submit"));
    expect(await screen.findByText("Welcome to #release-planning")).toBeInTheDocument();
    let channels = [];
    backend.subscribeChannels("u2", (list) => { channels = list; })();
    expect(channels.some((entry) => entry.name === "release-planning")).toBe(false);
  });
});

describe("ChatsPage – integrations and productivity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    backend = createLocalChatBackend({ storageKey: `chat-int-${Math.random()}` });
    setChatBackend(backend);
    backend.updateUserState("u1", { prefs: { richComposer: false } });
  });

  afterAll(() => setChatBackend(null));

  it("creates the project channel and posts board events as bot cards", async () => {
    renderChats();
    const row = await screen.findByTestId(`chat-row-${projectChannelId("proj-1")}`);
    act(() => {
      emitWorkspaceEvent({
        type: "task_status", projectId: "proj-1", actor: "ayse",
        task: { id: "CY-1000", title: "Fix login" }, from: "todo", fromLabel: "To Do", to: "done", toLabel: "Done",
      });
    });
    fireEvent.click(row);
    const card = await screen.findByTestId("chat-bot-card");
    expect(within(card).getByText("Ayşe Yılmaz moved CY-1000 to Done")).toBeInTheDocument();
    expect(within(card).getByText("Fix login")).toBeInTheDocument();
  });

  it("creates a poll and votes on it", async () => {
    renderChats();
    await screen.findByTestId("chat-row-general");
    fireEvent.click(await screen.findByTestId("chat-composer-plus"));
    fireEvent.click(screen.getByText("Create a poll"));
    fireEvent.change(screen.getByPlaceholderText("What should we decide?"), { target: { value: "Retro day?" } });
    fireEvent.change(screen.getByLabelText("Option 1"), { target: { value: "Thursday" } });
    fireEvent.change(screen.getByLabelText("Option 2"), { target: { value: "Friday" } });
    fireEvent.click(screen.getByTestId("chat-poll-submit"));
    const pollCard = await screen.findByTestId("chat-poll");
    expect(within(pollCard).getByText("Retro day?")).toBeInTheDocument();
    fireEvent.click(within(pollCard).getByText("Friday"));
    await waitFor(() => expect(within(screen.getByTestId("chat-poll")).getByText("100% · 1")).toBeInTheDocument());
    expect(within(screen.getByTestId("chat-poll")).getByText("1 person voted")).toBeInTheDocument();
  });

  it("delivers due scheduled messages and raises due reminders", async () => {
    const now = Date.now();
    await backend.ensureChannel({ id: "general", type: "channel", name: "general", isDefault: true, memberIds: [], seq: 0, createdAt: 1 });
    await backend.updateUserState("u1", {
      scheduled: { s1: { id: "s1", channelId: "general", text: "Good morning team", at: now - 1000, createdAt: now - 60000 } },
      reminders: { r1: { id: "r1", at: now - 500, text: "Review release notes", done: false, notifiedAt: 0, createdAt: now - 1 } },
    });
    renderChats();
    expect(await screen.findByText("Good morning team", {}, { timeout: 4000 })).toBeInTheDocument();
    let state = null;
    backend.subscribeUserState("u1", (value) => { state = value; })();
    expect(state.scheduled?.s1).toBeUndefined();
    expect(state.reminders.r1.notifiedAt).toBeGreaterThan(0);
  });

  it("shows conversations with unread messages in All unreads", async () => {
    await backend.ensureChannel({ id: "dm_u1__u2", type: "dm", name: "", isPrivate: true, memberIds: ["u1", "u2"], seq: 0, createdAt: 1, lastMessageAt: 1 });
    await backend.postMessage({ message: { id: "x1", channelId: "dm_u1__u2", authorId: "u2", text: "Ping from Mehmet", createdAt: Date.now(), reactions: {} }, preview: "Ping" });
    renderChats();
    fireEvent.click(await screen.findByTestId("chat-nav-unreads"));
    const card = await screen.findByTestId("unread-card-dm_u1__u2");
    expect(await within(card).findByText("Ping from Mehmet")).toBeInTheDocument();
    fireEvent.click(within(card).getByText("Mark read"));
    await waitFor(() => expect(screen.queryByTestId("unread-card-dm_u1__u2")).not.toBeInTheDocument());
  });

  it("lists scheduled messages in Later and cancels them", async () => {
    await backend.updateUserState("u1", { scheduled: { s9: { id: "s9", channelId: "general", text: "Later text", at: Date.now() + 3600000, createdAt: 1 } } });
    renderChats();
    fireEvent.click(await screen.findByTestId("chat-nav-later"));
    fireEvent.click(screen.getByTestId("later-tab-scheduled"));
    const row = await screen.findByTestId("scheduled-s9");
    expect(within(row).getByText("Later text")).toBeInTheDocument();
    fireEvent.click(within(row).getByTitle("Cancel"));
    await waitFor(() => expect(screen.queryByTestId("scheduled-s9")).not.toBeInTheDocument());
  });

  it("quote-replies to a message", async () => {
    renderChats();
    await screen.findByTestId("chat-row-general");
    await sendFromComposer("Original thought");
    const list = screen.getByTestId("chat-message-list");
    await within(list).findByText("Original thought");
    fireEvent.click(within(list).getAllByLabelText("More actions").pop());
    fireEvent.click(screen.getByText("Quote reply"));
    expect(await screen.findByTestId("chat-quote-bar")).toBeInTheDocument();
    await sendFromComposer("Agreed");
    await within(list).findByText("Agreed");
    let messages = [];
    backend.subscribeMessages("general", 50, (value) => { messages = value; })();
    const reply = messages.find((entry) => entry.text === "Agreed");
    expect(reply.quote).toMatchObject({ authorId: "u1", preview: "Original thought" });
  });
});
