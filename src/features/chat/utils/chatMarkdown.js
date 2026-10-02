/*
 * Small, safe message formatter (no HTML injection: the output is a node
 * tree rendered by React). Supported syntax, deliberately close to Slack:
 *
 *   ```code block```   `inline code`   **bold**   *italic* / _italic_
 *   ~~strike~~   > quote   - bullet / 1. ordered   [label](https://url)
 *   bare https:// links, <@uid> mentions, <!channel>/<!here>, <#channel>,
 *   CY-123 task keys and :shortcode: emoji.
 */
import { replaceShortcodes } from "./emoji";

const INLINE_PATTERN = new RegExp([
  "`([^`\\n]+)`",                                        // 1 inline code
  "<@([\\w.-]+)>",                                        // 2 user mention
  "<!(channel|here|everyone)>",                           // 3 special mention
  "<#([\\w.-]+)>",                                        // 4 channel reference
  "\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)",      // 5,6 markdown link
  "(https?:\\/\\/[^\\s<]+[^\\s<.,;:!?)\\]'\"])",          // 7 bare url
  "\\*\\*([^*\\n]+?)\\*\\*",                               // 8 bold
  "~~([^~\\n]+?)~~",                                       // 9 strike
  "(?<![\\w*])\\*(?!\\s)([^*\\n]+?)\\*(?![\\w*])",         // 10 italic (*)
  "(?<![\\w\\\\])_(?!\\s)([^_\\n]+?)_(?![\\w])",           // 11 italic (_)
  "\\b(CY-\\d{3,})\\b",                                    // 12 task key
  "<(doc|release):([\\w.-]+)>",                             // 13,14 doc / release reference
].join("|"), "g");

const LEFTOVER_SHORTCODE = /:([a-z0-9_+-]{2,32}):/g;

/** Text with known shortcodes converted; unknown `:name:` kept as shortcode nodes (custom emoji). */
function textNodes(value) {
  const replaced = replaceShortcodes(value);
  const nodes = [];
  let cursor = 0;
  let match = LEFTOVER_SHORTCODE.exec(replaced);
  while (match) {
    if (match.index > cursor) nodes.push({ type: "text", value: replaced.slice(cursor, match.index) });
    nodes.push({ type: "shortcode", name: match[1], raw: match[0] });
    cursor = match.index + match[0].length;
    match = LEFTOVER_SHORTCODE.exec(replaced);
  }
  LEFTOVER_SHORTCODE.lastIndex = 0;
  if (cursor < replaced.length) nodes.push({ type: "text", value: replaced.slice(cursor) });
  return nodes;
}

export function parseInline(text) {
  const source = String(text || "");
  const nodes = [];
  let cursor = 0;
  // Fresh regex per call: nested formatting recurses, and a shared global
  // regex would have its lastIndex reset under the outer loop.
  const pattern = new RegExp(INLINE_PATTERN.source, "g");
  let match = pattern.exec(source);
  while (match) {
    if (match.index > cursor) nodes.push(...textNodes(source.slice(cursor, match.index)));
    const [whole, code, mention, special, channel, linkLabel, linkHref, url, bold, strike, italicStar, italicUnderscore, task, refKind, refId] = match;
    if (code !== undefined) nodes.push({ type: "code", value: code });
    else if (mention !== undefined) nodes.push({ type: "mention", id: mention });
    else if (special !== undefined) nodes.push({ type: "special", name: special });
    else if (channel !== undefined) nodes.push({ type: "channel", id: channel });
    else if (linkLabel !== undefined) nodes.push({ type: "link", href: linkHref, children: parseInline(linkLabel) });
    else if (url !== undefined) nodes.push({ type: "link", href: url, children: [{ type: "text", value: url }] });
    else if (bold !== undefined) nodes.push({ type: "bold", children: parseInline(bold) });
    else if (strike !== undefined) nodes.push({ type: "strike", children: parseInline(strike) });
    else if (italicStar !== undefined) nodes.push({ type: "italic", children: parseInline(italicStar) });
    else if (italicUnderscore !== undefined) nodes.push({ type: "italic", children: parseInline(italicUnderscore) });
    else if (task !== undefined) nodes.push({ type: "task", key: task });
    else if (refKind !== undefined) nodes.push({ type: refKind, id: refId });
    else nodes.push({ type: "text", value: whole });
    cursor = match.index + whole.length;
    match = pattern.exec(source);
  }
  if (cursor < source.length) nodes.push(...textNodes(source.slice(cursor)));
  return nodes;
}

const QUOTE_LINE = /^>\s?(.*)$/;
const BULLET_LINE = /^\s*[-*•]\s+(.*)$/;
const ORDERED_LINE = /^\s*(\d+)[.)]\s+(.*)$/;

function lineKind(line) {
  if (QUOTE_LINE.test(line)) return "quote";
  if (BULLET_LINE.test(line)) return "bullet";
  if (ORDERED_LINE.test(line)) return "ordered";
  return "text";
}

function parseLines(text, blocks) {
  const lines = String(text).split("\n");
  let current = null;
  const flush = () => { if (current) blocks.push(current); current = null; };

  lines.forEach((line) => {
    const kind = lineKind(line);
    if (kind === "quote") {
      if (current?.type !== "quote") { flush(); current = { type: "quote", lines: [] }; }
      current.lines.push(parseInline(line.match(QUOTE_LINE)[1]));
    } else if (kind === "bullet") {
      if (current?.type !== "list" || current.ordered) { flush(); current = { type: "list", ordered: false, items: [] }; }
      current.items.push(parseInline(line.match(BULLET_LINE)[1]));
    } else if (kind === "ordered") {
      const [, number, rest] = line.match(ORDERED_LINE);
      if (current?.type !== "list" || !current.ordered) { flush(); current = { type: "list", ordered: true, start: Number(number) || 1, items: [] }; }
      current.items.push(parseInline(rest));
    } else {
      if (current?.type !== "paragraph") { flush(); current = { type: "paragraph", lines: [] }; }
      current.lines.push(parseInline(line));
    }
  });
  flush();
}

export function parseMessage(text) {
  const source = String(text || "").replace(/\r\n?/g, "\n");
  const blocks = [];
  const fence = /```([a-z0-9+#-]*)\n?([\s\S]*?)```/gi;
  let cursor = 0;
  let match = fence.exec(source);
  while (match) {
    const before = source.slice(cursor, match.index).replace(/\n$/, "");
    if (before.trim()) parseLines(before, blocks);
    blocks.push({ type: "codeblock", lang: match[1] || "", value: match[2].replace(/\n$/, "") });
    cursor = match.index + match[0].length;
    if (source[cursor] === "\n") cursor += 1;
    match = fence.exec(source);
  }
  const rest = source.slice(cursor);
  if (rest.trim() || blocks.length === 0) parseLines(rest, blocks);
  // Trim leading/trailing empty paragraph lines.
  return blocks.filter((block) => block.type !== "paragraph" || block.lines.some((line) => line.length > 0) || blocks.length === 1);
}

/** Task keys referenced in a message (for chips / quick links). */
export function extractReferences(text) {
  const value = String(text || "");
  return {
    tasks: extractTaskKeys(value),
    docs: [...new Set([...value.matchAll(/<doc:([\w.-]+)>/g)].map((match) => match[1]))],
    releases: [...new Set([...value.matchAll(/<release:([\w.-]+)>/g)].map((match) => match[1]))],
  };
}

export function extractTaskKeys(text) {
  return [...new Set([...String(text || "").matchAll(/\b(CY-\d{3,})\b/g)].map((match) => match[1]))];
}

/**
 * Wraps the current selection of a textarea with a formatting marker and
 * returns `{ text, selectionStart, selectionEnd }`.
 */
export function wrapSelection(value, start, end, before, after = before, placeholder = "") {
  const text = String(value || "");
  const selected = text.slice(start, end) || placeholder;
  const next = `${text.slice(0, start)}${before}${selected}${after}${text.slice(end)}`;
  return {
    text: next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  };
}

/** Prefixes each selected line (quotes, lists). */
export function prefixLines(value, start, end, prefix) {
  const text = String(value || "");
  const lineStart = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEndIndex = text.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  const block = text.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const formatted = lines.map((line, index) => (typeof prefix === "function" ? prefix(index) : prefix) + line).join("\n");
  const next = `${text.slice(0, lineStart)}${formatted}${text.slice(lineEnd)}`;
  return { text: next, selectionStart: lineStart, selectionEnd: lineStart + formatted.length };
}
