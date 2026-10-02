import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FaMagic, FaTimes } from "react-icons/fa";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { buildPreview, CHANNEL_TYPES, getUserDisplayName, GROUPING_WINDOW_MS, isChannelMember } from "../../../../shared/services/chat/chatModel";
import { useToast } from "../../../../shared/context/ToastContext";
import { formatScheduledTime } from "../../utils/chatSchedule";
import { resolveGifKey } from "../../utils/chatGifs";
import { useThreadMessages } from "../../hooks/useChatSubscriptions";
import { useMessageHandlers } from "../../hooks/useMessageHandlers";
import MessageItem from "../conversation/MessageItem";
import MessageComposer from "../composer/MessageComposer";

export function PanelShell({ title, subtitle, onClose, children, actions = null }) {
  return (
    <aside className="flex h-full w-full flex-col bg-white dark:bg-[#1c2030]">
      <header className="h-14 flex-shrink-0 flex items-center gap-2 border-b border-slate-200 dark:border-[#2a3044] px-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
        </div>
        {actions}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      </header>
      {children}
    </aside>
  );
}

export default function ThreadPanel({ channel, rootId, ctx, pageApi, getDraft, setDraft, onClose, highlightId, canCreateTask, onSummarize }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const [quote, setQuote] = useState(null);
  const composerRef = useRef(null);
  const { uid, activeUsers, channels, presence, userState } = chat;
  const { root, replies, loading } = useThreadMessages(channel.id, rootId);
  const [editingId, setEditingId] = useState(null);
  const [alsoToChannel, setAlsoToChannel] = useState(false);
  const scrollRef = useRef(null);
  const lastCountRef = useRef(0);
  const quoteMessage = useCallback((message) => {
    setQuote({
      messageId: message.id,
      channelId: message.channelId,
      threadRootId: message.threadRootId || null,
      authorId: message.authorId,
      createdAt: message.createdAt,
      preview: buildPreview(message.text, message.attachments, { usersById: chat.usersById, channelsById: chat.channelsById }).slice(0, 300),
    });
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }, [chat.channelsById, chat.usersById]);
  const { handlers, canEditMessage, canDeleteMessage, encode, reportError } = useMessageHandlers({
    channel, pageApi, setEditingId, canCreateTask, onQuote: quoteMessage,
  });
  const member = isChannelMember(channel, uid);
  const savedIds = useMemo(() => new Set(Object.keys(userState?.saved || {})), [userState?.saved]);
  const draftKey = `${channel.id}/${rootId}`;

  useEffect(() => {
    actions.setActiveConversation({ threadRootId: rootId });
    return () => actions.setActiveConversation({ threadRootId: null });
  }, [actions, rootId]);

  // Opening the thread (and every new reply while it is open) marks it read.
  useEffect(() => {
    if (loading) return;
    if (document.visibilityState === "hidden") return;
    actions.markThreadRead(rootId);
  }, [actions, loading, replies.length, rootId]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node || loading) return;
    if (replies.length !== lastCountRef.current) {
      const last = replies[replies.length - 1];
      const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 140;
      if (lastCountRef.current === 0 || nearBottom || last?.authorId === uid) node.scrollTop = node.scrollHeight;
      lastCountRef.current = replies.length;
    }
  }, [loading, replies, uid]);

  useEffect(() => {
    if (!highlightId || loading) return;
    const target = scrollRef.current?.querySelector(`[data-message-id="${String(highlightId).replace(/"/g, "")}"]`);
    target?.scrollIntoView?.({ block: "center" });
  }, [highlightId, loading, replies.length]);

  const handleSubmit = useCallback(({ text, attachments }) => {
    if (!root) return false;
    actions.sendMessage({
      channelId: channel.id,
      text: encode(text),
      attachments,
      rootMessage: root,
      alsoToChannel,
      extra: quote ? { quote } : null,
    }).catch(reportError);
    setAlsoToChannel(false);
    setQuote(null);
    return true;
  }, [actions, alsoToChannel, channel.id, encode, quote, reportError, root]);

  const handleSchedule = useCallback(({ text, at }) => {
    if (!at) {
      pageApi.openSchedule({ channelId: channel.id, threadRootId: rootId, text, onCancel: () => composerRef.current?.setText(text) });
      return true;
    }
    return actions.scheduleMessage({ channelId: channel.id, threadRootId: rootId, text: encode(text), at })
      .then(() => { addToast(`Reply scheduled for ${formatScheduledTime(at)}`, "success"); return true; })
      .catch((err) => { reportError(err); return false; });
  }, [actions, addToast, channel.id, encode, pageApi, reportError, rootId]);

  const editLast = useCallback(() => {
    const own = [...replies].reverse().find((message) => canEditMessage(message));
    if (own) setEditingId(own.id);
  }, [canEditMessage, replies]);

  const channelLabel = channel.type === CHANNEL_TYPES.DM ? chat.getChannelName(channel) : `#${channel.name}`;

  return (
    <PanelShell
      title="Thread"
      subtitle={channelLabel}
      onClose={onClose}
      actions={onSummarize && replies.length >= 3 ? (
        <button type="button" onClick={onSummarize} title="Summarize thread" aria-label="Summarize thread" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5">
          <FaMagic className="w-3.5 h-3.5" />
        </button>
      ) : null}
    >
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto pb-2">
        {loading && (
          <div className="p-5 space-y-3 animate-pulse">
            <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700/50" />
            <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700/50" />
          </div>
        )}
        {!loading && !root && (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400 text-center">This message was deleted, so its thread is no longer available.</p>
        )}
        {!loading && root && (
          <>
            <div className="pt-3">
              <MessageItem
                message={root}
                ctx={ctx}
                channel={channel}
                inThread
                isRoot
                saved={savedIds.has(root.id)}
                canEdit={canEditMessage(root)}
                canDelete={canDeleteMessage(root)}
                canPin={member}
                canCreateTask={canCreateTask}
                editing={editingId === root.id}
                handlers={handlers}
              />
            </div>
            <div className="flex items-center gap-3 px-5 py-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </span>
              <span className="flex-1 border-t border-slate-200 dark:border-[#2a3044]" />
            </div>
            {replies.map((reply, index) => {
              const previous = replies[index - 1];
              const grouped = Boolean(previous && previous.authorId === reply.authorId && reply.createdAt - previous.createdAt < GROUPING_WINDOW_MS);
              return (
                <MessageItem
                  key={reply.id}
                  message={reply}
                  grouped={grouped}
                  ctx={ctx}
                  channel={channel}
                  inThread
                  saved={savedIds.has(reply.id)}
                  canEdit={canEditMessage(reply)}
                  canDelete={canDeleteMessage(reply)}
                  canPin={false}
                  canCreateTask={canCreateTask}
                  editing={editingId === reply.id}
                  highlighted={highlightId === reply.id}
                  handlers={handlers}
                />
              );
            })}
          </>
        )}
      </div>
      {root && member && !channel.archived && (
        <div className="flex-shrink-0 px-3 pb-3 pt-1">
          <MessageComposer
            key={draftKey}
            ref={composerRef}
            placeholder="Reply…"
            initialText={getDraft(draftKey)}
            rich={userState?.prefs?.richComposer !== false}
            customEmoji={chat.customEmoji}
            searchEntities={ctx.searchEntities}
            gifKey={resolveGifKey(chat.workspace)}
            quote={quote}
            quoteLabel={quote ? getUserDisplayName(chat.usersById[quote.authorId]) : null}
            onClearQuote={() => setQuote(null)}
            onSchedule={handleSchedule}
            users={activeUsers}
            memberIds={channel.isDefault ? null : channel.memberIds}
            channels={channels}
            presence={presence}
            enterToSend={userState?.prefs?.enterToSend !== false}
            autoFocus
            onSubmit={handleSubmit}
            onDraftChange={(value) => setDraft(draftKey, value)}
            onEditLast={editLast}
            onError={reportError}
            footerSlot={(
              <label className="ml-1 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={alsoToChannel}
                  onChange={(event) => setAlsoToChannel(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Also send to {channel.type === CHANNEL_TYPES.DM ? "conversation" : `#${channel.name}`}
              </label>
            )}
          />
        </div>
      )}
    </PanelShell>
  );
}
