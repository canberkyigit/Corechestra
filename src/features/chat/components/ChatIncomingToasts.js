import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaTimes } from "react-icons/fa";
import { useChat, useChatActions } from "../../../shared/context/ChatContext";
import { requestNavigate } from "../../../shared/components/appNavigation";
import UserAvatar from "./common/UserAvatar";

const AUTO_DISMISS_MS = 8000;

export function buildChatRoute({ channelId, messageId, threadRootId }) {
  const params = new URLSearchParams();
  if (channelId) params.set("c", channelId);
  if (messageId) params.set("m", messageId);
  if (threadRootId) params.set("t", threadRootId);
  return `chats?${params.toString()}`;
}

function IncomingCard({ item, usersById, onOpen, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(item.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [item.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.2 }}
      className="pointer-events-auto w-[min(340px,calc(100vw-2rem))] rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] shadow-2xl"
    >
      <div className="flex gap-3 p-3">
        <button type="button" onClick={() => onOpen(item)} className="flex min-w-0 flex-1 gap-3 text-left">
          <UserAvatar user={usersById[item.authorId]} size="lg" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{item.title}</span>
            <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300 line-clamp-2 break-words">{item.body || "New message"}</span>
          </span>
        </button>
        <button type="button" onClick={() => onDismiss(item.id)} aria-label="Dismiss" className="h-6 w-6 flex-shrink-0 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5">
          <FaTimes className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

/** Slack-style "new message" cards shown anywhere in the app (bottom-left). */
export default function ChatIncomingToasts() {
  const chat = useChat();
  const actions = useChatActions();
  if (!chat?.enabled) return null;

  const open = (item) => {
    actions.dismissIncoming(item.id);
    if (!item.channelId) {
      requestNavigate(item.kind === "reminder" ? "chats?view=later&tab=reminders" : "chats");
      return;
    }
    requestNavigate(buildChatRoute({ channelId: item.channelId, messageId: item.messageId, threadRootId: item.threadRootId }));
  };

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-[9998] flex flex-col-reverse gap-2" aria-live="polite">
      <AnimatePresence>
        {chat.incoming.map((item) => (
          <IncomingCard key={item.id} item={item} usersById={chat.usersById} onOpen={open} onDismiss={actions.dismissIncoming} />
        ))}
      </AnimatePresence>
    </div>
  );
}
