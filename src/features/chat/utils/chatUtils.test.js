import { extractTaskKeys, parseInline, parseMessage, prefixLines, wrapSelection } from "./chatMarkdown";
import { applyCompletion, decodeForEditing, encodeMessageText, filterMentionCandidates, getActiveTrigger } from "./chatMentions";
import { emojiFromReactionKey, isJumboEmoji, reactionKey, replaceShortcodes, searchEmojis } from "./emoji";
import { parseSlashCommand, parseStatusArgs } from "./slashCommands";

const users = [
  { id: "u1", name: "Ayşe Yılmaz", username: "ayse", email: "ayse@corp.io" },
  { id: "u2", name: "Mehmet", username: "mehmet", email: "mehmet@corp.io" },
];
const channels = [{ id: "c1", type: "channel", name: "dev" }];

describe("chatMarkdown", () => {
  it("parses inline formatting, mentions, links and task keys", () => {
    const nodes = parseInline("**bold** _it_ ~~gone~~ `x` <@u1> <!here> <#c1> https://a.io CY-12345 [docs](https://d.io)");
    const types = nodes.filter((node) => node.type !== "text").map((node) => node.type);
    expect(types).toEqual(["bold", "italic", "strike", "code", "mention", "special", "channel", "link", "task", "link"]);
  });

  it("does not italicise snake_case or the shrug", () => {
    expect(parseInline("some_var_name").every((node) => node.type === "text")).toBe(true);
    expect(parseInline("¯\\_(ツ)_/¯").some((node) => node.type === "italic")).toBe(false);
  });

  it("parses code blocks, quotes and lists into blocks", () => {
    const blocks = parseMessage("intro\n```js\nconst a = 1;\n```\n> quoted\n- one\n- two\n1. first");
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "codeblock", "quote", "list", "list"]);
    expect(blocks[1]).toMatchObject({ lang: "js", value: "const a = 1;" });
    expect(blocks[3].items).toHaveLength(2);
    expect(blocks[4].ordered).toBe(true);
  });

  it("keeps formatting characters inside code untouched", () => {
    const [code] = parseInline("`**not bold**`");
    expect(code).toEqual({ type: "code", value: "**not bold**" });
  });

  it("wraps selections and prefixes lines", () => {
    expect(wrapSelection("hello world", 6, 11, "**")).toEqual({ text: "hello **world**", selectionStart: 8, selectionEnd: 13 });
    expect(prefixLines("a\nb", 0, 3, "- ").text).toBe("- a\n- b");
    expect(extractTaskKeys("see CY-123 and CY-123, CY-9")).toEqual(["CY-123"]);
  });
});

describe("chatMentions", () => {
  it("encodes full-name, handle, special and channel mentions", () => {
    const encoded = encodeMessageText("@Ayşe Yılmaz and @mehmet, ping @here in #dev :tada:", { users, channels });
    expect(encoded).toBe("<@u1> and <@u2>, ping <!here> in <#c1> 🎉");
  });

  it("leaves code and unknown handles alone", () => {
    expect(encodeMessageText("`@mehmet` @nobody #nowhere", { users, channels })).toBe("`@mehmet` @nobody #nowhere");
  });

  it("decodes tokens back for editing", () => {
    expect(decodeForEditing("<@u1> <!channel> <#c1>", {
      usersById: { u1: users[0] },
      channelsById: { c1: channels[0] },
    })).toBe("@Ayşe Yılmaz @channel #dev");
  });

  it("detects autocomplete triggers at the caret", () => {
    expect(getActiveTrigger("hi @ay", 6)).toMatchObject({ type: "mention", query: "ay", start: 3 });
    expect(getActiveTrigger("go #de", 6)).toMatchObject({ type: "channel", query: "de" });
    expect(getActiveTrigger("nice :ta", 8)).toMatchObject({ type: "emoji", query: "ta" });
    expect(getActiveTrigger("/to", 3)).toMatchObject({ type: "command", query: "to" });
    expect(getActiveTrigger("email a@b", 9)).toBeNull();
    const trigger = getActiveTrigger("hi @ay there", 6);
    expect(applyCompletion("hi @ay there", trigger, "@Ayşe Yılmaz ")).toEqual({ text: "hi @Ayşe Yılmaz  there", caret: 16 });
  });

  it("filters mention candidates by name parts and handles", () => {
    expect(filterMentionCandidates(users, "yıl", { includeSpecial: false }).map((item) => item.id)).toEqual(["u1"]);
    expect(filterMentionCandidates(users, "her").map((item) => item.id)).toEqual(["here"]);
  });
});

describe("emoji + slash commands", () => {
  it("round-trips reaction keys", () => {
    ["👍", "❤️", "🎉", "✅", "🧑‍💻"].forEach((emoji) => {
      const key = reactionKey(emoji);
      expect(key).toMatch(/^[0-9a-f-]+$/);
      expect(reactionKey(emojiFromReactionKey(key))).toBe(key);
    });
  });

  it("replaces shortcodes and searches", () => {
    expect(replaceShortcodes(":+1: :rocket: :unknown:")).toBe("👍 🚀 :unknown:");
    expect(searchEmojis("rock")[0].emoji).toBe("🚀");
  });

  it("detects jumbo emoji messages", () => {
    expect(isJumboEmoji("🎉")).toBe(true);
    expect(isJumboEmoji("🎉🎉🎉")).toBe(true);
    expect(isJumboEmoji("🎉 party")).toBe(false);
    expect(isJumboEmoji("123")).toBe(false);
  });

  it("parses slash commands and status arguments", () => {
    expect(parseSlashCommand("/topic Release prep")).toEqual({ id: "topic", args: "Release prep" });
    expect(parseSlashCommand("/unknown x")).toBeNull();
    expect(parseSlashCommand("not a command")).toBeNull();
    expect(parseStatusArgs("🌴 On vacation")).toEqual({ emoji: "🌴", text: "On vacation" });
    expect(parseStatusArgs("")).toBeNull();
  });
});
