import { createLocalChatBackend } from "./chatLocalBackend";
import {
  activeHuddleParticipants, getNotifyLevel, hasReadMessage, isHuddleLive, matchKeywords, normalizeChannel, normalizeKeywords,
  NOTIFY_LEVELS, planPollVote, projectChannelId, tallyPoll,
} from "./chatModel";
import { diffTestingEvents } from "../../context/hooks/actions/useWorkspaceEventBridge";
import { buildProjectChannel, projectMemberIds } from "../../context/chat/useProjectChannels";
import { effectiveRetentionDays, runRetentionCleanup } from "../../context/chat/useChatWorkspace";
import { emitWorkspaceEvent, subscribeWorkspaceEvents, WORKSPACE_EVENT_TYPES } from "../workspaceEvents";

const poll = (votes = {}, extra = {}) => ({
  poll: { question: "Lunch?", options: [{ id: "a", text: "Pizza" }, { id: "b", text: "Sushi" }], multi: false, ...extra },
  pollVotes: votes,
});

describe("chat model extensions", () => {
  it("tallies polls and plans single/multi choice votes", () => {
    const message = poll({ a: ["u1", "u2"], b: ["u3"] });
    expect(tallyPoll(message, "u1")).toMatchObject({ total: 3, voters: 3, counts: { a: 2, b: 1 } });
    expect([...tallyPoll(message, "u1").mine]).toEqual(["a"]);
    expect(planPollVote(message, "b", "u1")).toEqual({ add: ["b"], remove: ["a"] });
    expect(planPollVote(message, "a", "u1")).toEqual({ add: [], remove: ["a"] });
    expect(planPollVote(poll({ a: ["u1"] }, { multi: true }), "b", "u1")).toEqual({ add: ["b"], remove: [] });
    expect(planPollVote(poll({}, { closed: true }), "a", "u1")).toEqual({ add: [], remove: [] });
  });

  it("resolves notification levels and keywords", () => {
    const dm = normalizeChannel({ id: "dm_a__b", type: "dm" });
    const channel = normalizeChannel({ id: "c1", name: "dev" });
    expect(getNotifyLevel(dm, {})).toBe(NOTIFY_LEVELS.ALL);
    expect(getNotifyLevel(channel, {})).toBe(NOTIFY_LEVELS.MENTIONS);
    expect(getNotifyLevel(channel, { notify: { c1: "nothing" } })).toBe(NOTIFY_LEVELS.NOTHING);
    const keywords = normalizeKeywords("Deploy, outage ,x, deploy");
    expect(keywords).toEqual(["deploy", "outage"]);
    expect(matchKeywords("We will DEPLOY at 5", keywords)).toBe("deploy");
    expect(matchKeywords("redeployment planned", keywords)).toBeNull();
    expect(matchKeywords("Yayın: outage çözüldü", keywords)).toBe("outage");
  });

  it("tracks live huddle participants by heartbeat", () => {
    const now = 100000;
    const huddle = { active: true, participants: { a: { joinedAt: 2, lastSeen: now - 1000 }, b: { joinedAt: 1, lastSeen: now - 60000 } } };
    expect(activeHuddleParticipants(huddle, now).map((entry) => entry.id)).toEqual(["a"]);
    expect(isHuddleLive(huddle, now)).toBe(true);
    expect(isHuddleLive({ ...huddle, participants: { b: huddle.participants.b } }, now)).toBe(false);
  });

  it("checks read receipts", () => {
    expect(hasReadMessage({ readSeq: { c1: 5 } }, { channelId: "c1", seq: 5 })).toBe(true);
    expect(hasReadMessage({ readSeq: { c1: 4 } }, { channelId: "c1", seq: 5 })).toBe(false);
  });
});

describe("project channels", () => {
  const users = [{ id: "u1", username: "ayse" }, { id: "u2", username: "mehmet" }];
  it("maps project members and builds a unique channel", () => {
    expect(projectMemberIds({ memberUsernames: ["Mehmet"] }, users)).toEqual(["u2"]);
    expect(projectMemberIds({}, users)).toBeNull();
    const channel = buildProjectChannel({ id: "p1", name: "Core Platform" }, { uid: "u1", users, channels: [normalizeChannel({ id: "x", name: "core-platform" })] });
    expect(channel).toMatchObject({ id: projectChannelId("p1"), kind: "project", projectId: "p1", name: "core-platform-project", memberIds: ["u1"] });
  });
});

describe("workspace event bridge", () => {
  it("diffs release creation, release status and finished test runs", () => {
    const prev = {
      releases: [{ id: "r1", version: "2.4", status: "planned" }],
      testRuns: [{ id: "t1", name: "Smoke", status: "in-progress", results: [] }],
    };
    const next = {
      releases: [{ id: "r1", version: "2.4", status: "released" }, { id: "r2", version: "2.5", status: "planned", projectId: "p2" }],
      testRuns: [{ id: "t1", name: "Smoke", status: "completed", results: [{ status: "passed" }, { status: "failed" }] }],
    };
    const events = diffTestingEvents(prev, next, { actor: "ayse", fallbackProjectId: "p1" });
    expect(events.map((event) => [event.type, event.projectId])).toEqual([
      [WORKSPACE_EVENT_TYPES.RELEASE_STATUS, "p1"],
      [WORKSPACE_EVENT_TYPES.RELEASE_CREATED, "p2"],
      [WORKSPACE_EVENT_TYPES.TEST_RUN_COMPLETED, "p1"],
    ]);
    expect(events[0]).toMatchObject({ from: "planned", to: "released" });
    expect(events[2].results).toMatchObject({ passed: 1, failed: 1, total: 2 });
    expect(diffTestingEvents(next, next, {})).toEqual([]);
  });

  it("delivers events through the bus", () => {
    const received = [];
    const unsub = subscribeWorkspaceEvents((event) => received.push(event));
    emitWorkspaceEvent({ type: "task_created", projectId: "p1" });
    unsub();
    emitWorkspaceEvent({ type: "task_created", projectId: "p1" });
    expect(received).toHaveLength(1);
    expect(received[0].at).toEqual(expect.any(Number));
  });
});

describe("local backend extensions", () => {
  let backend;
  beforeEach(() => {
    window.localStorage.clear();
    backend = createLocalChatBackend({ storageKey: `ext-${Math.random()}` });
  });

  it("creates task thread roots once", async () => {
    await backend.createChannel({ id: "c1", type: "channel", name: "dev", memberIds: ["u1"], seq: 0 });
    const first = await backend.ensureMessage({ id: "task-CY-1", channelId: "c1", authorId: "u1", text: "", createdAt: 1, system: { type: "task_thread" } });
    const second = await backend.ensureMessage({ id: "task-CY-1", channelId: "c1", authorId: "u2", text: "changed", createdAt: 2 });
    expect(second.authorId).toBe(first.authorId);
    let channels = [];
    backend.subscribeChannels("u1", (list) => { channels = list; })();
    expect(channels[0].seq).toBe(0);
  });

  it("updates poll votes atomically per option", async () => {
    await backend.createChannel({ id: "c1", type: "channel", name: "dev", memberIds: ["u1"], seq: 0 });
    const message = await backend.postMessage({ message: { id: "p1", channelId: "c1", authorId: "u1", text: "Lunch?", createdAt: 1, ...poll() } });
    await backend.updatePollVotes(message, { add: ["a"], remove: [] }, "u1");
    await backend.updatePollVotes(message, { add: ["b"], remove: ["a"] }, "u1");
    await backend.updatePollVotes(message, { add: ["b"], remove: [] }, "u2");
    let stored = null;
    backend.subscribeMessage("c1", "p1", (value) => { stored = value; })();
    expect(stored.pollVotes).toEqual({ a: [], b: ["u1", "u2"] });
  });

  it("runs the huddle lifecycle and routes signals", async () => {
    const now = Date.now();
    const joined = await backend.joinHuddle("c1", "u1", { joinedAt: now, lastSeen: now }, { roomId: "r", now });
    expect(joined.started).toBe(true);
    const second = await backend.joinHuddle("c1", "u2", { joinedAt: now + 1, lastSeen: now + 1 }, { roomId: "r2", now: now + 1 });
    expect(second.started).toBe(false);
    let live = {};
    const unsub = backend.subscribeHuddles((value) => { live = value; });
    expect(Object.keys(live.c1.participants).sort()).toEqual(["u1", "u2"]);

    await backend.sendSignal("c1", { to: "u2", from: "u1", kind: "description", payload: { type: "offer" } });
    let inbox = [];
    backend.subscribeSignals("c1", "u2", (signals) => { inbox = signals; })();
    expect(inbox).toHaveLength(1);
    await backend.deleteSignals("c1", [inbox[0].id]);
    backend.subscribeSignals("c1", "u2", (signals) => { inbox = signals; })();
    expect(inbox).toHaveLength(0);

    expect((await backend.leaveHuddle("c1", "u1", now + 2)).ended).toBe(false);
    expect((await backend.leaveHuddle("c1", "u2", now + 3)).ended).toBe(true);
    expect(live.c1).toBeUndefined();
    unsub();
  });

  it("stores workspace settings with deletions", async () => {
    await backend.updateWorkspace({ customEmoji: { parrot: { dataUrl: "data:x" }, cat: { dataUrl: "data:y" } } });
    await backend.updateWorkspace({ customEmoji: { cat: null }, retention: { days: 30 } });
    let workspace = null;
    backend.subscribeWorkspace((value) => { workspace = value; })();
    expect(Object.keys(workspace.customEmoji)).toEqual(["parrot"]);
    expect(workspace.retention.days).toBe(30);
  });

  it("applies retention and exports full history", async () => {
    const day = 86400000;
    const now = Date.now();
    await backend.createChannel({ id: "c1", type: "channel", name: "dev", memberIds: ["u1"], seq: 0, retentionDays: 0 });
    await backend.postMessage({ message: { id: "old", channelId: "c1", authorId: "u1", text: "old", createdAt: now - 40 * day } });
    await backend.postMessage({ message: { id: "new", channelId: "c1", authorId: "u1", text: "new", createdAt: now } });
    await backend.postMessage({ message: { id: "r1", channelId: "c1", authorId: "u2", text: "reply", createdAt: now + 1, threadRootId: "new" } });

    const exported = await backend.fetchAllMessages("c1");
    expect(exported.map((entry) => entry.id)).toEqual(["old", "new"]);
    expect(exported[1].replies.map((entry) => entry.id)).toEqual(["r1"]);

    const channel = normalizeChannel({ id: "c1", name: "dev" });
    expect(effectiveRetentionDays(channel, { retention: { days: 30 } })).toBe(30);
    expect(effectiveRetentionDays({ ...channel, retentionDays: 7 }, { retention: { days: 30 } })).toBe(7);
    const results = await runRetentionCleanup({ backend, channels: [channel], workspace: { retention: { days: 30 } }, now });
    expect(results).toEqual([{ channelId: "c1", name: "dev", removed: 1 }]);
    expect((await backend.fetchAllMessages("c1")).map((entry) => entry.id)).toEqual(["new"]);
  });
});
