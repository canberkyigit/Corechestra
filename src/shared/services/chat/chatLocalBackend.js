import { readE2EJson, subscribeE2EKey, writeE2EJson } from "../../e2e/testMode";
import { applyStatePatch, HUDDLE_STALE_MS, INBOX_LIMIT, normalizeChannel, normalizeMessage, sortByCreatedAt } from "./chatModel";

/*
 * localStorage chat backend used when Firebase is not initialised (E2E mode,
 * unit tests). It mirrors the Firestore backend's API and semantics so the
 * provider and UI run unchanged; changes propagate across tabs through the
 * shared E2E sync channel.
 */

export const E2E_CHAT_KEY = "corechestra_e2e_chat";

function emptyStore() {
  return {
    channels: {}, messages: {}, replies: {}, userState: {}, inbox: {}, presence: {}, typing: {}, huddles: {}, signals: {}, workspace: {},
  };
}

function threadKey(channelId, rootId) {
  return `${channelId}/${rootId}`;
}

export function createLocalChatBackend({ storageKey = E2E_CHAT_KEY } = {}) {
  const listeners = new Set();
  let memory = null;

  const read = () => {
    const stored = readE2EJson(storageKey, null);
    memory = { ...emptyStore(), ...(stored || memory || {}) };
    return memory;
  };

  const notify = () => {
    const snapshot = read();
    listeners.forEach((listener) => listener(snapshot));
  };

  const write = (mutator) => {
    const draft = JSON.parse(JSON.stringify(read()));
    const result = mutator(draft);
    memory = draft;
    writeE2EJson(storageKey, draft);
    notify();
    return result;
  };

  let crossTabUnsub = null;
  const listen = (listener) => {
    listeners.add(listener);
    if (!crossTabUnsub) crossTabUnsub = subscribeE2EKey(storageKey, () => notify());
    listener(read());
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && crossTabUnsub) {
        crossTabUnsub();
        crossTabUnsub = null;
      }
    };
  };

  // Only call back when the derived value actually changed (like onSnapshot).
  const derived = (select, onChange) => {
    let last;
    return listen((state) => {
      const value = select(state);
      const serialized = JSON.stringify(value);
      if (serialized === last) return;
      last = serialized;
      onChange(JSON.parse(serialized));
    });
  };

  const listMessages = (state, channelId) => Object.values(state.messages[channelId] || {})
    .map((entry) => normalizeMessage(entry, entry.id, channelId));

  const locate = (draft, message) => {
    if (message.threadRootId && !message.sharedFromThread) {
      return draft.replies[threadKey(message.channelId, message.threadRootId)] || null;
    }
    return draft.messages[message.channelId] || null;
  };

  return {
    kind: "local",

    subscribeChannels(uid, onChange) {
      return derived((state) => Object.values(state.channels)
        .map((entry) => normalizeChannel(entry, entry.id))
        .filter((channel) => !channel.isPrivate || channel.memberIds.includes(uid)), onChange);
    },

    subscribeMessages(channelId, pageSize, onChange) {
      return derived((state) => {
        const all = sortByCreatedAt(listMessages(state, channelId));
        return { list: all.slice(-pageSize), hasMore: all.length > pageSize };
      }, (value) => onChange(value.list, { hasMore: value.hasMore }));
    },

    subscribeMessage(channelId, messageId, onChange) {
      return derived((state) => {
        const entry = state.messages[channelId]?.[messageId];
        return entry ? normalizeMessage(entry, messageId, channelId) : null;
      }, onChange);
    },

    subscribeThread(channelId, rootId, onChange) {
      return derived((state) => sortByCreatedAt(
        Object.values(state.replies[threadKey(channelId, rootId)] || {})
          .map((entry) => normalizeMessage(entry, entry.id, channelId))
      ), onChange);
    },

    subscribePinned(channelId, onChange) {
      return derived((state) => sortByCreatedAt(listMessages(state, channelId).filter((message) => message.pinned), "desc"), onChange);
    },

    subscribeUserState(uid, onChange) {
      return derived((state) => state.userState[uid] || {}, onChange);
    },

    subscribeInbox(uid, onChange) {
      return derived((state) => sortByCreatedAt(Object.values(state.inbox[uid] || {}), "desc").slice(0, INBOX_LIMIT), onChange);
    },

    subscribePresence(onChange) {
      return derived((state) => state.presence || {}, onChange);
    },

    subscribeTyping(channelId, onChange) {
      return derived((state) => state.typing[channelId] || {}, onChange);
    },

    async ensureChannel(channel) {
      return write((draft) => {
        if (!draft.channels[channel.id]) draft.channels[channel.id] = channel;
        return normalizeChannel(draft.channels[channel.id], channel.id);
      });
    },

    async createChannel(channel) {
      return write((draft) => {
        draft.channels[channel.id] = channel;
        return normalizeChannel(channel, channel.id);
      });
    },

    async updateChannel(channelId, patch) {
      write((draft) => {
        if (!draft.channels[channelId]) throw new Error("This conversation no longer exists.");
        draft.channels[channelId] = { ...draft.channels[channelId], ...patch };
      });
    },

    async addChannelMembers(channelId, uids, at) {
      write((draft) => {
        const channel = draft.channels[channelId];
        if (!channel) throw new Error("This conversation no longer exists.");
        channel.memberIds = [...new Set([...(channel.memberIds || []), ...uids])];
        channel.updatedAt = at;
      });
    },

    async removeChannelMember(channelId, uid, at) {
      write((draft) => {
        const channel = draft.channels[channelId];
        if (!channel) return;
        channel.memberIds = (channel.memberIds || []).filter((id) => id !== uid);
        channel.adminIds = (channel.adminIds || []).filter((id) => id !== uid);
        channel.updatedAt = at;
      });
    },

    async deleteChannel(channelId) {
      write((draft) => {
        delete draft.channels[channelId];
        delete draft.messages[channelId];
        delete draft.typing[channelId];
        Object.keys(draft.replies).forEach((key) => {
          if (key.startsWith(`${channelId}/`)) delete draft.replies[key];
        });
      });
    },

    async postMessage({ message, preview, inboxTargets = [], alsoToChannel = false }) {
      return write((draft) => {
        const { channelId } = message;
        const channel = draft.channels[channelId];
        if (!channel) throw new Error("This conversation no longer exists.");
        const isReply = Boolean(message.threadRootId);
        const now = message.createdAt;
        let written = message;
        let seqChanged = false;

        const writeTopLevel = (entry) => {
          if (entry.system) {
            const stored = { ...entry, seq: Number(channel.seq) || 0 };
            draft.messages[channelId] = { ...(draft.messages[channelId] || {}), [entry.id]: stored };
            return stored;
          }
          channel.seq = (Number(channel.seq) || 0) + 1;
          const stored = { ...entry, seq: channel.seq };
          draft.messages[channelId] = { ...(draft.messages[channelId] || {}), [entry.id]: stored };
          channel.lastMessageAt = now;
          channel.lastMessage = { id: entry.id, authorId: entry.authorId, preview: preview || "", at: now };
          seqChanged = true;
          return stored;
        };

        if (isReply) {
          const root = draft.messages[channelId]?.[message.threadRootId];
          if (!root) throw new Error("The original message was deleted.");
          const key = threadKey(channelId, message.threadRootId);
          draft.replies[key] = { ...(draft.replies[key] || {}), [message.id]: message };
          root.replyCount = (Number(root.replyCount) || 0) + 1;
          root.lastReplyAt = now;
          root.threadParticipantIds = [...new Set([...(root.threadParticipantIds || []), message.authorId])];
          if (alsoToChannel) writeTopLevel({ ...message, id: `${message.id}-ch`, sharedFromThread: true });
        } else {
          written = writeTopLevel(message);
        }
        channel.updatedAt = now;

        const authorPatch = {};
        if (seqChanged) {
          authorPatch.readSeq = { [channelId]: channel.seq };
          authorPatch.lastReadAt = { [channelId]: now };
        }
        if (isReply) authorPatch.threadReadAt = { [message.threadRootId]: now };
        draft.userState[message.authorId] = applyStatePatch(draft.userState[message.authorId], authorPatch);

        inboxTargets.forEach((target) => {
          draft.inbox[target.uid] = {
            ...(draft.inbox[target.uid] || {}),
            [message.id]: {
              id: message.id,
              kind: target.kind,
              channelId,
              messageId: message.id,
              threadRootId: message.threadRootId || null,
              authorId: message.authorId,
              preview: preview || "",
              createdAt: now,
              read: false,
            },
          };
        });
        return written;
      });
    },

    async updateMessage(message, patch) {
      write((draft) => {
        const bucket = locate(draft, message);
        if (!bucket?.[message.id]) throw new Error("This message no longer exists.");
        bucket[message.id] = { ...bucket[message.id], ...patch };
      });
    },

    async deleteMessage(message, { soft = false } = {}) {
      write((draft) => {
        const bucket = locate(draft, message);
        if (!bucket?.[message.id]) return;
        if (soft) {
          bucket[message.id] = {
            ...bucket[message.id], deleted: true, text: "", attachments: [], reactions: {}, linkedTasks: [], pinned: false,
          };
          return;
        }
        delete bucket[message.id];
        if (message.threadRootId && !message.sharedFromThread) {
          const root = draft.messages[message.channelId]?.[message.threadRootId];
          if (root) root.replyCount = Math.max(0, (Number(root.replyCount) || 0) - 1);
        }
      });
    },

    async toggleReaction(message, key, uid, add) {
      write((draft) => {
        const bucket = locate(draft, message);
        const entry = bucket?.[message.id];
        if (!entry) throw new Error("This message no longer exists.");
        const reactions = { ...(entry.reactions || {}) };
        const list = new Set(reactions[key] || []);
        if (add) list.add(uid); else list.delete(uid);
        reactions[key] = [...list];
        entry.reactions = reactions;
      });
    },

    async updateUserState(uid, patch) {
      write((draft) => {
        draft.userState[uid] = applyStatePatch(draft.userState[uid], patch);
      });
    },

    async markInboxRead(uid, ids) {
      write((draft) => {
        const inbox = draft.inbox[uid] || {};
        ids.forEach((id) => { if (inbox[id]) inbox[id].read = true; });
        draft.inbox[uid] = inbox;
      });
    },

    async setPresence(uid, patch) {
      write((draft) => {
        draft.presence[uid] = applyStatePatch(draft.presence[uid], patch);
      });
    },

    async setTyping(channelId, uid, at) {
      write((draft) => {
        draft.typing[channelId] = applyStatePatch(draft.typing[channelId], { [uid]: at || null });
      });
    },

    async fetchRecentMessages(channelId, count) {
      return sortByCreatedAt(listMessages(read(), channelId), "desc").slice(0, count);
    },

    async fetchMessage(channelId, messageId, threadRootId = null) {
      const state = read();
      const entry = threadRootId
        ? state.replies[threadKey(channelId, threadRootId)]?.[messageId]
        : state.messages[channelId]?.[messageId];
      return entry ? normalizeMessage(entry, messageId, channelId) : null;
    },

    async ensureMessage(message) {
      return write((draft) => {
        const bucket = { ...(draft.messages[message.channelId] || {}) };
        if (!bucket[message.id]) bucket[message.id] = message;
        draft.messages[message.channelId] = bucket;
        return normalizeMessage(bucket[message.id], message.id, message.channelId);
      });
    },

    async updatePollVotes(message, { add = [], remove = [] }, uid) {
      write((draft) => {
        const entry = locate(draft, message)?.[message.id];
        if (!entry) throw new Error("This message no longer exists.");
        const votes = { ...(entry.pollVotes || {}) };
        remove.forEach((optionId) => { votes[optionId] = (votes[optionId] || []).filter((id) => id !== uid); });
        add.forEach((optionId) => { votes[optionId] = [...new Set([...(votes[optionId] || []), uid])]; });
        entry.pollVotes = votes;
      });
    },

    subscribeHuddles(onChange) {
      return derived((state) => Object.fromEntries(
        Object.entries(state.huddles || {}).filter(([, huddle]) => huddle?.active).map(([id, huddle]) => [id, { ...huddle, channelId: id }])
      ), onChange);
    },

    async joinHuddle(channelId, uid, entry, { roomId, now }) {
      return write((draft) => {
        const current = draft.huddles[channelId];
        const live = current?.active && Object.values(current.participants || {}).some((participant) => now - (Number(participant?.lastSeen) || 0) < HUDDLE_STALE_MS);
        if (!live) {
          const huddle = { channelId, active: true, roomId, startedBy: uid, startedAt: now, endedAt: 0, participants: { [uid]: entry } };
          draft.huddles[channelId] = huddle;
          return { huddle, started: true };
        }
        current.participants = { ...(current.participants || {}), [uid]: entry };
        return { huddle: current, started: false };
      });
    },

    async updateHuddleParticipant(channelId, uid, patch) {
      write((draft) => {
        const huddle = draft.huddles[channelId];
        if (!huddle?.participants?.[uid]) return;
        huddle.participants[uid] = applyStatePatch(huddle.participants[uid], patch);
      });
    },

    async leaveHuddle(channelId, uid, now) {
      return write((draft) => {
        const huddle = draft.huddles[channelId];
        if (!huddle) return { ended: false, huddle: null };
        const participants = { ...(huddle.participants || {}) };
        delete participants[uid];
        const remaining = Object.values(participants).filter((participant) => now - (Number(participant?.lastSeen) || 0) < HUDDLE_STALE_MS);
        if (!remaining.length && huddle.active) {
          draft.huddles[channelId] = { ...huddle, active: false, endedAt: now, participants: {} };
          delete draft.signals[channelId];
          return { ended: true, huddle: draft.huddles[channelId] };
        }
        huddle.participants = participants;
        return { ended: false, huddle };
      });
    },

    async sendSignal(channelId, signal) {
      write((draft) => {
        const id = `sig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        draft.signals[channelId] = { ...(draft.signals[channelId] || {}), [id]: { ...signal, id } };
      });
    },

    subscribeSignals(channelId, uid, onChange) {
      return derived((state) => Object.values(state.signals?.[channelId] || {}).filter((signal) => signal.to === uid), onChange);
    },

    async deleteSignals(channelId, ids) {
      write((draft) => {
        const bucket = { ...(draft.signals[channelId] || {}) };
        ids.forEach((id) => { delete bucket[id]; });
        draft.signals[channelId] = bucket;
      });
    },

    subscribeWorkspace(onChange) {
      return derived((state) => state.workspace || {}, onChange);
    },

    async updateWorkspace(patch) {
      write((draft) => {
        draft.workspace = applyStatePatch(draft.workspace, patch);
      });
    },

    async deleteMessagesBefore(channelId, cutoff) {
      return write((draft) => {
        const bucket = { ...(draft.messages[channelId] || {}) };
        let removed = 0;
        Object.values(bucket).forEach((entry) => {
          if ((Number(entry.createdAt) || 0) >= cutoff) return;
          delete bucket[entry.id];
          delete draft.replies[threadKey(channelId, entry.id)];
          removed += 1;
        });
        draft.messages[channelId] = bucket;
        return removed;
      });
    },

    async fetchAllMessages(channelId, { includeReplies = true } = {}) {
      const state = read();
      const messages = sortByCreatedAt(listMessages(state, channelId));
      if (!includeReplies) return messages;
      return messages.map((message) => ({
        ...message,
        replies: sortByCreatedAt(Object.values(state.replies[threadKey(channelId, message.id)] || {})
          .map((entry) => normalizeMessage(entry, entry.id, channelId))),
      }));
    },
  };
}
