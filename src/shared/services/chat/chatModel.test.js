import {
  applyStatePatch,
  buildDmChannelId,
  buildInboxTargets,
  buildMessageRows,
  buildPreview,
  computeUnreadSummary,
  getChannelDisplayName,
  getPresenceState,
  getUnreadCount,
  INBOX_KINDS,
  isChannelMember,
  normalizeChannel,
  slugifyChannelName,
  toPlainText,
  validateChannelName,
} from "./chatModel";

const channel = (overrides = {}) => normalizeChannel({ id: "c1", name: "dev", memberIds: ["u1", "u2"], seq: 5, ...overrides });

describe("chatModel", () => {
  it("builds deterministic DM ids regardless of member order", () => {
    expect(buildDmChannelId(["b", "a", "b"])).toBe("dm_a__b");
    expect(buildDmChannelId(["a", "b"])).toBe(buildDmChannelId(["b", "a"]));
  });

  it("slugifies and validates channel names", () => {
    expect(slugifyChannelName("  #Release Planning!! ")).toBe("release-planning");
    expect(validateChannelName("", [])).toMatch(/blank/);
    expect(validateChannelName("dev", [channel()])).toMatch(/taken/);
    expect(validateChannelName("dev", [channel()], "c1")).toBeNull();
    expect(validateChannelName("design", [channel()])).toBeNull();
  });

  it("treats the default channel as joined by everyone", () => {
    expect(isChannelMember(channel({ isDefault: true, memberIds: [] }), "anyone")).toBe(true);
    expect(isChannelMember(channel(), "u3")).toBe(false);
  });

  it("computes unread counts from sequence numbers", () => {
    expect(getUnreadCount(channel(), { readSeq: { c1: 2 } }, "u1")).toBe(3);
    expect(getUnreadCount(channel(), {}, "u1")).toBe(5);
    expect(getUnreadCount(channel(), { readSeq: { c1: 2 } }, "u3")).toBe(0);
  });

  it("summarises unread state for badges", () => {
    const dm = normalizeChannel({ id: "dm_u1__u2", type: "dm", memberIds: ["u1", "u2"], seq: 2 });
    const muted = channel({ id: "c2", seq: 9 });
    const summary = computeUnreadSummary({
      channels: [channel(), dm, muted],
      userState: { readSeq: { c1: 5, dm_u1__u2: 0, c2: 1 }, muted: { c2: true } },
      inbox: [
        { id: "i1", kind: INBOX_KINDS.MENTION, channelId: "c1", read: false },
        { id: "i2", kind: INBOX_KINDS.THREAD, channelId: "c1", read: false },
        { id: "i3", kind: INBOX_KINDS.MENTION, channelId: "c1", read: true },
      ],
      uid: "u1",
    });
    expect(summary.dmUnread).toBe(2);
    expect(summary.mentionTotal).toBe(1);
    expect(summary.threadUnread).toBe(1);
    expect(summary.channelUnread).toBe(0);
    expect(summary.badge).toBe(4);
    expect(summary.perChannel.c2).toEqual({ unread: 8, mentions: 0, muted: true });
  });

  it("names DMs after the other participants", () => {
    const users = { u1: { name: "Ayşe" }, u2: { name: "Mehmet" } };
    expect(getChannelDisplayName(normalizeChannel({ type: "dm", memberIds: ["u1", "u2"] }), "u1", users)).toBe("Mehmet");
    expect(getChannelDisplayName(normalizeChannel({ type: "dm", memberIds: ["u1"] }), "u1", users)).toBe("Ayşe (you)");
  });

  it("renders tokens as plain text and builds previews", () => {
    const options = { usersById: { u2: { name: "Mehmet" } }, channelsById: { c1: { name: "dev" } } };
    expect(toPlainText("Hi <@u2> see <#c1> <!here>", options)).toBe("Hi @Mehmet see #dev @here");
    expect(buildPreview("**bold** `code`", [], options)).toBe("bold code");
    expect(buildPreview("", [{ name: "spec.pdf" }])).toBe("📎 spec.pdf");
  });

  it("targets mentions, @channel and thread participants without notifying the author", () => {
    const message = { authorId: "u1", text: "<@u2> look", threadRootId: null };
    expect(buildInboxTargets({ message, channel: channel({ memberIds: ["u1", "u2", "u3"] }) }))
      .toEqual([{ uid: "u2", kind: INBOX_KINDS.MENTION }]);

    const all = buildInboxTargets({ message: { authorId: "u1", text: "<!channel> deploy" }, channel: channel({ memberIds: ["u1", "u2", "u3"] }) });
    expect(all.map((target) => target.uid).sort()).toEqual(["u2", "u3"]);

    const general = buildInboxTargets({
      message: { authorId: "u1", text: "<!channel>" },
      channel: channel({ isDefault: true, memberIds: [] }),
      workspaceUserIds: ["u1", "u4"],
    });
    expect(general).toEqual([{ uid: "u4", kind: INBOX_KINDS.MENTION }]);

    const thread = buildInboxTargets({
      message: { authorId: "u3", text: "reply" },
      channel: channel(),
      rootMessage: { authorId: "u1", threadParticipantIds: ["u2", "u3"] },
    });
    expect(thread).toEqual([{ uid: "u1", kind: INBOX_KINDS.THREAD }, { uid: "u2", kind: INBOX_KINDS.THREAD }]);
  });

  it("only notifies online members for @here", () => {
    const now = Date.now();
    const targets = buildInboxTargets({
      message: { authorId: "u1", text: "<!here>" },
      channel: channel({ memberIds: ["u1", "u2", "u3"] }),
      presenceById: { u2: { status: "active", lastActiveAt: now }, u3: { status: "active", lastActiveAt: now - 10 * 60 * 1000 } },
      now,
    });
    expect(targets).toEqual([{ uid: "u2", kind: INBOX_KINDS.MENTION }]);
  });

  it("derives presence states", () => {
    const now = Date.now();
    expect(getPresenceState(null, now)).toBe("offline");
    expect(getPresenceState({ status: "active", lastActiveAt: now }, now)).toBe("active");
    expect(getPresenceState({ status: "active", away: true, lastActiveAt: now }, now)).toBe("away");
    expect(getPresenceState({ status: "active", dnd: true, lastActiveAt: now }, now)).toBe("dnd");
    expect(getPresenceState({ status: "offline", lastActiveAt: now }, now)).toBe("offline");
  });

  it("deep merges patches and deletes null keys", () => {
    expect(applyStatePatch({ readSeq: { a: 1, b: 2 }, starred: { a: true } }, { readSeq: { b: 3 }, starred: { a: null } }))
      .toEqual({ readSeq: { a: 1, b: 3 }, starred: {} });
  });

  it("groups consecutive messages and places date + new dividers", () => {
    const base = new Date(2026, 9, 1, 10, 0).getTime();
    const rows = buildMessageRows([
      { id: "m1", authorId: "u1", createdAt: base },
      { id: "m2", authorId: "u1", createdAt: base + 60 * 1000 },
      { id: "m3", authorId: "u2", createdAt: base + 2 * 60 * 1000 },
      { id: "m4", authorId: "u2", createdAt: base + 24 * 60 * 60 * 1000 },
    ], { lastReadAt: base + 90 * 1000, currentUserId: "u1" });
    expect(rows.map((row) => row.kind)).toEqual(["date", "message", "message", "new", "message", "date", "message"]);
    expect(rows[2].grouped).toBe(true);
    expect(rows[4].grouped).toBe(false);
  });
});
