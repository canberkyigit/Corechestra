import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaComments, FaExternalLinkAlt } from "react-icons/fa";
import { useApp } from "../../../../shared/context/AppContext";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { requestNavigate, requestOpenTask } from "../../../../shared/components/appNavigation";
import { GROUPING_WINDOW_MS } from "../../../../shared/services/chat/chatModel";
import { useThreadMessages } from "../../hooks/useChatSubscriptions";
import { useMessageHandlers } from "../../hooks/useMessageHandlers";
import { useChatCtx } from "../../hooks/useChatCtx";
import { resolveGifKey } from "../../utils/chatGifs";
import MessageItem from "../conversation/MessageItem";
import MessageComposer from "../composer/MessageComposer";
import { ChatConfirmDialog } from "../common/ChatModal";
import { ImageLightbox } from "../modals/MiscModals";

function chatRoute(params) {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
  return `chats?${search.toString()}`;
}

/**
 * Chat thread for one task (ClickUp-style "chat in tasks"). The thread lives
 * in the task's project channel, so the conversation is also visible — and
 * searchable — in Chats.
 */
export default function TaskDiscussion({ task }) {
  const chat = useChat();
  if (!chat?.enabled) {
    return <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">Chats are not available for your account.</p>;
  }
  return <TaskDiscussionThread task={task} />;
}

function TaskDiscussionThread({ task }) {
  const chat = useChat();
  const actions = useChatActions();
  const { currentProjectId, activeTasks, backlogSections } = useApp();
  const [thread, setThread] = useState(null);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const scrollRef = useRef(null);
  const tasksRef = useRef({ activeTasks, backlogSections });
  tasksRef.current = { activeTasks, backlogSections };

  useEffect(() => {
    if (!chat?.ready || !task?.id) return undefined;
    let cancelled = false;
    setError(null);
    actions.ensureTaskThread(task, { fallbackProjectId: currentProjectId })
      .then((result) => { if (!cancelled) setThread(result); })
      .catch((err) => { if (!cancelled) setError(err?.message || "The discussion could not be opened."); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.ready, task?.id]);

  const pageApi = useMemo(() => ({
    openThread: (channelId, rootId) => requestNavigate(chatRoute({ c: channelId, t: rootId })),
    openProfile: () => requestNavigate("chats"),
    openChannel: (channelId) => requestNavigate(chatRoute({ c: channelId })),
    openTaskKey: (key) => {
      const { activeTasks: active, backlogSections: sections } = tasksRef.current;
      const found = [...(active || []), ...(sections || []).flatMap((section) => section.tasks || [])].find((entry) => String(entry.id) === String(key));
      if (found) requestOpenTask(found);
    },
    openImage: (file, images) => setLightbox({ images, index: Math.max(0, images.findIndex((entry) => entry.id === file.id)) }),
    jumpToMessage: (channelId, messageId, threadRootId) => requestNavigate(chatRoute({ c: channelId, m: messageId, t: threadRootId })),
    requestConfirm: setConfirm,
    openCreateTask: () => {},
  }), []);

  const ctx = useChatCtx(pageApi);
  const channel = thread ? chat?.channelsById?.[thread.channelId] : null;
  const { root, replies, loading } = useThreadMessages(thread?.channelId || null, thread?.rootId || null);
  const { handlers, canEditMessage, canDeleteMessage, encode, reportError } = useMessageHandlers({
    channel,
    pageApi,
    setEditingId,
    canCreateTask: false,
  });

  useEffect(() => {
    if (!thread?.rootId || loading) return;
    actions.markThreadRead(thread.rootId);
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [actions, loading, replies.length, thread?.rootId]);

  const handleSubmit = useCallback(({ text, attachments }) => {
    if (!root) return false;
    actions.sendMessage({ channelId: thread.channelId, text: encode(text), attachments, rootMessage: root }).catch(reportError);
    return true;
  }, [actions, encode, reportError, root, thread]);

  if (error) return <p className="p-6 text-center text-sm text-red-500">{error}</p>;
  if (!thread || !channel || loading) {
    return <p className="p-6 text-center text-sm text-slate-400">Opening discussion…</p>;
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col" data-testid="task-discussion">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#232838] px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
        <FaComments className="w-3 h-3" />
        <span className="flex-1">Discussed in <b>#{channel.name}</b> · everyone on the task is notified of replies</span>
        <button type="button" onClick={() => requestNavigate(chatRoute({ c: thread.channelId, t: thread.rootId }))} className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          Open in Chats <FaExternalLinkAlt className="w-2.5 h-2.5" />
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto py-2">
        {replies.length === 0 && (
          <div className="px-6 py-8 text-center">
            <FaComments className="mx-auto mb-2 w-6 h-6 text-blue-400" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Start the discussion</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ask a question, share an update or @mention a teammate. Replies stay attached to this task.</p>
          </div>
        )}
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
              canEdit={canEditMessage(reply)}
              canDelete={canDeleteMessage(reply)}
              canPin={false}
              editing={editingId === reply.id}
              handlers={handlers}
            />
          );
        })}
      </div>
      {!channel.archived && (
        <div className="flex-shrink-0 border-t border-slate-100 dark:border-[#232838] p-3">
          <MessageComposer
            key={thread.rootId}
            placeholder="Comment on this task…"
            rich={chat.userState?.prefs?.richComposer !== false}
            users={chat.activeUsers}
            channels={chat.channels}
            presence={chat.presence}
            customEmoji={chat.customEmoji}
            searchEntities={ctx.searchEntities}
            gifKey={resolveGifKey(chat.workspace)}
            enterToSend={chat.userState?.prefs?.enterToSend !== false}
            onSubmit={handleSubmit}
            onError={reportError}
          />
        </div>
      )}
      {confirm && (
        <ChatConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          tone={confirm.tone}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { const run = confirm.onConfirm; setConfirm(null); run?.(); }}
        />
      )}
      {lightbox && <ImageLightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}
