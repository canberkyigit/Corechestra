import { summarizeConversation, formatSummaryMarkdown, stripMarkdown } from "./chatSummary";
import { classifyUrl, extractUrls } from "./chatLinks";
import { dueEntries, getSchedulePresets, parseDuration, parseReminderInput } from "./chatSchedule";
import {
  addSidebarSection, buildSidebarSections, placeInSection, planSidebarMove, removeSidebarSection,
} from "./chatSections";
import { describeBotEvent, isBotEventEnabled, buildBotSystemPayload } from "./chatBot";
import { buildCsvExport, buildMarkdownExport } from "./chatExport";
import { emojiFromReactionKey, reactionKey } from "./emoji";
import { parseInline, extractReferences } from "./chatMarkdown";
import { getActiveTrigger } from "./chatMentions";
import { cleanSerializedMarkdown } from "../components/composer/RichComposerInput";
import { normalizeChannel } from "../../../shared/services/chat/chatModel";
import { WORKSPACE_EVENT_TYPES } from "../../../shared/services/workspaceEvents";

jest.mock("@tiptap/react", () => ({ EditorContent: () => null, useEditor: () => null }));
jest.mock("@tiptap/starter-kit", () => ({ configure: () => ({}) }));
jest.mock("tiptap-markdown", () => ({ Markdown: { configure: () => ({}) } }));

const users = { u1: { name: "Ayşe" }, u2: { name: "Mehmet" }, u3: { name: "Zeynep" } };
const msg = (id, authorId, text, extra = {}) => ({ id, authorId, text, createdAt: 1000 + Number(id.replace(/\D/g, "")) * 60000, reactions: {}, ...extra });

describe("chatSummary", () => {
  const messages = [
    msg("m1", "u1", "Can someone check the login bug?"),
    msg("m2", "u2", "We decided to ship v2.4 on Friday."),
    msg("m3", "u1", "<@u3> can you update the release notes?", { reactions: { "1f44d": ["u2", "u3"] } }),
    msg("m4", "u2", "I'll fix CY-12345 tomorrow"),
    msg("m5", "u3", "Is the staging env down?"),
    msg("m6", "u1", "- [ ] Write the changelog", { replyCount: 3, createdAt: 1000 + 60 * 60000 }),
  ];

  it("extracts participants, decisions, action items, questions and tasks", () => {
    const summary = summarizeConversation(messages, { usersById: users });
    expect(summary.messageCount).toBe(6);
    expect(summary.participants.map((person) => person.id)).toEqual(["u1", "u2", "u3"]);
    expect(summary.decisions.map((entry) => entry.text)).toEqual(["We decided to ship v2.4 on Friday."]);
    const actions = summary.actionItems.map((item) => [item.text, item.assigneeId, item.due]);
    expect(actions).toEqual(expect.arrayContaining([
      ["@Zeynep can you update the release notes?", "u3", null],
      ["I'll fix CY-12345 tomorrow", "u2", "tomorrow"],
      ["Write the changelog", null, null],
    ]));
    // m1 was answered by u2 a minute later; m5 has no answer.
    expect(summary.questions.map((entry) => entry.message.id)).toEqual(["m5"]);
    expect(summary.tasks).toEqual([{ key: "CY-12345", count: 1 }]);
    expect(summary.highlights.map((entry) => entry.message.id)).toEqual(expect.arrayContaining(["m3", "m6"]));
  });

  it("respects the time range and renders markdown", () => {
    const summary = summarizeConversation(messages, { usersById: users, since: messages[4].createdAt });
    expect(summary.messageCount).toBe(2);
    const markdown = formatSummaryMarkdown(summarizeConversation(messages, { usersById: users }), { title: "Catch-up", usersById: users });
    expect(markdown).toContain("**Decisions**");
    expect(markdown).toContain("- [ ] @Zeynep can you update the release notes? (<@u3>)");
  });

  it("strips markdown markers from summary text", () => {
    expect(stripMarkdown("We ship **v2.4** on _Friday_ with `flag` and [docs](https://x.io)")).toBe("We ship v2.4 on Friday with flag and docs");
    const summary = summarizeConversation([msg("m1", "u1", "We decided to ship **v2.4**")], { usersById: users });
    expect(summary.decisions[0].text).toBe("We decided to ship v2.4");
  });

  it("includes thread replies", () => {
    const summary = summarizeConversation([{ ...msg("m1", "u1", "Root"), replies: [msg("m2", "u2", "Let's go with option B")] }], { usersById: users });
    expect(summary.messageCount).toBe(2);
    expect(summary.decisions).toHaveLength(1);
  });
});

describe("chatLinks", () => {
  const origin = "https://app.corechestra.io";
  it("extracts urls outside code", () => {
    expect(extractUrls("see https://a.io/x and `https://b.io` and https://c.io.")).toEqual(["https://a.io/x", "https://c.io"]);
  });

  it("classifies providers and internal links", () => {
    expect(classifyUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", { origin })).toMatchObject({ kind: "video", provider: "YouTube" });
    expect(classifyUrl("https://youtu.be/dQw4w9WgXcQ", { origin }).embed).toContain("dQw4w9WgXcQ");
    expect(classifyUrl("https://github.com/acme/app/pull/42", { origin })).toMatchObject({ provider: "GitHub", title: "acme/app #42", subtitle: "Pull request" });
    expect(classifyUrl("https://www.figma.com/design/abc123/Mobile-App", { origin })).toMatchObject({ provider: "Figma", title: "Mobile App" });
    expect(classifyUrl("https://cdn.site.com/img/cat.png", { origin })).toMatchObject({ kind: "image" });
    expect(classifyUrl(`${origin}/docs?page=page-1`, { origin })).toMatchObject({ kind: "internal", entity: "doc", id: "page-1" });
    expect(classifyUrl(`${origin}/releases?release=rel-9`, { origin })).toMatchObject({ entity: "release", id: "rel-9" });
    expect(classifyUrl("https://example.com/blog/hello-world", { origin })).toMatchObject({ generic: true, title: "hello world" });
    // eslint-disable-next-line no-script-url
    expect(classifyUrl("javascript:alert(1)", { origin })).toBeNull();
  });
});

describe("chatSchedule", () => {
  const now = new Date(2026, 9, 2, 14, 0).getTime();
  it("parses durations in English and Turkish", () => {
    expect(parseDuration("30m")).toBe(30 * 60000);
    expect(parseDuration("2 hours")).toBe(2 * 3600000);
    expect(parseDuration("45 dk")).toBe(45 * 60000);
    expect(parseDuration("1 gün")).toBe(86400000);
    expect(parseDuration("soon")).toBeNull();
  });

  it("parses /remind arguments", () => {
    expect(parseReminderInput("in 30m review the PR", now)).toEqual({ at: now + 30 * 60000, text: "review the PR" });
    expect(parseReminderInput("me 2 hours to call Ayşe", now)).toEqual({ at: now + 2 * 3600000, text: "call Ayşe" });
    const tomorrow = parseReminderInput("tomorrow at 10:30 ship it", now);
    expect(new Date(tomorrow.at).getDate()).toBe(3);
    expect(new Date(tomorrow.at).getHours()).toBe(10);
    expect(tomorrow.text).toBe("ship it");
    const earlier = parseReminderInput("at 09:00 standup", now);
    expect(new Date(earlier.at).getDate()).toBe(3);
    expect(parseReminderInput("whenever", now)).toBeNull();
  });

  it("returns presets in the future and due entries in order", () => {
    getSchedulePresets(now).forEach((preset) => expect(preset.at).toBeGreaterThan(now));
    expect(dueEntries({ a: { id: "a", at: now - 10 }, b: { id: "b", at: now + 10 }, c: { id: "c", at: now - 20 }, d: { id: "d", at: now - 1, done: true } }, now).map((entry) => entry.id)).toEqual(["c", "a"]);
  });
});

describe("chatSections", () => {
  const channels = [
    normalizeChannel({ id: "general", name: "general", isDefault: true }),
    normalizeChannel({ id: "dev", name: "dev", memberIds: ["u1"] }),
    normalizeChannel({ id: "ops", name: "ops", memberIds: ["u1"] }),
    normalizeChannel({ id: "proj_p1", name: "core", projectId: "p1", memberIds: ["u1"] }),
    normalizeChannel({ id: "dm_u1__u2", type: "dm", memberIds: ["u1", "u2"], lastMessageAt: 5 }),
  ];
  const getName = (channel) => channel.name || channel.id;
  const build = (userState) => buildSidebarSections({ channels, uid: "u1", userState, getName });

  it("groups conversations into built-in sections", () => {
    const sections = build({ starred: { ops: true } });
    const byId = Object.fromEntries(sections.map((section) => [section.id, section.items.map((item) => item.id)]));
    expect(byId).toEqual({ starred: ["ops"], projects: ["proj_p1"], channels: ["general", "dev"], dms: ["dm_u1__u2"] });
  });

  it("moves conversations into custom sections and keeps manual order", () => {
    const { section, sidebar } = addSidebarSection({}, "Team");
    let state = { sidebar };
    let sections = build(state);
    const plan = planSidebarMove({ sections, channelId: "dev", fromSectionId: "channels", toSectionId: section.id, toIndex: 0, userState: state });
    state = { sidebar: plan.sidebar };
    sections = build(state);
    expect(sections.find((entry) => entry.id === section.id).items.map((item) => item.id)).toEqual(["dev"]);
    expect(sections.find((entry) => entry.id === "channels").items.map((item) => item.id)).toEqual(["general", "ops"]);

    state = { sidebar: placeInSection(state, "ops", section.id) };
    const reorder = planSidebarMove({ sections: build(state), channelId: "ops", fromSectionId: section.id, toSectionId: section.id, toIndex: 0, userState: state });
    expect(reorder.sidebar.order[section.id]).toEqual(["ops", "dev"]);

    const removed = removeSidebarSection({ sidebar: reorder.sidebar }, section.id);
    expect(removed.sections).toEqual([]);
    expect(removed.placement).toEqual({});
  });

  it("only allows natural or starred built-in targets", () => {
    const sections = build({});
    expect(planSidebarMove({ sections, channelId: "dev", fromSectionId: "channels", toSectionId: "dms", toIndex: 0, userState: {} })).toBeNull();
    expect(planSidebarMove({ sections, channelId: "dev", fromSectionId: "channels", toSectionId: "starred", toIndex: 0, userState: {} }).starred).toBe(true);
  });
});

describe("chatBot", () => {
  const event = {
    type: WORKSPACE_EVENT_TYPES.TASK_STATUS, projectId: "p1", actor: "ayse", task: { id: "CY-123", title: "Fix login" }, from: "inprogress", fromLabel: "In Progress", to: "done", toLabel: "Done",
  };
  it("respects channel settings and quiet events", () => {
    expect(isBotEventEnabled({ botEvents: {} }, event)).toBe(true);
    expect(isBotEventEnabled({ botEvents: { tasks: false } }, event)).toBe(false);
    expect(isBotEventEnabled({ botEvents: {} }, { ...event, type: WORKSPACE_EVENT_TYPES.TASK_ASSIGNED })).toBe(false);
    expect(isBotEventEnabled({ botEvents: { verbose: true } }, { ...event, type: WORKSPACE_EVENT_TYPES.TASK_ASSIGNED })).toBe(true);
  });

  it("builds compact payloads and readable cards", () => {
    const payload = buildBotSystemPayload({ ...event, extraneous: "ignored", blockReason: "" });
    expect(payload).toMatchObject({ type: "event", event: { type: "task_status", task: { id: "CY-123" }, to: "done" } });
    expect(payload.event.extraneous).toBeUndefined();
    expect(payload.event.blockReason).toBeUndefined();
    const view = describeBotEvent(payload.event, { nameOf: () => "Ayşe" });
    expect(view).toMatchObject({ tone: "green", title: "Ayşe moved CY-123 to Done", detail: "Fix login", taskId: "CY-123" });
    const run = describeBotEvent({ type: WORKSPACE_EVENT_TYPES.TEST_RUN_COMPLETED, actor: "a", run: { name: "Regression" }, results: { passed: 8, failed: 2, total: 10 } });
    expect(run).toMatchObject({ tone: "red", title: "Regression finished with 2 failures", progress: 80 });
  });
});

describe("exports, emoji, references", () => {
  it("exports markdown and csv", () => {
    const channel = normalizeChannel({ id: "dev", name: "dev" });
    const messages = [{ ...msg("m1", "u1", "Hello, \"team\""), replies: [msg("m2", "u2", "hi")] }];
    const ctx = { usersById: users, channelsById: {}, getName: (entry) => entry.name };
    expect(buildMarkdownExport(channel, messages, ctx)).toContain("# #dev");
    const csv = buildCsvExport(channel, messages, ctx).split("\n");
    expect(csv[0]).toBe("timestamp,author,thread,text,attachments,reactions");
    expect(csv[1]).toContain('"Hello, ""team"""');
    expect(csv[2]).toContain(",m1,");
  });

  it("keys custom emoji reactions", () => {
    expect(reactionKey(":party-parrot:")).toBe("c_party-parrot");
    expect(emojiFromReactionKey("c_party-parrot")).toBe(":party-parrot:");
    expect(reactionKey(":tada:")).not.toBe("c_tada");
  });

  it("parses doc/release tokens, custom shortcodes and [[ triggers", () => {
    const nodes = parseInline("See <doc:page-1> and <release:rel-2> :party-parrot:");
    expect(nodes.filter((node) => node.type !== "text").map((node) => node.type)).toEqual(["doc", "release", "shortcode"]);
    expect(extractReferences("CY-1234 <doc:a> <doc:a> <release:b>")).toEqual({ tasks: ["CY-1234"], docs: ["a"], releases: ["b"] });
    expect(getActiveTrigger("look at [[login", 15)).toMatchObject({ type: "reference", query: "login", start: 8 });
  });

  it("cleans TipTap markdown escapes", () => {
    expect(cleanSerializedMarkdown("snake\\_case \\*not bold\\* line\n\n\n\nnext  ")).toBe("snake_case *not bold* line\n\nnext");
  });
});
