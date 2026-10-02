/*
 * Pure chat model helpers shared by the chat service backends, ChatContext
 * and the Chats feature UI. Nothing in here touches Firestore or React.
 *
 * Stored text format (Slack-style tokens, so renames never break mentions):
 *   <@uid>          user mention
 *   <!channel>      notify every channel member
 *   <!here>         notify members that are currently online
 *   <#channelId>    channel reference
 */

export const DEFAULT_CHANNEL_ID = "general";
export const MESSAGE_PAGE_SIZE = 50;
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_ATTACHMENTS = 4;
export const MAX_ATTACHMENT_BYTES = 400 * 1024;
export const MAX_TOTAL_ATTACHMENT_BYTES = 700 * 1024;
export const INBOX_LIMIT = 100;
export const PRESENCE_ONLINE_WINDOW_MS = 3 * 60 * 1000;
export const PRESENCE_HEARTBEAT_MS = 60 * 1000;
export const TYPING_TTL_MS = 6000;
export const TYPING_THROTTLE_MS = 2500;
export const GROUPING_WINDOW_MS = 5 * 60 * 1000;
export const EDIT_WINDOW_MS = Infinity;

export const CHANNEL_TYPES = { CHANNEL: "channel", DM: "dm" };
export const CHANNEL_KINDS = { REGULAR: "regular", PROJECT: "project" };
export const PROJECT_CHANNEL_PREFIX = "proj_";
export const NOTIFY_LEVELS = { ALL: "all", MENTIONS: "mentions", NOTHING: "nothing" };
export const HUDDLE_MAX_PARTICIPANTS = 6;
export const HUDDLE_STALE_MS = 45 * 1000;
export const HUDDLE_HEARTBEAT_MS = 15 * 1000;
export const INBOX_KINDS = { MENTION: "mention", THREAD: "thread", REMINDER: "reminder", KEYWORD: "keyword" };

const MENTION_TOKEN = /<@([\w.-]+)>/g;
const SPECIAL_TOKEN = /<!(channel|here|everyone)>/g;
const CHANNEL_TOKEN = /<#([\w.-]+)>/g;
const ENTITY_TOKEN = /<(doc|release):([\w.-]+)>/g;

export function createChatId(prefix = "msg") {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

/** Deterministic id for a 1:1 or group DM so the same people never get two conversations. */
export function buildDmChannelId(memberIds) {
  const unique = [...new Set((memberIds || []).filter(Boolean).map(String))].sort();
  return `dm_${unique.join("__")}`;
}

export function slugifyChannelName(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/^#+/, "")
    .replace(/[^a-z0-9ğüşöçı_\- ]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function validateChannelName(name, channels = [], ignoreId = null) {
  const slug = slugifyChannelName(name);
  if (!slug) return "Channel names can't be blank.";
  if (slug.length < 2) return "Channel names need at least 2 characters.";
  const taken = (channels || []).some((channel) => (
    channel.type !== CHANNEL_TYPES.DM
    && channel.id !== ignoreId
    && !channel.deleted
    && slugifyChannelName(channel.name) === slug
  ));
  if (taken) return "That name is already taken by another channel.";
  return null;
}

export function normalizeChannel(raw, id) {
  if (!raw) return null;
  const type = raw.type === CHANNEL_TYPES.DM ? CHANNEL_TYPES.DM : CHANNEL_TYPES.CHANNEL;
  return {
    id: raw.id || id,
    type,
    name: raw.name || "",
    description: raw.description || "",
    topic: raw.topic || "",
    isPrivate: type === CHANNEL_TYPES.DM ? true : raw.isPrivate === true,
    isDefault: raw.isDefault === true,
    memberIds: Array.isArray(raw.memberIds) ? raw.memberIds : [],
    adminIds: Array.isArray(raw.adminIds) ? raw.adminIds : [],
    createdBy: raw.createdBy || null,
    createdAt: Number(raw.createdAt) || 0,
    updatedAt: Number(raw.updatedAt) || 0,
    lastMessageAt: Number(raw.lastMessageAt) || 0,
    lastMessage: raw.lastMessage || null,
    seq: Number(raw.seq) || 0,
    archived: raw.archived === true,
    projectId: raw.projectId || null,
    kind: raw.kind || (raw.projectId && String(raw.id || id || "").startsWith(PROJECT_CHANNEL_PREFIX) ? CHANNEL_KINDS.PROJECT : CHANNEL_KINDS.REGULAR),
    botEvents: raw.botEvents && typeof raw.botEvents === "object" ? raw.botEvents : {},
    retentionDays: Number(raw.retentionDays) || 0,
    color: raw.color || null,
  };
}

export function normalizeMessage(raw, id, channelId) {
  if (!raw) return null;
  return {
    id: raw.id || id,
    channelId: raw.channelId || channelId,
    authorId: raw.authorId || null,
    text: typeof raw.text === "string" ? raw.text : "",
    createdAt: Number(raw.createdAt) || 0,
    editedAt: Number(raw.editedAt) || 0,
    deleted: raw.deleted === true,
    system: raw.system || null,
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    mentions: Array.isArray(raw.mentions) ? raw.mentions : [],
    mentionsAll: raw.mentionsAll === true,
    mentionsHere: raw.mentionsHere === true,
    reactions: raw.reactions && typeof raw.reactions === "object" ? raw.reactions : {},
    threadRootId: raw.threadRootId || null,
    sharedFromThread: raw.sharedFromThread === true,
    replyCount: Number(raw.replyCount) || 0,
    lastReplyAt: Number(raw.lastReplyAt) || 0,
    threadParticipantIds: Array.isArray(raw.threadParticipantIds) ? raw.threadParticipantIds : [],
    pinned: raw.pinned === true,
    pinnedBy: raw.pinnedBy || null,
    pinnedAt: Number(raw.pinnedAt) || 0,
    linkedTasks: Array.isArray(raw.linkedTasks) ? raw.linkedTasks : [],
    seq: Number(raw.seq) || 0,
    poll: raw.poll && typeof raw.poll === "object" ? raw.poll : null,
    pollVotes: raw.pollVotes && typeof raw.pollVotes === "object" ? raw.pollVotes : {},
    quote: raw.quote || null,
    forwarded: raw.forwarded || null,
    previews: Array.isArray(raw.previews) ? raw.previews : [],
    hidePreviews: raw.hidePreviews === true,
    taskId: raw.taskId || null,
    scheduledFrom: Number(raw.scheduledFrom) || 0,
  };
}

export function sortByCreatedAt(list, direction = "asc") {
  const sign = direction === "desc" ? -1 : 1;
  return [...(list || [])].sort((a, b) => (
    ((a.createdAt || 0) - (b.createdAt || 0)) * sign || String(a.id).localeCompare(String(b.id)) * sign
  ));
}

export function isChannelMember(channel, uid) {
  if (!channel || !uid) return false;
  if (channel.isDefault) return true;
  return (channel.memberIds || []).includes(uid);
}

export function canViewChannel(channel, uid) {
  if (!channel || channel.deleted) return false;
  if (!channel.isPrivate) return true;
  return isChannelMember(channel, uid);
}

export function isChannelAdmin(channel, uid, isWorkspaceAdmin = false) {
  if (!channel || !uid) return false;
  if (isWorkspaceAdmin) return true;
  if (channel.type === CHANNEL_TYPES.DM) return false;
  return channel.createdBy === uid || (channel.adminIds || []).includes(uid);
}

export function getDmPartnerIds(channel, uid) {
  if (!channel || channel.type !== CHANNEL_TYPES.DM) return [];
  const others = (channel.memberIds || []).filter((id) => id !== uid);
  // A DM with yourself ("notes to self") has only your own id.
  return others.length ? others : [uid];
}

export function getUserDisplayName(user, fallback = "Unknown user") {
  if (!user) return fallback;
  return user.name || user.fullName || user.username || (user.email ? String(user.email).split("@")[0] : "") || fallback;
}

export function getChannelDisplayName(channel, uid, usersById = {}) {
  if (!channel) return "";
  if (channel.type !== CHANNEL_TYPES.DM) return channel.name;
  const partners = getDmPartnerIds(channel, uid);
  if (partners.length === 1 && partners[0] === uid) {
    return `${getUserDisplayName(usersById[uid], "You")} (you)`;
  }
  return partners.map((id) => getUserDisplayName(usersById[id])).join(", ");
}

export function getUnreadCount(channel, userState, uid) {
  if (!channel || !isChannelMember(channel, uid)) return 0;
  const readSeq = Number(userState?.readSeq?.[channel.id]) || 0;
  return Math.max(0, (channel.seq || 0) - readSeq);
}

export function isMuted(channelId, userState) {
  return Boolean(userState?.muted?.[channelId]);
}

export function isStarred(channelId, userState) {
  return Boolean(userState?.starred?.[channelId]);
}

/** Unread @mentions per channel (thread replies are counted separately). */
export function getMentionCounts(inbox) {
  const counts = {};
  (inbox || []).forEach((item) => {
    if (item.read || item.kind !== INBOX_KINDS.MENTION) return;
    counts[item.channelId] = (counts[item.channelId] || 0) + 1;
  });
  return counts;
}

/**
 * Badge numbers for the app sidebar and the chat sidebar.
 *  - `badge`: DM unread messages + unread mentions + unread thread replies
 *  - `hasUnread`: any unmuted channel has unread messages (shows a dot)
 */
export function computeUnreadSummary({ channels = [], userState = null, inbox = [], uid = null } = {}) {
  const mentionCounts = getMentionCounts(inbox);
  let dmUnread = 0;
  let channelUnread = 0;
  let mentionTotal = 0;
  const perChannel = {};

  (channels || []).forEach((channel) => {
    if (!channel || channel.archived || !isChannelMember(channel, uid)) return;
    const unread = getUnreadCount(channel, userState, uid);
    const mentions = mentionCounts[channel.id] || 0;
    const muted = isMuted(channel.id, userState);
    perChannel[channel.id] = { unread, mentions, muted };
    mentionTotal += mentions;
    if (channel.type === CHANNEL_TYPES.DM) {
      if (!muted) dmUnread += unread;
    } else if (!muted && unread > 0) {
      channelUnread += 1;
    }
  });

  const threadUnread = (inbox || []).filter((item) => !item.read && item.kind === INBOX_KINDS.THREAD).length;
  const activityUnread = (inbox || []).filter((item) => !item.read).length;

  return {
    perChannel,
    dmUnread,
    channelUnread,
    mentionTotal,
    threadUnread,
    activityUnread,
    badge: dmUnread + mentionTotal + threadUnread,
    hasUnread: dmUnread + channelUnread + mentionTotal + threadUnread > 0,
  };
}

export function extractMentionIds(text) {
  return [...new Set([...String(text || "").matchAll(MENTION_TOKEN)].map((match) => match[1]))];
}

export function extractSpecialMentions(text) {
  const found = new Set([...String(text || "").matchAll(SPECIAL_TOKEN)].map((match) => match[1]));
  return {
    all: found.has("channel") || found.has("everyone"),
    here: found.has("here"),
  };
}

export function isUserOnline(presence, now = Date.now()) {
  if (!presence || presence.status === "offline") return false;
  return now - (Number(presence.lastActiveAt) || 0) < PRESENCE_ONLINE_WINDOW_MS;
}

export function getPresenceState(presence, now = Date.now()) {
  if (!isUserOnline(presence, now)) return "offline";
  if (presence.dnd) return "dnd";
  if (presence.status === "away" || presence.away) return "away";
  return "active";
}

export function getActiveCustomStatus(presence, now = Date.now()) {
  const status = presence?.customStatus;
  if (!status || (!status.text && !status.emoji)) return null;
  if (status.expiresAt && Number(status.expiresAt) < now) return null;
  return status;
}

/**
 * Replaces stored tokens with readable text (used for previews,
 * notifications, search and task descriptions).
 */
export function toPlainText(text, { usersById = {}, channelsById = {}, entityLabel = null } = {}) {
  return String(text || "")
    .replace(MENTION_TOKEN, (_, id) => `@${getUserDisplayName(usersById[id], "unknown")}`)
    .replace(SPECIAL_TOKEN, (_, name) => `@${name}`)
    .replace(CHANNEL_TOKEN, (_, id) => `#${channelsById[id]?.name || id}`)
    .replace(ENTITY_TOKEN, (_, kind, id) => entityLabel?.(kind, id) || (kind === "doc" ? "📄 doc" : "🏷️ release"));
}

export function buildPreview(text, attachments = [], options = {}) {
  const plain = toPlainText(text, options)
    .replace(/```[\s\S]*?```/g, "[code]")
    .replace(/[*_~`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain) return plain.length > 140 ? `${plain.slice(0, 137)}…` : plain;
  if (attachments?.length) {
    return attachments.length === 1 ? `📎 ${attachments[0].name || "Attachment"}` : `📎 ${attachments.length} attachments`;
  }
  return "";
}

/**
 * Inbox entries for a posted message. Authors never notify themselves and
 * muted channels still deliver explicit @mentions (Slack behaviour).
 */
export function buildInboxTargets({
  message,
  channel,
  rootMessage = null,
  presenceById = {},
  workspaceUserIds = [],
  now = Date.now(),
}) {
  const targets = new Map();
  const authorId = message.authorId;
  // The default channel has implicit membership: everyone in the workspace.
  const members = channel?.isDefault
    ? [...(workspaceUserIds || []), ...(channel.memberIds || [])]
    : channel?.memberIds || [];
  const memberSet = new Set(members);

  extractMentionIds(message.text).forEach((uid) => {
    if (uid !== authorId) targets.set(uid, INBOX_KINDS.MENTION);
  });
  const special = extractSpecialMentions(message.text);
  if (special.all) {
    memberSet.forEach((uid) => { if (uid !== authorId) targets.set(uid, INBOX_KINDS.MENTION); });
  } else if (special.here) {
    memberSet.forEach((uid) => {
      if (uid !== authorId && isUserOnline(presenceById[uid], now)) targets.set(uid, INBOX_KINDS.MENTION);
    });
  }

  if (rootMessage) {
    const participants = new Set([rootMessage.authorId, ...(rootMessage.threadParticipantIds || [])]);
    participants.forEach((uid) => {
      if (uid && uid !== authorId && !targets.has(uid)) targets.set(uid, INBOX_KINDS.THREAD);
    });
  }

  return [...targets.entries()].map(([uid, kind]) => ({ uid, kind }));
}

/** Deep merge where `null` / `undefined` values delete keys (mirrors Firestore deleteField). */
export function applyStatePatch(state, patch) {
  const base = state && typeof state === "object" ? { ...state } : {};
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      delete base[key];
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      base[key] = applyStatePatch(base[key], value);
    } else {
      base[key] = value;
    }
  });
  return base;
}

export function reactionCount(reactions) {
  return Object.values(reactions || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
}

export function isSameDay(a, b) {
  const left = new Date(a);
  const right = new Date(b);
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

/**
 * Flattens messages into render rows: date dividers, the "New" divider and
 * messages flagged `grouped` when they continue the previous author's run.
 */
export function buildMessageRows(messages, { lastReadAt = 0, currentUserId = null } = {}) {
  const rows = [];
  let previous = null;
  let newDividerPlaced = false;

  (messages || []).forEach((message) => {
    if (!previous || !isSameDay(previous.createdAt, message.createdAt)) {
      rows.push({ kind: "date", id: `date-${message.createdAt}`, at: message.createdAt });
      previous = null;
    }
    if (
      !newDividerPlaced
      && lastReadAt > 0
      && message.createdAt > lastReadAt
      && message.authorId !== currentUserId
      && !message.pending
    ) {
      rows.push({ kind: "new", id: `new-${message.id}` });
      newDividerPlaced = true;
      previous = null;
    }
    const grouped = Boolean(
      previous
      && !previous.system
      && !message.system
      && previous.authorId === message.authorId
      && !previous.deleted
      && message.createdAt - previous.createdAt < GROUPING_WINDOW_MS
      && !message.sharedFromThread
    );
    rows.push({ kind: "message", id: message.id, message, grouped });
    previous = message;
  });

  return rows;
}

export function projectChannelId(projectId) {
  return `${PROJECT_CHANNEL_PREFIX}${String(projectId || "").replace(/[^\w.-]/g, "_")}`;
}

export function getNotifyLevel(channel, userState) {
  const stored = userState?.notify?.[channel?.id];
  if (stored === NOTIFY_LEVELS.ALL || stored === NOTIFY_LEVELS.NOTHING || stored === NOTIFY_LEVELS.MENTIONS) return stored;
  return channel?.type === CHANNEL_TYPES.DM ? NOTIFY_LEVELS.ALL : NOTIFY_LEVELS.MENTIONS;
}

/** Keywords from user prefs (comma separated or array), lower-cased and de-duplicated. */
export function normalizeKeywords(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(list.map((entry) => String(entry || "").trim().toLowerCase()).filter((entry) => entry.length >= 2))].slice(0, 20);
}

export function matchKeywords(text, keywords) {
  const haystack = String(text || "").toLowerCase();
  return (keywords || []).find((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(haystack);
  }) || null;
}

/** Poll tallies: `{ total, voters, counts: {optionId: n}, mine: Set }`. */
export function tallyPoll(message, uid) {
  const votes = message?.pollVotes || {};
  const counts = {};
  const voters = new Set();
  const mine = new Set();
  (message?.poll?.options || []).forEach((option) => {
    const list = Array.isArray(votes[option.id]) ? votes[option.id] : [];
    counts[option.id] = list.length;
    list.forEach((id) => voters.add(id));
    if (uid && list.includes(uid)) mine.add(option.id);
  });
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return { total, voters: voters.size, counts, mine };
}

/**
 * Vote change for a poll: returns `{ add: [optionId], remove: [optionId] }`.
 * Single-choice polls move the vote; multi-choice polls toggle the option.
 */
export function planPollVote(message, optionId, uid) {
  const { mine } = tallyPoll(message, uid);
  if (message?.poll?.closed) return { add: [], remove: [] };
  if (mine.has(optionId)) return { add: [], remove: [optionId] };
  if (message?.poll?.multi) return { add: [optionId], remove: [] };
  return { add: [optionId], remove: [...mine] };
}

/** Participants seen within the heartbeat window. */
export function activeHuddleParticipants(huddle, now = Date.now()) {
  return Object.entries(huddle?.participants || {})
    .filter(([, entry]) => entry && now - (Number(entry.lastSeen) || 0) < HUDDLE_STALE_MS)
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}

export function isHuddleLive(huddle, now = Date.now()) {
  return Boolean(huddle?.active) && activeHuddleParticipants(huddle, now).length > 0;
}

/** Whether a DM/channel member has read up to `message` (read receipts). */
export function hasReadMessage(userState, message) {
  if (!message?.seq) return false;
  return (Number(userState?.readSeq?.[message.channelId]) || 0) >= message.seq;
}
