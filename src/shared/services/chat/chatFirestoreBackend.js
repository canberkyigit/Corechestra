import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  increment,
  limit as limitTo,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  addDoc,
} from "firebase/firestore";
import { HUDDLE_STALE_MS, normalizeChannel, normalizeMessage, sortByCreatedAt, INBOX_LIMIT } from "./chatModel";

/*
 * Firestore layout (chat is high-frequency, per-message data, so it lives in
 * its own collections instead of the debounced appData domain documents):
 *
 *   chatChannels/{channelId}                                  channel or DM
 *   chatChannels/{channelId}/messages/{messageId}             top-level messages
 *   chatChannels/{channelId}/messages/{rootId}/replies/{id}   thread replies
 *   chatUserState/{uid}                                       read markers, stars, mutes, saved items, prefs
 *   chatInbox/{uid}/items/{messageId}                         mentions + thread replies for that user
 *   chatPresence/{uid}                                        heartbeat + custom status
 *   chatTyping/{channelId}                                    { [uid]: lastTypedAt }
 *   chatHuddles/{channelId}                                   live huddle (participants, heartbeat)
 *   chatHuddles/{channelId}/signals/{id}                      WebRTC signalling addressed to one user
 *   chatWorkspace/settings                                    custom emoji, retention, integrations
 *
 * Every query is single-field (orderBy createdAt / array-contains / ==), so
 * no composite index has to be deployed.
 */

export const CHAT_COLLECTIONS = {
  channels: "chatChannels",
  userState: "chatUserState",
  inbox: "chatInbox",
  presence: "chatPresence",
  typing: "chatTyping",
  huddles: "chatHuddles",
  workspace: "chatWorkspace",
};

const WORKSPACE_DOC = "settings";

/** Firestore rejects `undefined`; drop it recursively (arrays included). */
export function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)])
    );
  }
  return value;
}

/** Converts `null` leaves to deleteField() for set(..., { merge: true }). */
function toMergePatch(patch) {
  return Object.fromEntries(Object.entries(patch || {}).map(([key, value]) => {
    if (value === null || value === undefined) return [key, deleteField()];
    if (value && typeof value === "object" && !Array.isArray(value) && value.constructor === Object) {
      return [key, toMergePatch(value)];
    }
    return [key, value];
  }));
}

export function createFirestoreChatBackend(db) {
  const channelsCol = () => collection(db, CHAT_COLLECTIONS.channels);
  const channelRef = (channelId) => doc(db, CHAT_COLLECTIONS.channels, channelId);
  const messagesCol = (channelId) => collection(db, CHAT_COLLECTIONS.channels, channelId, "messages");
  const messageRef = (channelId, messageId) => doc(db, CHAT_COLLECTIONS.channels, channelId, "messages", messageId);
  const repliesCol = (channelId, rootId) => collection(db, CHAT_COLLECTIONS.channels, channelId, "messages", rootId, "replies");
  const replyRef = (channelId, rootId, replyId) => doc(db, CHAT_COLLECTIONS.channels, channelId, "messages", rootId, "replies", replyId);
  const refForMessage = (message) => (
    message.threadRootId && !message.sharedFromThread
      ? replyRef(message.channelId, message.threadRootId, message.id)
      : messageRef(message.channelId, message.id)
  );
  const userStateRef = (uid) => doc(db, CHAT_COLLECTIONS.userState, uid);
  const inboxCol = (uid) => collection(db, CHAT_COLLECTIONS.inbox, uid, "items");
  const presenceRef = (uid) => doc(db, CHAT_COLLECTIONS.presence, uid);
  const typingRef = (channelId) => doc(db, CHAT_COLLECTIONS.typing, channelId);
  const huddleRef = (channelId) => doc(db, CHAT_COLLECTIONS.huddles, channelId);
  const signalsCol = (channelId) => collection(db, CHAT_COLLECTIONS.huddles, channelId, "signals");
  const workspaceRef = () => doc(db, CHAT_COLLECTIONS.workspace, WORKSPACE_DOC);

  const deleteRefs = async (refs) => {
    for (let index = 0; index < refs.length; index += 450) {
      const batch = writeBatch(db);
      refs.slice(index, index + 450).forEach((ref) => batch.delete(ref));
      // eslint-disable-next-line no-await-in-loop
      await batch.commit();
    }
  };

  const mapMessages = (snapshot, channelId) => snapshot.docs.map((entry) => normalizeMessage(entry.data(), entry.id, channelId));

  return {
    kind: "firestore",

    subscribeChannels(uid, onChange, onError) {
      // Joined channels, private channels and DMs + every public channel (browsable).
      const buckets = { mine: null, open: null };
      const emit = () => {
        if (!buckets.mine || !buckets.open) return;
        const merged = new Map();
        [...buckets.open, ...buckets.mine].forEach((channel) => merged.set(channel.id, channel));
        onChange([...merged.values()]);
      };
      const toChannels = (snapshot) => snapshot.docs.map((entry) => normalizeChannel(entry.data(), entry.id));
      const unsubMine = onSnapshot(
        query(channelsCol(), where("memberIds", "array-contains", uid)),
        (snapshot) => { buckets.mine = toChannels(snapshot); emit(); },
        onError
      );
      const unsubOpen = onSnapshot(
        query(channelsCol(), where("isPrivate", "==", false)),
        (snapshot) => { buckets.open = toChannels(snapshot); emit(); },
        onError
      );
      return () => { unsubMine(); unsubOpen(); };
    },

    subscribeMessages(channelId, pageSize, onChange, onError) {
      return onSnapshot(
        query(messagesCol(channelId), orderBy("createdAt", "desc"), limitTo(pageSize)),
        (snapshot) => onChange(sortByCreatedAt(mapMessages(snapshot, channelId)), { hasMore: snapshot.size >= pageSize }),
        onError
      );
    },

    subscribeMessage(channelId, messageId, onChange, onError) {
      return onSnapshot(
        messageRef(channelId, messageId),
        (snapshot) => onChange(snapshot.exists() ? normalizeMessage(snapshot.data(), snapshot.id, channelId) : null),
        onError
      );
    },

    subscribeThread(channelId, rootId, onChange, onError) {
      return onSnapshot(
        query(repliesCol(channelId, rootId), orderBy("createdAt", "asc")),
        (snapshot) => onChange(mapMessages(snapshot, channelId)),
        onError
      );
    },

    subscribePinned(channelId, onChange, onError) {
      return onSnapshot(
        query(messagesCol(channelId), where("pinned", "==", true)),
        (snapshot) => onChange(sortByCreatedAt(mapMessages(snapshot, channelId), "desc")),
        onError
      );
    },

    subscribeUserState(uid, onChange, onError) {
      return onSnapshot(userStateRef(uid), (snapshot) => onChange(snapshot.exists() ? snapshot.data() : {}), onError);
    },

    subscribeInbox(uid, onChange, onError) {
      return onSnapshot(
        query(inboxCol(uid), orderBy("createdAt", "desc"), limitTo(INBOX_LIMIT)),
        (snapshot) => onChange(snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))),
        onError
      );
    },

    subscribePresence(onChange, onError) {
      return onSnapshot(
        collection(db, CHAT_COLLECTIONS.presence),
        (snapshot) => {
          const byId = {};
          snapshot.docs.forEach((entry) => { byId[entry.id] = entry.data(); });
          onChange(byId);
        },
        onError
      );
    },

    subscribeTyping(channelId, onChange, onError) {
      return onSnapshot(typingRef(channelId), (snapshot) => onChange(snapshot.exists() ? snapshot.data() : {}), onError);
    },

    async ensureChannel(channel) {
      const ref = channelRef(channel.id);
      return runTransaction(db, async (tx) => {
        const snapshot = await tx.get(ref);
        if (snapshot.exists()) return normalizeChannel(snapshot.data(), snapshot.id);
        tx.set(ref, stripUndefined(channel));
        return normalizeChannel(channel, channel.id);
      });
    },

    async createChannel(channel) {
      await setDoc(channelRef(channel.id), stripUndefined(channel));
      return normalizeChannel(channel, channel.id);
    },

    async updateChannel(channelId, patch) {
      await updateDoc(channelRef(channelId), stripUndefined(patch));
    },

    async addChannelMembers(channelId, uids, at) {
      await updateDoc(channelRef(channelId), { memberIds: arrayUnion(...uids), updatedAt: at });
    },

    async removeChannelMember(channelId, uid, at) {
      await updateDoc(channelRef(channelId), { memberIds: arrayRemove(uid), adminIds: arrayRemove(uid), updatedAt: at });
    },

    async deleteChannel(channelId) {
      const topLevel = await getDocs(messagesCol(channelId));
      const refs = [];
      for (const entry of topLevel.docs) {
        if ((Number(entry.data()?.replyCount) || 0) > 0) {
          // eslint-disable-next-line no-await-in-loop
          const replies = await getDocs(repliesCol(channelId, entry.id));
          replies.docs.forEach((reply) => refs.push(reply.ref));
        }
        refs.push(entry.ref);
      }
      for (let index = 0; index < refs.length; index += 450) {
        const batch = writeBatch(db);
        refs.slice(index, index + 450).forEach((ref) => batch.delete(ref));
        // eslint-disable-next-line no-await-in-loop
        await batch.commit();
      }
      await deleteDoc(typingRef(channelId)).catch(() => {});
      await deleteDoc(channelRef(channelId));
    },

    /**
     * Writes a message atomically with the channel sequence number, the
     * author's read marker and the recipients' inbox entries.
     * `message.threadRootId` makes it a thread reply; `alsoToChannel` mirrors
     * the reply into the channel timeline.
     */
    async postMessage({ message, preview, inboxTargets = [], alsoToChannel = false }) {
      const { channelId } = message;
      const isReply = Boolean(message.threadRootId);
      const cRef = channelRef(channelId);
      return runTransaction(db, async (tx) => {
        const channelSnap = await tx.get(cRef);
        if (!channelSnap.exists()) throw new Error("This conversation no longer exists.");
        let rootRefValue = null;
        if (isReply) {
          rootRefValue = messageRef(channelId, message.threadRootId);
          const rootSnap = await tx.get(rootRefValue);
          if (!rootSnap.exists()) throw new Error("The original message was deleted.");
        }

        const now = message.createdAt;
        let seq = Number(channelSnap.data()?.seq) || 0;
        const channelPatch = { updatedAt: now };
        let written = message;

        // System events (joined, renamed, …) never count as unread.
        const writeTopLevel = (entry) => {
          if (entry.system) {
            const stored = stripUndefined({ ...entry, seq });
            tx.set(messageRef(channelId, entry.id), stored);
            return stored;
          }
          seq += 1;
          const stored = stripUndefined({ ...entry, seq });
          tx.set(messageRef(channelId, entry.id), stored);
          channelPatch.seq = seq;
          channelPatch.lastMessageAt = now;
          channelPatch.lastMessage = { id: entry.id, authorId: entry.authorId, preview: preview || "", at: now };
          return stored;
        };

        if (isReply) {
          written = stripUndefined({ ...message });
          tx.set(replyRef(channelId, message.threadRootId, message.id), written);
          tx.update(rootRefValue, {
            replyCount: increment(1),
            lastReplyAt: now,
            threadParticipantIds: arrayUnion(message.authorId),
          });
          if (alsoToChannel) {
            writeTopLevel({ ...message, id: `${message.id}-ch`, sharedFromThread: true });
          }
        } else {
          written = writeTopLevel(message);
        }

        tx.update(cRef, channelPatch);
        const authorPatch = {};
        if (channelPatch.seq) {
          authorPatch.readSeq = { [channelId]: seq };
          authorPatch.lastReadAt = { [channelId]: now };
        }
        if (isReply) authorPatch.threadReadAt = { [message.threadRootId]: now };
        tx.set(userStateRef(message.authorId), authorPatch, { merge: true });

        inboxTargets.forEach((target) => {
          tx.set(doc(inboxCol(target.uid), message.id), stripUndefined({
            kind: target.kind,
            channelId,
            messageId: message.id,
            threadRootId: message.threadRootId || null,
            authorId: message.authorId,
            preview: preview || "",
            createdAt: now,
            read: false,
          }));
        });

        return written;
      });
    },

    async updateMessage(message, patch) {
      await updateDoc(refForMessage(message), stripUndefined(patch));
    },

    async deleteMessage(message, { soft = false } = {}) {
      const ref = refForMessage(message);
      if (soft) {
        await updateDoc(ref, { deleted: true, text: "", attachments: [], reactions: {}, linkedTasks: [], pinned: false });
        return;
      }
      if (message.threadRootId && !message.sharedFromThread) {
        const batch = writeBatch(db);
        batch.delete(ref);
        batch.update(messageRef(message.channelId, message.threadRootId), { replyCount: increment(-1) });
        await batch.commit();
        return;
      }
      await deleteDoc(ref);
    },

    async toggleReaction(message, key, uid, add) {
      await updateDoc(refForMessage(message), new FieldPath("reactions", key), add ? arrayUnion(uid) : arrayRemove(uid));
    },

    async updateUserState(uid, patch) {
      await setDoc(userStateRef(uid), toMergePatch(patch), { merge: true });
    },

    async markInboxRead(uid, ids) {
      for (let index = 0; index < ids.length; index += 450) {
        const batch = writeBatch(db);
        ids.slice(index, index + 450).forEach((id) => batch.update(doc(inboxCol(uid), id), { read: true }));
        // eslint-disable-next-line no-await-in-loop
        await batch.commit();
      }
    },

    async setPresence(uid, patch) {
      await setDoc(presenceRef(uid), toMergePatch(patch), { merge: true });
    },

    async setTyping(channelId, uid, at) {
      await setDoc(typingRef(channelId), { [uid]: at ? at : deleteField() }, { merge: true });
    },

    async fetchRecentMessages(channelId, count) {
      const snapshot = await getDocs(query(messagesCol(channelId), orderBy("createdAt", "desc"), limitTo(count)));
      return mapMessages(snapshot, channelId);
    },

    async fetchMessage(channelId, messageId, threadRootId = null) {
      const ref = threadRootId ? replyRef(channelId, threadRootId, messageId) : messageRef(channelId, messageId);
      const snapshot = await getDoc(ref);
      return snapshot.exists() ? normalizeMessage(snapshot.data(), snapshot.id, channelId) : null;
    },

    /** Creates a top-level message only when it does not exist yet (task discussion roots). */
    async ensureMessage(message) {
      const ref = messageRef(message.channelId, message.id);
      return runTransaction(db, async (tx) => {
        const snapshot = await tx.get(ref);
        if (snapshot.exists()) return normalizeMessage(snapshot.data(), snapshot.id, message.channelId);
        tx.set(ref, stripUndefined(message));
        return normalizeMessage(message, message.id, message.channelId);
      });
    },

    async updatePollVotes(message, { add = [], remove = [] }, uid) {
      const pairs = [];
      remove.forEach((optionId) => pairs.push(new FieldPath("pollVotes", optionId), arrayRemove(uid)));
      add.forEach((optionId) => pairs.push(new FieldPath("pollVotes", optionId), arrayUnion(uid)));
      if (!pairs.length) return;
      await updateDoc(refForMessage(message), ...pairs);
    },

    subscribeHuddles(onChange, onError) {
      return onSnapshot(
        query(collection(db, CHAT_COLLECTIONS.huddles), where("active", "==", true)),
        (snapshot) => {
          const byChannel = {};
          snapshot.docs.forEach((entry) => { byChannel[entry.id] = { ...entry.data(), channelId: entry.id }; });
          onChange(byChannel);
        },
        onError
      );
    },

    /** Joins (starting when needed) the huddle of a channel. Resolves `{ huddle, started }`. */
    async joinHuddle(channelId, uid, entry, { roomId, now }) {
      const ref = huddleRef(channelId);
      return runTransaction(db, async (tx) => {
        const snapshot = await tx.get(ref);
        const current = snapshot.exists() ? snapshot.data() : null;
        const live = current?.active && Object.values(current.participants || {}).some((participant) => now - (Number(participant?.lastSeen) || 0) < HUDDLE_STALE_MS);
        if (!live) {
          const huddle = { channelId, active: true, roomId, startedBy: uid, startedAt: now, endedAt: 0, participants: { [uid]: entry } };
          tx.set(ref, huddle);
          return { huddle, started: true };
        }
        tx.set(ref, { participants: { [uid]: entry } }, { merge: true });
        return { huddle: { ...current, participants: { ...(current.participants || {}), [uid]: entry } }, started: false };
      });
    },

    async updateHuddleParticipant(channelId, uid, patch) {
      await setDoc(huddleRef(channelId), { participants: { [uid]: toMergePatch(patch) } }, { merge: true });
    },

    /** Leaves the huddle; ends it for everyone when nobody live is left. Resolves `{ ended, huddle }`. */
    async leaveHuddle(channelId, uid, now) {
      const ref = huddleRef(channelId);
      return runTransaction(db, async (tx) => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists()) return { ended: false, huddle: null };
        const current = snapshot.data();
        const participants = { ...(current.participants || {}) };
        delete participants[uid];
        const remaining = Object.values(participants).filter((participant) => now - (Number(participant?.lastSeen) || 0) < HUDDLE_STALE_MS);
        if (!remaining.length && current.active) {
          tx.set(ref, { ...current, active: false, endedAt: now, participants: {} });
          return { ended: true, huddle: { ...current, active: false, endedAt: now } };
        }
        tx.update(ref, { [`participants.${uid}`]: deleteField() });
        return { ended: false, huddle: { ...current, participants } };
      });
    },

    async sendSignal(channelId, signal) {
      await addDoc(signalsCol(channelId), stripUndefined(signal));
    },

    subscribeSignals(channelId, uid, onChange, onError) {
      return onSnapshot(
        query(signalsCol(channelId), where("to", "==", uid)),
        (snapshot) => onChange(snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))),
        onError
      );
    },

    async deleteSignals(channelId, ids) {
      await deleteRefs(ids.map((id) => doc(signalsCol(channelId), id)));
    },

    subscribeWorkspace(onChange, onError) {
      return onSnapshot(workspaceRef(), (snapshot) => onChange(snapshot.exists() ? snapshot.data() : {}), onError);
    },

    async updateWorkspace(patch) {
      await setDoc(workspaceRef(), toMergePatch(patch), { merge: true });
    },

    /** Retention: deletes top-level messages (and their threads) older than `cutoff`. Resolves the count. */
    async deleteMessagesBefore(channelId, cutoff) {
      let removed = 0;
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const snapshot = await getDocs(query(messagesCol(channelId), where("createdAt", "<", cutoff), limitTo(200)));
        if (snapshot.empty) break;
        const refs = [];
        for (const entry of snapshot.docs) {
          if ((Number(entry.data()?.replyCount) || 0) > 0) {
            // eslint-disable-next-line no-await-in-loop
            const replies = await getDocs(repliesCol(channelId, entry.id));
            replies.docs.forEach((reply) => refs.push(reply.ref));
          }
          refs.push(entry.ref);
        }
        // eslint-disable-next-line no-await-in-loop
        await deleteRefs(refs);
        removed += snapshot.size;
        if (snapshot.size < 200) break;
      }
      return removed;
    },

    /** Full history for export: top-level messages ascending, each with `replies`. */
    async fetchAllMessages(channelId, { includeReplies = true } = {}) {
      const snapshot = await getDocs(query(messagesCol(channelId), orderBy("createdAt", "asc")));
      const messages = mapMessages(snapshot, channelId);
      if (!includeReplies) return messages;
      return Promise.all(messages.map(async (message) => {
        if (!message.replyCount) return { ...message, replies: [] };
        const replies = await getDocs(query(repliesCol(channelId, message.id), orderBy("createdAt", "asc")));
        return { ...message, replies: mapMessages(replies, channelId) };
      }));
    },
  };
}
