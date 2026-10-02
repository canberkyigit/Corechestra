import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { useApp } from "./AppContext";
import { usePermissions } from "./hooks/usePermissions";
import { getChatBackend } from "../services/chat/chatService";
import { requestNavigate } from "../components/appNavigation";
import { useProjectChannels } from "./chat/useProjectChannels";
import { useChatBot } from "./chat/useChatBot";
import { useChatScheduler } from "./chat/useChatScheduler";
import { runRetentionCleanup, useChatWorkspaceSettings, useRetentionJob } from "./chat/useChatWorkspace";
import {
  buildDmChannelId,
  buildInboxTargets,
  buildPreview,
  canViewChannel,
  CHANNEL_TYPES,
  computeUnreadSummary,
  createChatId,
  DEFAULT_CHANNEL_ID,
  extractMentionIds,
  extractSpecialMentions,
  getChannelDisplayName,
  getUserDisplayName,
  INBOX_KINDS,
  isChannelAdmin,
  isChannelMember,
  isMuted,
  getNotifyLevel,
  matchKeywords,
  normalizeKeywords,
  NOTIFY_LEVELS,
  planPollVote,
  projectChannelId,
  PRESENCE_HEARTBEAT_MS,
  slugifyChannelName,
  toPlainText,
  TYPING_THROTTLE_MS,
} from "../services/chat/chatModel";

/*
 * Chat boundary (like HRContext it owns its own persistence, see
 * services/chat/chatService.js). Three contexts keep re-renders cheap:
 *   ChatDataContext     channels, user state, inbox, presence, pending sends
 *   ChatActionsContext  stable action functions
 *   ChatUnreadContext   badge summary for the app sidebar (Layout)
 */

const ChatDataContext = createContext(null);
const ChatActionsContext = createContext(null);
const ChatUnreadContext = createContext(null);

const EMPTY_UNREAD = Object.freeze({
  perChannel: {}, dmUnread: 0, channelUnread: 0, mentionTotal: 0, threadUnread: 0, activityUnread: 0, badge: 0, hasUnread: false,
});
const EMPTY_OBJECT = Object.freeze({});
const SEARCH_CACHE_MS = 60 * 1000;
const SEARCH_FETCH_SIZE = 200;
const MAX_INCOMING = 3;

function conversationKey(channelId, threadRootId) {
  return threadRootId ? `${channelId}/${threadRootId}` : channelId;
}

function isDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

function showDesktopNotification({ title, body, tag, onClick }) {
  if (typeof window === "undefined" || typeof window.Notification !== "function") return;
  if (window.Notification.permission !== "granted") return;
  try {
    const notification = new window.Notification(title, { body, tag, silent: false });
    notification.onclick = () => {
      window.focus();
      onClick?.();
      notification.close();
    };
  } catch {
    // Some browsers (iOS Safari) throw for page-created notifications.
  }
}

export function ChatProvider({ children }) {
  const { user: authUser, profile, isAdmin } = useAuth() || {};
  const { users, deletedUserIds, addNotification, currentUser, projects, currentProjectId, logAuditEvent } = useApp();
  const { canPerform, canAccessPage } = usePermissions();
  const uid = authUser?.uid || null;
  const backend = useMemo(() => getChatBackend(), []);
  const chatEnabled = Boolean(uid) && canAccessPage("chats");

  const [channelsRaw, setChannelsRaw] = useState(null);
  const [userState, setUserState] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [presence, setPresence] = useState(EMPTY_OBJECT);
  const [pending, setPending] = useState(EMPTY_OBJECT);
  const [incoming, setIncoming] = useState([]);
  const [error, setError] = useState(null);
  const workspace = useChatWorkspaceSettings({ backend, enabled: chatEnabled });

  const activeRef = useRef({ channelId: null, threadRootId: null, mounted: false });
  const typingSentRef = useRef({});
  const searchCacheRef = useRef(new Map());
  const defaultEnsuredRef = useRef(false);

  // ── Directory (product People records) ────────────────────────────────────
  const directory = useMemo(() => {
    const deleted = new Set(deletedUserIds || []);
    const byId = {};
    (users || []).forEach((person) => {
      if (!person?.id) return;
      byId[person.id] = { ...person, deactivated: person.status === "inactive" || person.status === "deleted" || deleted.has(person.id) };
    });
    if (uid && !byId[uid]) {
      const prefix = String(authUser?.email || "").split("@")[0];
      byId[uid] = {
        id: uid,
        name: profile?.fullName || profile?.name || (prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : "You"),
        username: prefix,
        email: authUser?.email || "",
        color: profile?.color || "#6366f1",
        status: "active",
      };
    }
    const activeUsers = Object.values(byId)
      .filter((person) => !person.deactivated)
      .sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b)));
    return { usersById: byId, activeUsers };
  }, [users, deletedUserIds, uid, authUser?.email, profile]);

  const directoryRef = useRef(directory);
  directoryRef.current = directory;

  // ── Subscriptions ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatEnabled) return undefined;
    const onError = (err) => setError(err?.message || "Chat is temporarily unavailable.");
    const unsubs = [
      backend.subscribeChannels(uid, (list) => { setChannelsRaw(list); setError(null); }, onError),
      backend.subscribeUserState(uid, setUserState, onError),
      backend.subscribeInbox(uid, setInbox, onError),
      backend.subscribePresence(setPresence, onError),
    ];
    return () => unsubs.forEach((unsub) => unsub?.());
  }, [backend, chatEnabled, uid]);

  // The workspace-wide #general channel is created by the first client that needs it.
  useEffect(() => {
    if (!chatEnabled || !channelsRaw || defaultEnsuredRef.current) return;
    defaultEnsuredRef.current = true;
    if (channelsRaw.some((channel) => channel.id === DEFAULT_CHANNEL_ID)) return;
    const now = Date.now();
    backend.ensureChannel({
      id: DEFAULT_CHANNEL_ID,
      type: CHANNEL_TYPES.CHANNEL,
      name: "general",
      description: "Workspace-wide announcements and conversations. Everyone is a member.",
      topic: "",
      isPrivate: false,
      isDefault: true,
      memberIds: [],
      adminIds: [],
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      seq: 0,
      archived: false,
    }).catch(() => { defaultEnsuredRef.current = false; });
  }, [backend, channelsRaw, chatEnabled, uid]);

  // Presence heartbeat: active while visible, away when hidden, offline on unload.
  useEffect(() => {
    if (!chatEnabled) return undefined;
    const beat = (status) => backend.setPresence(uid, { status, lastActiveAt: Date.now() }).catch(() => {});
    beat(isDocumentVisible() ? "active" : "away");
    const interval = window.setInterval(() => { if (isDocumentVisible()) beat("active"); }, PRESENCE_HEARTBEAT_MS);
    const onVisibility = () => beat(isDocumentVisible() ? "active" : "away");
    const onPageHide = () => { backend.setPresence(uid, { status: "offline" }).catch(() => {}); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [backend, chatEnabled, uid]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const channels = useMemo(
    () => (channelsRaw || []).filter((channel) => canViewChannel(channel, uid)),
    [channelsRaw, uid]
  );
  const channelsById = useMemo(() => Object.fromEntries(channels.map((channel) => [channel.id, channel])), [channels]);
  const unread = useMemo(
    () => (chatEnabled ? computeUnreadSummary({ channels, userState, inbox, uid }) : EMPTY_UNREAD),
    [channels, chatEnabled, inbox, uid, userState]
  );

  const stateRef = useRef({});
  stateRef.current = { channelsById, userState, inbox, presence, unread, workspace };

  const audit = useCallback((action, details = {}) => {
    try {
      logAuditEvent?.(action, { scope: "chat", entityType: "chat", ...details });
    } catch {
      // Audit logging is best-effort.
    }
  }, [logAuditEvent]);

  // ── Incoming message alerts (toasts + desktop notifications) ─────────────
  const seenInboxRef = useRef(null);
  const lastDmSeenRef = useRef(null);

  const isViewing = useCallback((channelId, threadRootId = null) => {
    const active = activeRef.current;
    if (!active.mounted || !isDocumentVisible()) return false;
    if (threadRootId) return active.threadRootId === threadRootId || active.channelId === channelId;
    return active.channelId === channelId;
  }, []);

  const pushIncoming = useCallback((entry) => {
    const presenceSelf = stateRef.current.presence?.[uid];
    if (presenceSelf?.dnd) return;
    setIncoming((prev) => (prev.some((item) => item.id === entry.id) ? prev : [entry, ...prev].slice(0, MAX_INCOMING)));
    if (!isDocumentVisible() && stateRef.current.userState?.prefs?.desktopNotifications) {
      const params = new URLSearchParams({ c: entry.channelId });
      if (entry.messageId) params.set("m", entry.messageId);
      if (entry.threadRootId) params.set("t", entry.threadRootId);
      showDesktopNotification({
        title: entry.title,
        body: entry.body,
        tag: entry.id,
        onClick: () => requestNavigate(`chats?${params.toString()}`),
      });
    }
  }, [uid]);

  useEffect(() => {
    if (!chatEnabled) return;
    const ids = new Set(inbox.map((item) => item.id));
    if (seenInboxRef.current === null) {
      seenInboxRef.current = ids;
      return;
    }
    const { usersById } = directoryRef.current;
    inbox.forEach((item) => {
      if (item.read || seenInboxRef.current.has(item.id)) return;
      if (isViewing(item.channelId, item.threadRootId)) return;
      const channel = stateRef.current.channelsById[item.channelId];
      if (channel && getNotifyLevel(channel, stateRef.current.userState) === NOTIFY_LEVELS.NOTHING) return;
      const author = getUserDisplayName(usersById[item.authorId]);
      const where = channel ? (channel.type === CHANNEL_TYPES.DM ? "a direct message" : `#${channel.name}`) : "a conversation";
      pushIncoming({
        id: item.id,
        kind: item.kind,
        channelId: item.channelId,
        messageId: item.messageId,
        threadRootId: item.threadRootId,
        authorId: item.authorId,
        title: item.kind === INBOX_KINDS.THREAD ? `${author} replied in a thread` : `${author} mentioned you in ${where}`,
        body: item.preview,
      });
    });
    seenInboxRef.current = ids;
  }, [chatEnabled, inbox, isViewing, pushIncoming]);

  // New messages in conversations: DMs and channels set to "All messages"
  // alert; other channels only alert on the user's keywords.
  useEffect(() => {
    if (!chatEnabled || !channelsRaw) return;
    const latest = {};
    channels.forEach((channel) => { latest[channel.id] = channel.lastMessageAt; });
    if (lastDmSeenRef.current === null) {
      lastDmSeenRef.current = latest;
      return;
    }
    const { usersById } = directoryRef.current;
    const state = stateRef.current.userState;
    const keywords = normalizeKeywords(state?.prefs?.keywords);
    channels.forEach((channel) => {
      const previous = lastDmSeenRef.current[channel.id] || 0;
      const last = channel.lastMessage;
      if (!last || channel.lastMessageAt <= previous || last.authorId === uid) return;
      if (!isChannelMember(channel, uid) || isViewing(channel.id)) return;
      const level = getNotifyLevel(channel, state);
      if (level === NOTIFY_LEVELS.NOTHING) return;
      const muted = isMuted(channel.id, state);
      const isDm = channel.type === CHANNEL_TYPES.DM;
      const author = getUserDisplayName(usersById[last.authorId]);
      if (!muted && (isDm || level === NOTIFY_LEVELS.ALL)) {
        pushIncoming({
          id: last.id,
          kind: isDm ? "dm" : "channel",
          channelId: channel.id,
          messageId: last.id,
          authorId: last.authorId,
          title: isDm ? author : `${author} in #${channel.name}`,
          body: last.preview,
        });
        return;
      }
      const keyword = keywords.length ? matchKeywords(last.preview, keywords) : null;
      if (keyword) {
        pushIncoming({
          id: `${last.id}-kw`,
          kind: INBOX_KINDS.KEYWORD,
          channelId: channel.id,
          messageId: last.id,
          authorId: last.authorId,
          title: `“${keyword}” mentioned in #${channel.name}`,
          body: `${author}: ${last.preview}`,
        });
      }
    });
    lastDmSeenRef.current = latest;
  }, [channels, channelsRaw, chatEnabled, isViewing, pushIncoming, uid]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const setActiveConversation = useCallback((next) => {
    activeRef.current = { ...activeRef.current, ...next };
    if (next?.channelId) {
      setIncoming((prev) => (prev.some((item) => item.channelId === next.channelId)
        ? prev.filter((item) => item.channelId !== next.channelId)
        : prev));
    }
  }, []);

  const dismissIncoming = useCallback((id) => {
    setIncoming((prev) => (id ? prev.filter((item) => item.id !== id) : []));
  }, []);

  const removePending = useCallback((key, id) => {
    setPending((prev) => {
      const list = (prev[key] || []).filter((entry) => entry.id !== id);
      const next = { ...prev };
      if (list.length) next[key] = list; else delete next[key];
      return next;
    });
  }, []);

  const appRef = useRef({ addNotification, currentUser });
  appRef.current = { addNotification, currentUser };

  const notifyMentions = useCallback((targets, { channel, message, preview }) => {
    const { addNotification: notify, currentUser: actor } = appRef.current;
    const { usersById } = directoryRef.current;
    const me = getUserDisplayName(usersById[uid]);
    const where = channel.type === CHANNEL_TYPES.DM ? "a direct message" : `#${channel.name}`;
    const route = `chats?c=${encodeURIComponent(channel.id)}&m=${encodeURIComponent(message.id)}${message.threadRootId ? `&t=${encodeURIComponent(message.threadRootId)}` : ""}`;
    targets
      .filter((target) => target.kind === INBOX_KINDS.MENTION)
      .forEach((target) => {
        const recipient = usersById[target.uid]?.username;
        if (!recipient) return;
        notify?.({
          type: "chat_mention",
          recipient,
          actor: actor || null,
          text: `${me} mentioned you in ${where}: ${preview}`.slice(0, 220),
          route,
        });
      });
  }, [uid]);

  // Optional link-metadata resolver injected by the Chats feature (it owns the endpoint config).
  const resolvePreviewsRef = useRef(null);
  const setPreviewResolver = useCallback((resolver) => { resolvePreviewsRef.current = resolver; }, []);

  const deliver = useCallback(async (draft) => {
    const { message, alsoToChannel, rootMessage } = draft;
    const key = conversationKey(message.channelId, message.threadRootId);
    // A conversation created a moment ago may not be in the snapshot yet; the
    // backend still rejects writes to channels that do not exist.
    const channel = stateRef.current.channelsById[message.channelId]
      || { id: message.channelId, type: CHANNEL_TYPES.CHANNEL, isPrivate: true, memberIds: [] };
    const { usersById, activeUsers } = directoryRef.current;
    const preview = buildPreview(message.text, message.attachments, { usersById, channelsById: stateRef.current.channelsById });
    const inboxTargets = buildInboxTargets({
      message,
      channel,
      rootMessage,
      presenceById: stateRef.current.presence,
      workspaceUserIds: activeUsers.map((person) => person.id),
    }).filter((target) => channel.isDefault || !channel.isPrivate || isChannelMember(channel, target.uid));
    try {
      const stored = await backend.postMessage({ message, preview, inboxTargets, alsoToChannel });
      removePending(key, message.id);
      notifyMentions(inboxTargets, { channel, message, preview });
      if (resolvePreviewsRef.current && /https?:\/\//.test(message.text)) {
        resolvePreviewsRef.current(message.text)
          .then((previews) => (previews?.length ? backend.updateMessage(stored, { previews }) : null))
          .catch(() => {});
      }
      return stored;
    } catch (err) {
      setPending((prev) => ({
        ...prev,
        [key]: (prev[key] || []).map((entry) => (
          entry.id === message.id ? { ...entry, status: "failed", error: err?.message || "Message not sent." } : entry
        )),
      }));
      throw err;
    }
  }, [backend, notifyMentions, removePending]);

  const pendingDraftsRef = useRef({});

  /**
   * `text` must already be encoded (`<@uid>` tokens, see chatMentions.js).
   * Resolves when the message is stored; rejects (and keeps a failed copy
   * with retry) when it could not be sent.
   */
  const sendMessage = useCallback(({ channelId, text, attachments = [], rootMessage = null, alsoToChannel = false, system = null, extra = null }) => {
    if (!uid) return Promise.reject(new Error("You are signed out."));
    const special = extractSpecialMentions(text);
    const message = {
      id: createChatId("msg"),
      channelId,
      authorId: uid,
      text: String(text || ""),
      createdAt: Date.now(),
      attachments,
      mentions: extractMentionIds(text),
      mentionsAll: special.all,
      mentionsHere: special.here,
      reactions: {},
      threadRootId: rootMessage?.id || null,
      replyCount: 0,
      threadParticipantIds: [],
      pinned: false,
      linkedTasks: [],
      system: system || null,
      ...(extra || {}),
    };
    const key = conversationKey(channelId, message.threadRootId);
    const draft = { message, alsoToChannel, rootMessage };
    pendingDraftsRef.current[message.id] = draft;
    setPending((prev) => ({ ...prev, [key]: [...(prev[key] || []), { ...message, pending: true, status: "sending" }] }));
    // Stop the typing indicator right away.
    if (typingSentRef.current[channelId]) {
      typingSentRef.current[channelId] = 0;
      backend.setTyping(channelId, uid, null).catch(() => {});
    }
    return deliver(draft).finally(() => {
      delete pendingDraftsRef.current[message.id];
    });
  }, [backend, deliver, uid]);

  const retryMessage = useCallback((pendingMessage) => {
    const key = conversationKey(pendingMessage.channelId, pendingMessage.threadRootId);
    const draft = pendingDraftsRef.current[pendingMessage.id] || { message: { ...pendingMessage, pending: undefined, status: undefined, error: undefined } };
    const { pending: _p, status: _s, error: _e, ...clean } = draft.message;
    const retried = { ...draft, message: { ...clean, createdAt: Date.now() } };
    pendingDraftsRef.current[pendingMessage.id] = retried;
    setPending((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((entry) => (entry.id === pendingMessage.id ? { ...retried.message, pending: true, status: "sending" } : entry)),
    }));
    return deliver(retried).catch(() => null).finally(() => {
      delete pendingDraftsRef.current[pendingMessage.id];
    });
  }, [deliver]);

  const discardPending = useCallback((pendingMessage) => {
    removePending(conversationKey(pendingMessage.channelId, pendingMessage.threadRootId), pendingMessage.id);
    delete pendingDraftsRef.current[pendingMessage.id];
  }, [removePending]);

  const editMessage = useCallback((message, text) => {
    const special = extractSpecialMentions(text);
    return backend.updateMessage(message, {
      text,
      editedAt: Date.now(),
      mentions: extractMentionIds(text),
      mentionsAll: special.all,
      mentionsHere: special.here,
    });
  }, [backend]);

  const deleteMessage = useCallback(async (message) => {
    const soft = !message.threadRootId && message.replyCount > 0;
    await backend.deleteMessage(message, { soft });
    if (message.authorId !== uid) {
      const channel = stateRef.current.channelsById[message.channelId];
      audit("chat message removed by moderator", {
        severity: "warning",
        channelId: message.channelId,
        channelName: channel?.name || "",
        messageAuthorId: message.authorId,
      });
    }
  }, [audit, backend, uid]);

  const toggleReaction = useCallback((message, key) => {
    if (!uid) return Promise.resolve();
    const has = (message.reactions?.[key] || []).includes(uid);
    return backend.toggleReaction(message, key, uid, !has);
  }, [backend, uid]);

  /** Author-level field updates (hide previews…). Only whitelisted fields. */
  const updateMessageFields = useCallback((message, patch) => {
    const allowed = {};
    ["hidePreviews", "previews"].forEach((key) => { if (patch[key] !== undefined) allowed[key] = patch[key]; });
    return backend.updateMessage(message, allowed);
  }, [backend]);

  const togglePin = useCallback((message) => backend.updateMessage(message, message.pinned
    ? { pinned: false, pinnedBy: null, pinnedAt: 0 }
    : { pinned: true, pinnedBy: uid, pinnedAt: Date.now() }), [backend, uid]);

  const linkTaskToMessage = useCallback((message, task) => backend.updateMessage(message, {
    linkedTasks: [...(message.linkedTasks || []).filter((entry) => entry.id !== task.id), { id: task.id, title: task.title || "" }],
  }), [backend]);

  const postSystemMessage = useCallback((channelId, system) => {
    if (!uid) return Promise.resolve();
    return sendMessage({ channelId, text: "", system }).catch(() => null);
  }, [sendMessage, uid]);

  const createChannel = useCallback(async ({ name, description = "", topic = "", isPrivate = false, memberIds = [], projectId = null }) => {
    const slug = slugifyChannelName(name);
    const now = Date.now();
    const id = createChatId("ch");
    await backend.createChannel({
      id,
      type: CHANNEL_TYPES.CHANNEL,
      name: slug,
      description: String(description || "").trim(),
      topic: String(topic || "").trim(),
      isPrivate: Boolean(isPrivate),
      isDefault: false,
      memberIds: [...new Set([uid, ...memberIds])],
      adminIds: [uid],
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      seq: 0,
      archived: false,
      projectId: projectId || null,
    });
    postSystemMessage(id, { type: "channel_created" });
    audit("chat channel created", { severity: "info", channelId: id, channelName: slug, isPrivate: Boolean(isPrivate) });
    return id;
  }, [audit, backend, postSystemMessage, uid]);

  const updateChannel = useCallback(async (channelId, patch, systemEvent = null) => {
    const next = { ...patch, updatedAt: Date.now() };
    if (next.name !== undefined) next.name = slugifyChannelName(next.name);
    await backend.updateChannel(channelId, next);
    if (systemEvent) postSystemMessage(channelId, systemEvent);
    const channel = stateRef.current.channelsById[channelId];
    if (patch.isPrivate !== undefined) {
      audit(`chat channel made ${patch.isPrivate ? "private" : "public"}`, { severity: "warning", channelId, channelName: channel?.name || "" });
    }
    if (patch.archived !== undefined) {
      audit(`chat channel ${patch.archived ? "archived" : "unarchived"}`, { severity: "info", channelId, channelName: channel?.name || "" });
    }
    if (patch.retentionDays !== undefined) {
      audit("chat channel retention changed", { severity: "warning", channelId, channelName: channel?.name || "", retentionDays: patch.retentionDays });
    }
  }, [audit, backend, postSystemMessage]);

  const deleteChannel = useCallback(async (channelId) => {
    const channel = stateRef.current.channelsById[channelId];
    await backend.deleteChannel(channelId);
    audit("chat channel deleted", { severity: "warning", channelId, channelName: channel?.name || "" });
  }, [audit, backend]);

  const joinChannel = useCallback(async (channelId) => {
    await backend.addChannelMembers(channelId, [uid], Date.now());
    const channel = stateRef.current.channelsById[channelId];
    await backend.updateUserState(uid, {
      readSeq: { [channelId]: channel?.seq || 0 },
      lastReadAt: { [channelId]: Date.now() },
    });
    postSystemMessage(channelId, { type: "joined" });
  }, [backend, postSystemMessage, uid]);

  const leaveChannel = useCallback(async (channelId) => {
    await postSystemMessage(channelId, { type: "left" });
    await backend.removeChannelMember(channelId, uid, Date.now());
    await backend.updateUserState(uid, { starred: { [channelId]: null } });
  }, [backend, postSystemMessage, uid]);

  const addMembers = useCallback(async (channelId, memberIds) => {
    const ids = [...new Set(memberIds)].filter(Boolean);
    if (!ids.length) return;
    await backend.addChannelMembers(channelId, ids, Date.now());
    postSystemMessage(channelId, { type: "added", userIds: ids });
  }, [backend, postSystemMessage]);

  const removeMember = useCallback(async (channelId, memberId) => {
    await backend.removeChannelMember(channelId, memberId, Date.now());
    postSystemMessage(channelId, { type: "removed", userIds: [memberId] });
    const channel = stateRef.current.channelsById[channelId];
    audit("chat member removed", { severity: "info", channelId, channelName: channel?.name || "", memberId });
  }, [audit, backend, postSystemMessage]);

  /** Opens (creating when needed) the DM between the current user and `memberIds`. */
  const openDirectMessage = useCallback(async (memberIds) => {
    const members = [...new Set([uid, ...(memberIds || [])])].filter(Boolean);
    const id = buildDmChannelId(members);
    if (!stateRef.current.channelsById[id]) {
      const now = Date.now();
      await backend.ensureChannel({
        id,
        type: CHANNEL_TYPES.DM,
        name: "",
        description: "",
        topic: "",
        isPrivate: true,
        isDefault: false,
        memberIds: members,
        adminIds: [],
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
        seq: 0,
        archived: false,
      });
    }
    if (stateRef.current.userState?.hiddenDms?.[id]) {
      backend.updateUserState(uid, { hiddenDms: { [id]: null } }).catch(() => {});
    }
    return id;
  }, [backend, uid]);

  const markChannelRead = useCallback((channelId) => {
    const { channelsById: byId, userState: state, inbox: items } = stateRef.current;
    const channel = byId[channelId];
    if (!channel || !uid || !isChannelMember(channel, uid)) return;
    const readSeq = Number(state?.readSeq?.[channelId]) || 0;
    const unreadMentions = items
      .filter((item) => !item.read && item.channelId === channelId && item.kind === INBOX_KINDS.MENTION && !item.threadRootId)
      .map((item) => item.id);
    if (readSeq < channel.seq || state?.markedUnread?.[channelId]) {
      backend.updateUserState(uid, {
        readSeq: { [channelId]: channel.seq },
        lastReadAt: { [channelId]: Date.now() },
        markedUnread: { [channelId]: null },
      }).catch(() => {});
    }
    if (unreadMentions.length) backend.markInboxRead(uid, unreadMentions).catch(() => {});
  }, [backend, uid]);

  const markUnreadFrom = useCallback((message) => {
    if (!uid || !message?.seq) return Promise.resolve();
    return backend.updateUserState(uid, {
      readSeq: { [message.channelId]: Math.max(0, message.seq - 1) },
      lastReadAt: { [message.channelId]: Math.max(0, message.createdAt - 1) },
      markedUnread: { [message.channelId]: true },
    });
  }, [backend, uid]);

  const markThreadRead = useCallback((rootId) => {
    if (!uid || !rootId) return;
    const ids = stateRef.current.inbox
      .filter((item) => !item.read && item.threadRootId === rootId)
      .map((item) => item.id);
    backend.updateUserState(uid, { threadReadAt: { [rootId]: Date.now() } }).catch(() => {});
    if (ids.length) backend.markInboxRead(uid, ids).catch(() => {});
  }, [backend, uid]);

  const markInboxRead = useCallback((ids) => {
    const list = (ids || stateRef.current.inbox.filter((item) => !item.read).map((item) => item.id));
    if (!uid || !list.length) return Promise.resolve();
    return backend.markInboxRead(uid, list);
  }, [backend, uid]);

  const markAllRead = useCallback(async () => {
    const { channelsById: byId } = stateRef.current;
    const readSeq = {};
    const lastReadAt = {};
    const now = Date.now();
    Object.values(byId).forEach((channel) => {
      if (!isChannelMember(channel, uid)) return;
      readSeq[channel.id] = channel.seq;
      lastReadAt[channel.id] = now;
    });
    await backend.updateUserState(uid, { readSeq, lastReadAt });
    await markInboxRead();
  }, [backend, markInboxRead, uid]);

  const updateUserState = useCallback((patch) => (uid ? backend.updateUserState(uid, patch) : Promise.resolve()), [backend, uid]);

  const toggleStar = useCallback((channelId) => updateUserState({
    starred: { [channelId]: stateRef.current.userState?.starred?.[channelId] ? null : true },
  }), [updateUserState]);

  const toggleMute = useCallback((channelId) => updateUserState({
    muted: { [channelId]: stateRef.current.userState?.muted?.[channelId] ? null : true },
  }), [updateUserState]);

  const hideDirectMessage = useCallback((channelId) => updateUserState({ hiddenDms: { [channelId]: true } }), [updateUserState]);

  const toggleSaved = useCallback((message) => {
    const saved = stateRef.current.userState?.saved?.[message.id];
    if (saved) return updateUserState({ saved: { [message.id]: null } });
    const { usersById } = directoryRef.current;
    return updateUserState({
      saved: {
        [message.id]: {
          messageId: message.id,
          channelId: message.channelId,
          threadRootId: message.sharedFromThread ? null : message.threadRootId || null,
          authorId: message.authorId,
          preview: buildPreview(message.text, message.attachments, { usersById, channelsById: stateRef.current.channelsById }),
          messageAt: message.createdAt,
          savedAt: Date.now(),
        },
      },
    });
  }, [updateUserState]);

  const updatePrefs = useCallback((patch) => updateUserState({ prefs: patch }), [updateUserState]);

  const setMyPresence = useCallback((patch) => (uid ? backend.setPresence(uid, { ...patch, lastActiveAt: Date.now() }) : Promise.resolve()), [backend, uid]);

  const setCustomStatus = useCallback((status) => setMyPresence({
    customStatus: status && (status.text || status.emoji)
      ? { emoji: status.emoji || "", text: String(status.text || "").slice(0, 100), expiresAt: status.expiresAt || 0 }
      : null,
  }), [setMyPresence]);

  /** Throttled typing indicator. `false` clears it immediately. */
  const setTyping = useCallback((channelId, typing) => {
    if (!uid || !channelId) return;
    const last = typingSentRef.current[channelId] || 0;
    const now = Date.now();
    if (typing) {
      if (now - last < TYPING_THROTTLE_MS) return;
      typingSentRef.current[channelId] = now;
      backend.setTyping(channelId, uid, now).catch(() => {});
    } else if (last) {
      typingSentRef.current[channelId] = 0;
      backend.setTyping(channelId, uid, null).catch(() => {});
    }
  }, [backend, uid]);

  /**
   * Client-side search over the most recent messages of the given channels
   * (Firestore has no full-text search). Results are cached for a minute.
   */
  const searchMessages = useCallback(async (text, { channelIds = null, authorId = null } = {}) => {
    const needle = String(text || "").trim().toLowerCase();
    if (!needle && !authorId) return [];
    const { channelsById: byId } = stateRef.current;
    const ids = (channelIds || Object.keys(byId)).filter((id) => byId[id] && isChannelMember(byId[id], uid));
    const { usersById } = directoryRef.current;
    const lists = await Promise.all(ids.map(async (id) => {
      const cached = searchCacheRef.current.get(id);
      if (cached && Date.now() - cached.at < SEARCH_CACHE_MS) return cached.list;
      const list = await backend.fetchRecentMessages(id, SEARCH_FETCH_SIZE).catch(() => []);
      searchCacheRef.current.set(id, { at: Date.now(), list });
      return list;
    }));
    return lists
      .flat()
      .filter((message) => !message.deleted && !message.system)
      .filter((message) => !authorId || message.authorId === authorId)
      .filter((message) => {
        if (!needle) return true;
        const plain = toPlainText(message.text, { usersById, channelsById: byId }).toLowerCase();
        const files = (message.attachments || []).map((file) => file.name || "").join(" ").toLowerCase();
        return plain.includes(needle) || files.includes(needle);
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100);
  }, [backend, uid]);

  const invalidateSearchCache = useCallback(() => { searchCacheRef.current.clear(); }, []);

  // ── Polls ─────────────────────────────────────────────────────────────────
  const votePoll = useCallback((message, optionId) => {
    if (!uid || !message?.poll) return Promise.resolve();
    const plan = planPollVote(message, optionId, uid);
    if (!plan.add.length && !plan.remove.length) return Promise.resolve();
    return backend.updatePollVotes(message, plan, uid);
  }, [backend, uid]);

  const closePoll = useCallback((message, closed = true) => backend.updateMessage(message, {
    poll: { ...message.poll, closed, closedAt: closed ? Date.now() : 0 },
  }), [backend]);

  // ── Forwarding ────────────────────────────────────────────────────────────
  /** Shares `message` into each target conversation with an optional (encoded) comment. */
  const forwardMessage = useCallback(async (message, targetChannelIds, comment = "") => {
    const source = stateRef.current.channelsById[message.channelId];
    const smallAttachments = (message.attachments || []).filter((file) => file.url || (file.size || 0) < 150 * 1024).slice(0, 4);
    const forwarded = {
      channelId: message.channelId,
      channelName: source ? (source.type === CHANNEL_TYPES.DM ? "" : source.name) : "",
      channelIsDm: source?.type === CHANNEL_TYPES.DM,
      messageId: message.id,
      threadRootId: message.sharedFromThread ? null : message.threadRootId || null,
      authorId: message.authorId,
      text: message.text,
      createdAt: message.createdAt,
      attachments: smallAttachments,
    };
    await Promise.all((targetChannelIds || []).map((channelId) => sendMessage({
      channelId,
      text: comment,
      extra: { forwarded },
    })));
  }, [sendMessage]);

  // ── Scheduled messages ────────────────────────────────────────────────────
  const scheduleMessage = useCallback(({ channelId, text, at, threadRootId = null }) => {
    const id = createChatId("sch");
    return updateUserState({
      scheduled: { [id]: { id, channelId, threadRootId, text, at, createdAt: Date.now() } },
    }).then(() => id);
  }, [updateUserState]);

  const updateScheduled = useCallback((id, patch) => updateUserState({ scheduled: { [id]: patch } }), [updateUserState]);
  const cancelScheduled = useCallback((id) => updateUserState({ scheduled: { [id]: null } }), [updateUserState]);

  const deliverScheduled = useCallback(async (entry) => {
    const channel = stateRef.current.channelsById[entry.channelId];
    if (!channel) throw new Error("The conversation is no longer available.");
    let rootMessage = null;
    if (entry.threadRootId) {
      rootMessage = await backend.fetchMessage(entry.channelId, entry.threadRootId);
      if (!rootMessage) throw new Error("The thread was deleted.");
    }
    return sendMessage({ channelId: entry.channelId, text: entry.text, rootMessage, extra: { scheduledFrom: entry.createdAt || Date.now() } });
  }, [backend, sendMessage]);

  const sendScheduledNow = useCallback(async (id) => {
    const entry = stateRef.current.userState?.scheduled?.[id];
    if (!entry) return;
    await updateUserState({ scheduled: { [id]: null } });
    await deliverScheduled(entry);
  }, [deliverScheduled, updateUserState]);

  // ── Reminders ─────────────────────────────────────────────────────────────
  const addReminder = useCallback(({ at, text = "", message = null }) => {
    const id = createChatId("rem");
    const { usersById } = directoryRef.current;
    const entry = {
      id,
      at,
      text: String(text || "").slice(0, 300),
      createdAt: Date.now(),
      done: false,
      notifiedAt: 0,
    };
    if (message) {
      Object.assign(entry, {
        channelId: message.channelId,
        messageId: message.id,
        threadRootId: message.sharedFromThread ? null : message.threadRootId || null,
        authorId: message.authorId,
        preview: buildPreview(message.text, message.attachments, { usersById, channelsById: stateRef.current.channelsById }),
      });
    }
    return updateUserState({ reminders: { [id]: entry } }).then(() => id);
  }, [updateUserState]);

  const completeReminder = useCallback((id, done = true) => updateUserState({
    reminders: { [id]: { done, completedAt: done ? Date.now() : 0 } },
  }), [updateUserState]);

  const snoozeReminder = useCallback((id, at) => updateUserState({
    reminders: { [id]: { at, notifiedAt: 0, done: false } },
  }), [updateUserState]);

  const deleteReminder = useCallback((id) => updateUserState({ reminders: { [id]: null } }), [updateUserState]);

  const notifyReminder = useCallback((reminder) => {
    pushIncoming({
      id: `reminder-${reminder.id}-${reminder.at}`,
      kind: INBOX_KINDS.REMINDER,
      channelId: reminder.channelId || null,
      messageId: reminder.messageId || null,
      threadRootId: reminder.threadRootId || null,
      authorId: reminder.authorId || uid,
      title: "⏰ Reminder",
      body: reminder.text || reminder.preview || "You asked to be reminded about this.",
      reminderId: reminder.id,
    });
  }, [pushIncoming, uid]);

  // ── Notification levels, keywords, sidebar ───────────────────────────────
  const setNotifyLevel = useCallback((channelId, level) => updateUserState({
    notify: { [channelId]: level || null },
  }), [updateUserState]);

  const setKeywords = useCallback((keywords) => updateUserState({ prefs: { keywords: normalizeKeywords(keywords) } }), [updateUserState]);

  /** Replaces the sidebar layout; keys removed from placement/order are deleted. */
  const updateSidebar = useCallback((next) => {
    const current = stateRef.current.userState?.sidebar || {};
    const withDeletes = (before, after) => {
      const patch = { ...(after || {}) };
      Object.keys(before || {}).forEach((key) => { if (!(key in patch)) patch[key] = null; });
      return patch;
    };
    return updateUserState({
      sidebar: {
        sections: next.sections || [],
        placement: withDeletes(current.placement, next.placement),
        order: withDeletes(current.order, next.order),
      },
    });
  }, [updateUserState]);

  // ── Task discussions (thread per task in the project channel) ────────────
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const ensureTaskThread = useCallback(async (task, { fallbackProjectId = null } = {}) => {
    if (!task?.id || !uid) throw new Error("Task is not available.");
    const projectId = task.projectId || fallbackProjectId || currentProjectId;
    const project = (projectsRef.current || []).find((entry) => entry.id === projectId);
    if (!project) throw new Error("The task's project could not be found.");
    const channelId = projectChannelId(project.id);
    if (!stateRef.current.channelsById[channelId]) {
      await ensureProjectChannelRef.current?.(project);
    }
    const { usersById } = directoryRef.current;
    const byUsername = new Map(Object.values(usersById).map((person) => [String(person.username || "").toLowerCase(), person.id]));
    const participants = [task.assignedTo, task.reporter, ...(task.watchers || [])]
      .map((name) => byUsername.get(String(name || "").toLowerCase()))
      .filter(Boolean);
    const rootId = `task-${String(task.id).replace(/[^\w.-]/g, "_")}`;
    const root = await backend.ensureMessage({
      id: rootId,
      channelId,
      authorId: uid,
      text: "",
      createdAt: Date.now(),
      system: { type: "task_thread", taskId: task.id, title: task.title || "" },
      taskId: task.id,
      reactions: {},
      replyCount: 0,
      threadParticipantIds: [...new Set(participants)],
      attachments: [],
      mentions: [],
      linkedTasks: [],
      pinned: false,
    });
    return { channelId, rootId, root };
  }, [backend, currentProjectId, uid]);

  // ── Workspace settings: custom emoji, integrations, retention, export ────
  const updateWorkspaceSettings = useCallback(async (patch, auditAction = null) => {
    await backend.updateWorkspace(patch);
    if (auditAction) audit(auditAction, { severity: "info" });
  }, [audit, backend]);

  const addCustomEmoji = useCallback(async (name, dataUrl) => {
    await backend.updateWorkspace({ customEmoji: { [name]: { dataUrl, createdBy: uid, createdAt: Date.now() } } });
    audit("chat custom emoji added", { severity: "info", emoji: name });
  }, [audit, backend, uid]);

  const removeCustomEmoji = useCallback(async (name) => {
    await backend.updateWorkspace({ customEmoji: { [name]: null } });
    audit("chat custom emoji removed", { severity: "info", emoji: name });
  }, [audit, backend]);

  const runRetentionNow = useCallback(async () => {
    const results = await runRetentionCleanup({
      backend,
      channels: Object.values(stateRef.current.channelsById),
      workspace: stateRef.current.workspace,
    });
    const removed = results.reduce((sum, entry) => sum + entry.removed, 0);
    await backend.updateWorkspace({ retention: { lastRunAt: Date.now(), lastRunBy: uid, lastRemoved: removed, lastRunFinishedAt: Date.now() } });
    audit("chat retention cleanup", { severity: "warning", removed, manual: true });
    return { removed, results };
  }, [audit, backend, uid]);

  const fetchChannelHistory = useCallback(async (channelId, { reason = "export" } = {}) => {
    const messages = await backend.fetchAllMessages(channelId, { includeReplies: true });
    const channel = stateRef.current.channelsById[channelId];
    if (reason === "export") audit("chat channel exported", { severity: "info", channelId, channelName: channel?.name || "", count: messages.length });
    return messages;
  }, [audit, backend]);

  // ── Background jobs ───────────────────────────────────────────────────────
  const { ensureProjectChannel } = useProjectChannels({
    backend,
    enabled: chatEnabled,
    uid,
    channelsRaw,
    projects,
    users,
    userState,
  });
  const ensureProjectChannelRef = useRef(ensureProjectChannel);
  ensureProjectChannelRef.current = ensureProjectChannel;

  useChatBot({
    enabled: chatEnabled,
    getChannel: (id) => stateRef.current.channelsById[id] || null,
    sendSystemMessage: (channelId, system) => { sendMessage({ channelId, text: "", system }).catch(() => {}); },
  });

  useChatScheduler({
    enabled: chatEnabled && userState !== null,
    userState,
    updateUserState,
    deliverScheduled,
    notifyReminder,
  });

  useRetentionJob({
    backend,
    enabled: chatEnabled,
    isAdmin: Boolean(isAdmin),
    uid,
    channels,
    workspace,
    onComplete: ({ removed }) => audit("chat retention cleanup", { severity: "warning", removed, manual: false }),
  });

  // ── Context values ────────────────────────────────────────────────────────
  const permissions = useMemo(() => ({
    canManageChannels: canPerform("chat:manage"),
    isWorkspaceAdmin: Boolean(isAdmin),
  }), [canPerform, isAdmin]);

  const later = useMemo(() => {
    const now = Date.now();
    const reminders = Object.values(userState?.reminders || {});
    return {
      overdueReminders: reminders.filter((entry) => !entry.done && Number(entry.at) <= now).length,
      openReminders: reminders.filter((entry) => !entry.done).length,
      scheduled: Object.keys(userState?.scheduled || {}).length,
    };
  }, [userState?.reminders, userState?.scheduled]);

  const data = useMemo(() => ({
    enabled: chatEnabled,
    workspace,
    customEmoji: workspace?.customEmoji || EMPTY_OBJECT,
    later,
    ready: chatEnabled && channelsRaw !== null && userState !== null,
    error,
    uid,
    usersById: directory.usersById,
    activeUsers: directory.activeUsers,
    channels,
    channelsById,
    userState: userState || EMPTY_OBJECT,
    inbox,
    presence,
    pending,
    incoming,
    unread,
    permissions,
    backend,
    getChannelName: (channel) => getChannelDisplayName(channel, uid, directory.usersById),
    isChannelAdmin: (channel) => isChannelAdmin(channel, uid, permissions.isWorkspaceAdmin),
  }), [backend, channels, channelsById, channelsRaw, chatEnabled, directory, error, inbox, incoming, later, pending, permissions, presence, uid, unread, userState, workspace]);

  const actions = useMemo(() => ({
    setActiveConversation,
    dismissIncoming,
    sendMessage,
    retryMessage,
    discardPending,
    editMessage,
    deleteMessage,
    toggleReaction,
    togglePin,
    linkTaskToMessage,
    createChannel,
    updateChannel,
    deleteChannel,
    joinChannel,
    leaveChannel,
    addMembers,
    removeMember,
    openDirectMessage,
    markChannelRead,
    markUnreadFrom,
    markThreadRead,
    markInboxRead,
    markAllRead,
    toggleStar,
    toggleMute,
    hideDirectMessage,
    toggleSaved,
    updatePrefs,
    updateUserState,
    setMyPresence,
    setCustomStatus,
    setTyping,
    searchMessages,
    invalidateSearchCache,
    setPreviewResolver,
    updateMessageFields,
    votePoll,
    closePoll,
    forwardMessage,
    scheduleMessage,
    updateScheduled,
    cancelScheduled,
    sendScheduledNow,
    addReminder,
    completeReminder,
    snoozeReminder,
    deleteReminder,
    setNotifyLevel,
    setKeywords,
    updateSidebar,
    ensureTaskThread,
    ensureProjectChannel,
    updateWorkspaceSettings,
    addCustomEmoji,
    removeCustomEmoji,
    runRetentionNow,
    fetchChannelHistory,
  }), [
    setPreviewResolver, updateMessageFields, votePoll, closePoll, forwardMessage, scheduleMessage, updateScheduled, cancelScheduled,
    sendScheduledNow, addReminder, completeReminder, snoozeReminder, deleteReminder, setNotifyLevel, setKeywords,
    updateSidebar, ensureTaskThread, ensureProjectChannel, updateWorkspaceSettings, addCustomEmoji, removeCustomEmoji,
    runRetentionNow, fetchChannelHistory,
    addMembers, createChannel, deleteChannel, deleteMessage, discardPending, dismissIncoming, editMessage, hideDirectMessage,
    invalidateSearchCache, joinChannel, leaveChannel, linkTaskToMessage, markAllRead, markChannelRead, markInboxRead,
    markThreadRead, markUnreadFrom, openDirectMessage, removeMember, retryMessage, searchMessages, sendMessage,
    setActiveConversation, setCustomStatus, setMyPresence, setTyping, toggleMute, togglePin, toggleReaction, toggleSaved,
    toggleStar, updateChannel, updatePrefs, updateUserState,
  ]);

  return (
    <ChatActionsContext.Provider value={actions}>
      <ChatDataContext.Provider value={data}>
        <ChatUnreadContext.Provider value={unread}>
          {children}
        </ChatUnreadContext.Provider>
      </ChatDataContext.Provider>
    </ChatActionsContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatDataContext);
}

export function useChatActions() {
  return useContext(ChatActionsContext);
}

/** Safe outside the provider (returns zeros), used by the app sidebar. */
export function useChatUnread() {
  return useContext(ChatUnreadContext) || EMPTY_UNREAD;
}
