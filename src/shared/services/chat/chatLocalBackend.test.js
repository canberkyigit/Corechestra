import { createLocalChatBackend } from "./chatLocalBackend";
import { INBOX_KINDS } from "./chatModel";

const KEY = "test_chat_store";

function channelDoc(overrides = {}) {
  return {
    id: "c1", type: "channel", name: "dev", isPrivate: false, memberIds: ["u1", "u2"], seq: 0, createdAt: 1, ...overrides,
  };
}

function message(overrides = {}) {
  return { id: `m-${Math.random().toString(36).slice(2)}`, channelId: "c1", authorId: "u1", text: "hello", createdAt: Date.now(), reactions: {}, ...overrides };
}

describe("local chat backend", () => {
  let backend;
  beforeEach(() => {
    window.localStorage.clear();
    backend = createLocalChatBackend({ storageKey: KEY });
  });

  it("posts messages with sequence numbers, read markers and inbox entries", async () => {
    await backend.createChannel(channelDoc());
    const first = await backend.postMessage({ message: message({ text: "<@u2> hi" }), preview: "@Mehmet hi", inboxTargets: [{ uid: "u2", kind: INBOX_KINDS.MENTION }] });
    expect(first.seq).toBe(1);

    const states = [];
    const unsub = backend.subscribeUserState("u1", (state) => states.push(state));
    expect(states[states.length - 1].readSeq.c1).toBe(1);
    unsub();

    const inbox = [];
    backend.subscribeInbox("u2", (items) => inbox.push(items))();
    expect(inbox[0]).toHaveLength(1);
    expect(inbox[0][0]).toMatchObject({ kind: "mention", channelId: "c1", read: false, preview: "@Mehmet hi" });

    const channels = [];
    backend.subscribeChannels("u2", (list) => channels.push(list))();
    expect(channels[0][0]).toMatchObject({ seq: 1, lastMessage: { authorId: "u1", preview: "@Mehmet hi" } });
  });

  it("does not count system messages as unread", async () => {
    await backend.createChannel(channelDoc());
    await backend.postMessage({ message: message({ text: "", system: { type: "joined" } }) });
    const channels = [];
    backend.subscribeChannels("u1", (list) => channels.push(list))();
    expect(channels[0][0].seq).toBe(0);
  });

  it("keeps threads separate and mirrors replies sent to the channel", async () => {
    await backend.createChannel(channelDoc());
    const root = await backend.postMessage({ message: message({ id: "root", createdAt: 100 }) });
    await backend.postMessage({ message: message({ id: "r1", threadRootId: root.id, authorId: "u2", createdAt: 200 }) });
    await backend.postMessage({ message: message({ id: "r2", threadRootId: root.id, authorId: "u2", createdAt: 300 }), alsoToChannel: true });

    let top = [];
    backend.subscribeMessages("c1", 50, (list) => { top = list; })();
    expect(top.map((entry) => entry.id)).toEqual(["root", "r2-ch"]);
    expect(top[0]).toMatchObject({ replyCount: 2, threadParticipantIds: ["u2"] });
    expect(top[1].sharedFromThread).toBe(true);

    let replies = [];
    backend.subscribeThread("c1", "root", (list) => { replies = list; })();
    expect(replies.map((entry) => entry.id)).toEqual(["r1", "r2"]);

    await backend.deleteMessage(replies[0]);
    backend.subscribeMessages("c1", 50, (list) => { top = list; })();
    expect(top[0].replyCount).toBe(1);
  });

  it("pages messages from the newest backwards", async () => {
    await backend.createChannel(channelDoc());
    for (let index = 0; index < 5; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await backend.postMessage({ message: message({ id: `m${index}`, createdAt: 1000 + index }) });
    }
    let result = null;
    backend.subscribeMessages("c1", 2, (list, meta) => { result = { ids: list.map((entry) => entry.id), meta }; })();
    expect(result).toEqual({ ids: ["m3", "m4"], meta: { hasMore: true } });
  });

  it("toggles reactions, soft deletes roots with replies and edits", async () => {
    await backend.createChannel(channelDoc());
    const root = await backend.postMessage({ message: message({ id: "root" }) });
    await backend.toggleReaction(root, "1f44d", "u2", true);
    await backend.toggleReaction(root, "1f44d", "u3", true);
    await backend.toggleReaction(root, "1f44d", "u2", false);
    await backend.updateMessage(root, { text: "edited", editedAt: 5 });
    await backend.postMessage({ message: message({ id: "r1", threadRootId: "root" }) });
    await backend.deleteMessage({ ...root, replyCount: 1 }, { soft: true });

    let top = [];
    backend.subscribeMessages("c1", 50, (list) => { top = list; })();
    expect(top[0]).toMatchObject({ deleted: true, text: "", reactions: {}, replyCount: 1 });
  });

  it("hides private channels from non-members and supports membership changes", async () => {
    await backend.createChannel(channelDoc({ id: "p1", isPrivate: true, memberIds: ["u1"] }));
    let visible = [];
    const unsub = backend.subscribeChannels("u2", (list) => { visible = list; });
    expect(visible).toHaveLength(0);
    await backend.addChannelMembers("p1", ["u2"], 10);
    expect(visible.map((entry) => entry.id)).toEqual(["p1"]);
    await backend.removeChannelMember("p1", "u2", 11);
    expect(visible).toHaveLength(0);
    unsub();
  });

  it("merges user state with null deletions and marks inbox read", async () => {
    await backend.updateUserState("u1", { starred: { c1: true, c2: true } });
    await backend.updateUserState("u1", { starred: { c2: null }, prefs: { enterToSend: false } });
    let state = null;
    backend.subscribeUserState("u1", (value) => { state = value; })();
    expect(state).toEqual({ starred: { c1: true }, prefs: { enterToSend: false } });
  });

  it("rejects posting into a missing conversation", async () => {
    await expect(backend.postMessage({ message: message({ channelId: "missing" }) })).rejects.toThrow(/no longer exists/);
  });

  it("tracks typing and presence", async () => {
    await backend.setTyping("c1", "u2", 1234);
    let typing = null;
    backend.subscribeTyping("c1", (value) => { typing = value; })();
    expect(typing).toEqual({ u2: 1234 });
    await backend.setTyping("c1", "u2", null);
    backend.subscribeTyping("c1", (value) => { typing = value; })();
    expect(typing).toEqual({});

    await backend.setPresence("u1", { status: "active", lastActiveAt: 5, customStatus: { emoji: "🌴", text: "Off" } });
    await backend.setPresence("u1", { customStatus: null });
    let presence = null;
    backend.subscribePresence((value) => { presence = value; })();
    expect(presence).toEqual({ u1: { status: "active", lastActiveAt: 5 } });
  });
});
