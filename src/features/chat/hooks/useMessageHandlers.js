import { useCallback, useMemo, useRef } from "react";
import { useChat, useChatActions } from "../../../shared/context/ChatContext";
import { useToast } from "../../../shared/context/ToastContext";
import { CHANNEL_TYPES, toPlainText } from "../../../shared/services/chat/chatModel";
import { encodeMessageText } from "../utils/chatMentions";
import { formatScheduledTime } from "../utils/chatSchedule";

export function buildMessageLink(message) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({ c: message.channelId, m: message.id });
  if (message.threadRootId && !message.sharedFromThread) params.set("t", message.threadRootId);
  return `${origin}/chats?${params.toString()}`;
}

async function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

/**
 * Handlers + permission checks shared by the channel timeline and the
 * thread panel. `pageApi` comes from ChatsPage (navigation, modals).
 */
export function useMessageHandlers({ channel, pageApi, setEditingId, canCreateTask, onQuote = null }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const { uid, usersById, channelsById, activeUsers, channels, permissions } = chat;
  const channelAdmin = chat.isChannelAdmin(channel);
  const savedRef = useRef(chat.userState?.saved);
  savedRef.current = chat.userState?.saved;

  const encode = useCallback(
    (text) => encodeMessageText(text, { users: Object.values(usersById), channels }),
    [channels, usersById]
  );

  const reportError = useCallback((error) => {
    addToast(typeof error === "string" ? error : error?.message || "Something went wrong.", "error");
  }, [addToast]);

  const handlers = useMemo(() => ({
    onOpenThread: (message) => pageApi.openThread(message.channelId, message.sharedFromThread ? message.threadRootId : message.id),
    onOpenThreadById: (rootId) => channel && pageApi.openThread(channel.id, rootId),
    onReact: (message, key) => actions.toggleReaction(message, key).catch(reportError),
    onToggleSaved: (message) => {
      const wasSaved = Boolean(savedRef.current?.[message.id]);
      actions.toggleSaved(message)
        .then(() => addToast(wasSaved ? "Removed from saved items" : "Saved for later", "info"))
        .catch(reportError);
    },
    onTogglePin: (message) => actions.togglePin(message)
      .then(() => addToast(message.pinned ? "Message unpinned" : "Message pinned to the channel", "info"))
      .catch(reportError),
    onCopyText: (message) => copyToClipboard(toPlainText(message.text, { usersById, channelsById }))
      .then(() => addToast("Copied to clipboard", "info"))
      .catch(reportError),
    onCopyLink: (message) => copyToClipboard(buildMessageLink(message))
      .then(() => addToast("Link copied", "info"))
      .catch(reportError),
    onMarkUnread: (message) => {
      pageApi.suppressAutoRead?.(message.channelId);
      actions.markUnreadFrom(message).then(() => addToast("Marked as unread", "info")).catch(reportError);
    },
    onCreateTask: (message) => pageApi.openCreateTask({ message, channel }),
    onStartEdit: (message) => setEditingId(message.id),
    onCancelEdit: () => setEditingId(null),
    onSaveEdit: (message, text) => {
      const encoded = encode(text);
      if (!encoded.trim() && !message.attachments?.length) {
        setEditingId(null);
        pageApi.requestConfirm({
          title: "Delete message?",
          message: "Saving an empty message deletes it. This can't be undone.",
          confirmLabel: "Delete",
          onConfirm: () => actions.deleteMessage(message).catch(reportError),
        });
        return undefined;
      }
      setEditingId(null);
      if (encoded !== message.text) actions.editMessage(message, encoded).catch(reportError);
      return undefined;
    },
    onDelete: (message) => pageApi.requestConfirm({
      title: "Delete message?",
      message: message.replyCount > 0
        ? "The thread replies stay visible; the message itself is replaced by a placeholder."
        : "This message will be removed for everyone. This can't be undone.",
      confirmLabel: "Delete",
      onConfirm: () => actions.deleteMessage(message).catch(reportError),
    }),
    onVote: (message, optionId) => actions.votePoll(message, optionId).catch(reportError),
    onTogglePollClosed: (message) => actions.closePoll(message, !message.poll?.closed)
      .then(() => addToast(message.poll?.closed ? "Poll reopened" : "Poll closed", "info"))
      .catch(reportError),
    onQuote: onQuote ? (message) => onQuote(message) : null,
    onForward: pageApi.openForward ? (message) => pageApi.openForward(message) : null,
    onRemind: (message, at) => {
      if (!at) { pageApi.openReminder?.({ message }); return; }
      actions.addReminder({ at, message })
        .then(() => addToast(`Reminder set for ${formatScheduledTime(at)}`, "success"))
        .catch(reportError);
    },
    onHidePreviews: (message) => actions.updateMessageFields?.(message, { hidePreviews: true }).catch(reportError),
    onRetry: (message) => actions.retryMessage(message),
    onDiscard: (message) => actions.discardPending(message),
    onError: reportError,
  }), [actions, addToast, channel, channelsById, encode, onQuote, pageApi, reportError, setEditingId, usersById]);

  const canEditMessage = useCallback((message) => (
    !message.pending && !message.deleted && !message.system && message.authorId === uid
  ), [uid]);

  const canDeleteMessage = useCallback((message) => (
    !message.pending && !message.deleted && !message.system
    && (message.authorId === uid || channelAdmin || permissions.isWorkspaceAdmin)
  ), [channelAdmin, permissions.isWorkspaceAdmin, uid]);

  const canPin = Boolean(channel) && (channel.type === CHANNEL_TYPES.DM || chat.channelsById[channel.id] != null);

  return {
    handlers,
    canEditMessage,
    canDeleteMessage,
    canPin,
    canCreateTask,
    encode,
    reportError,
    activeUsers,
  };
}
