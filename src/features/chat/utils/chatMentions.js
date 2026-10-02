import { CHANNEL_TYPES, getUserDisplayName } from "../../../shared/services/chat/chatModel";
import { replaceShortcodes } from "./emoji";

const CODE_SEGMENTS = /(```[\s\S]*?```|`[^`\n]+`)/g;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Applies `transform` to the text outside code spans/blocks only. */
function mapOutsideCode(text, transform) {
  return String(text || "")
    .split(CODE_SEGMENTS)
    .map((segment, index) => (index % 2 === 1 ? segment : transform(segment)))
    .join("");
}

function userHandles(user) {
  const handles = new Set();
  if (user?.username) handles.add(String(user.username).toLowerCase());
  if (user?.email) handles.add(String(user.email).split("@")[0].toLowerCase());
  return [...handles].filter(Boolean);
}

/**
 * Converts what the user typed into the stored format: `@Full Name` /
 * `@username` → `<@uid>`, `@channel`/`@here`/`@everyone` → `<!…>`,
 * `#channel-name` → `<#id>`, and `:shortcode:` → emoji.
 */
export function encodeMessageText(text, { users = [], channels = [] } = {}) {
  const people = (users || []).filter((user) => user?.id);
  const byName = people
    .map((user) => ({ id: user.id, name: getUserDisplayName(user, "") }))
    .filter((entry) => entry.name)
    .sort((a, b) => b.name.length - a.name.length);
  const byHandle = new Map();
  people.forEach((user) => userHandles(user).forEach((handle) => { if (!byHandle.has(handle)) byHandle.set(handle, user.id); }));
  const channelByName = new Map();
  (channels || []).forEach((channel) => {
    if (channel?.type !== CHANNEL_TYPES.DM && channel?.name && !channelByName.has(channel.name.toLowerCase())) {
      channelByName.set(channel.name.toLowerCase(), channel.id);
    }
  });

  return mapOutsideCode(replaceShortcodesOutside(text), (segment) => {
    let result = segment.replace(/(^|[^\w<])@(channel|here|everyone)\b/gi, (_, lead, name) => `${lead}<!${name.toLowerCase()}>`);
    byName.forEach(({ id, name }) => {
      const pattern = new RegExp(`(^|[^\\w<])@${escapeRegExp(name)}(?=$|[^\\w])`, "gi");
      result = result.replace(pattern, (_, lead) => `${lead}<@${id}>`);
    });
    result = result.replace(/(^|[^\w<])@([\w.-]+)/g, (match, lead, handle) => {
      const clean = handle.replace(/[.-]+$/, "");
      const id = byHandle.get(clean.toLowerCase());
      return id ? `${lead}<@${id}>${handle.slice(clean.length)}` : match;
    });
    result = result.replace(/(^|[^\w<&])#([\wÀ-ɏ-]+)/g, (match, lead, name) => {
      const id = channelByName.get(name.toLowerCase());
      return id ? `${lead}<#${id}>` : match;
    });
    return result;
  });
}

function replaceShortcodesOutside(text) {
  return mapOutsideCode(text, replaceShortcodes);
}

/** Stored format → editable text (used when editing a message). */
export function decodeForEditing(text, { usersById = {}, channelsById = {} } = {}) {
  return String(text || "")
    .replace(/<@([\w.-]+)>/g, (_, id) => `@${getUserDisplayName(usersById[id], id)}`)
    .replace(/<!(channel|here|everyone)>/g, (_, name) => `@${name}`)
    .replace(/<#([\w.-]+)>/g, (_, id) => `#${channelsById[id]?.name || id}`);
}

/**
 * Finds the autocomplete trigger right before the caret.
 * Returns `{ type: "mention" | "channel" | "emoji" | "command" | "reference", query, start, end }` or null.
 */
export function getActiveTrigger(text, caret) {
  const value = String(text || "");
  const position = typeof caret === "number" ? caret : value.length;
  const before = value.slice(0, position);

  const reference = before.match(/\[\[([^\]\n]{0,40})$/);
  if (reference) return { type: "reference", query: reference[1], start: position - reference[1].length - 2, end: position };

  const command = before.match(/^\/([\w-]*)$/);
  if (command) return { type: "command", query: command[1], start: 0, end: position };

  const mention = before.match(/(^|\s)@([^\s@]{0,30})$/);
  if (mention) return { type: "mention", query: mention[2], start: position - mention[2].length - 1, end: position };

  const channel = before.match(/(^|\s)#([\wÀ-ɏ-]{0,40})$/);
  if (channel) return { type: "channel", query: channel[2], start: position - channel[2].length - 1, end: position };

  const emoji = before.match(/(^|\s):([a-z0-9_+-]{2,30})$/i);
  if (emoji) return { type: "emoji", query: emoji[2], start: position - emoji[2].length - 1, end: position };

  return null;
}

/** Replaces the trigger range with `replacement` and returns the new text + caret. */
export function applyCompletion(text, trigger, replacement) {
  const value = String(text || "");
  const next = `${value.slice(0, trigger.start)}${replacement}${value.slice(trigger.end)}`;
  return { text: next, caret: trigger.start + replacement.length };
}

export function filterMentionCandidates(users, query, { max = 8, includeSpecial = true } = {}) {
  const needle = String(query || "").toLowerCase();
  const people = (users || [])
    .filter((user) => {
      if (!needle) return true;
      const name = getUserDisplayName(user, "").toLowerCase();
      return name.split(/\s+/).some((part) => part.startsWith(needle))
        || name.startsWith(needle)
        || userHandles(user).some((handle) => handle.startsWith(needle));
    })
    .slice(0, max)
    .map((user) => ({ kind: "user", id: user.id, label: getUserDisplayName(user), user }));
  const special = includeSpecial
    ? [
      { kind: "special", id: "channel", label: "channel", description: "Notify everyone in this conversation" },
      { kind: "special", id: "here", label: "here", description: "Notify everyone online in this conversation" },
    ].filter((entry) => !needle || entry.id.startsWith(needle))
    : [];
  return [...people, ...special].slice(0, max + 2);
}
