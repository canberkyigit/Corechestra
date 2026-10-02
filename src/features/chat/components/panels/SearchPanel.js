import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { CHANNEL_TYPES, getUserDisplayName, toPlainText } from "../../../../shared/services/chat/chatModel";
import { formatFullTimestamp, formatListTime } from "../../utils/chatTime";
import UserAvatar from "../common/UserAvatar";
import { fieldClass } from "../common/ChatModal";
import { PanelShell } from "./ThreadPanel";

function Highlight({ text, needle }) {
  if (!needle) return text;
  const lower = text.toLowerCase();
  const index = lower.indexOf(needle.toLowerCase());
  if (index < 0) return text;
  const start = Math.max(0, index - 60);
  const prefix = start > 0 ? "…" : "";
  return (
    <>
      {prefix}{text.slice(start, index)}
      <mark className="rounded bg-yellow-200 dark:bg-yellow-600/40 text-inherit">{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length, index + needle.length + 160)}
    </>
  );
}

export default function SearchPanel({ channel, initialQuery = "", onClose, pageApi }) {
  const chat = useChat();
  const actions = useChatActions();
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState(channel ? "current" : "all");
  const [authorId, setAuthorId] = useState("");
  const [state, setState] = useState({ loading: false, results: [], searched: false });
  const requestRef = useRef(0);

  useEffect(() => { actions.invalidateSearchCache(); }, [actions]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2 && !authorId) {
      setState({ loading: false, results: [], searched: false });
      return undefined;
    }
    const request = requestRef.current + 1;
    requestRef.current = request;
    setState((prev) => ({ ...prev, loading: true }));
    const timer = window.setTimeout(() => {
      actions.searchMessages(text, {
        channelIds: scope === "current" && channel ? [channel.id] : null,
        authorId: authorId || null,
      }).then((results) => {
        if (requestRef.current === request) setState({ loading: false, results, searched: true });
      }).catch(() => {
        if (requestRef.current === request) setState({ loading: false, results: [], searched: true });
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [actions, authorId, channel, query, scope]);

  const people = useMemo(() => chat.activeUsers, [chat.activeUsers]);

  return (
    <PanelShell title="Search messages" subtitle="Searches the most recent 200 messages of each conversation" onClose={onClose}>
      <div className="flex-shrink-0 space-y-2 border-b border-slate-200 dark:border-[#2a3044] p-3">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search messages and files"
            className={`${fieldClass} pl-8`}
            data-testid="chat-search-input"
          />
        </div>
        <div className="flex gap-2">
          {channel && (
            <select value={scope} onChange={(event) => setScope(event.target.value)} className={`${fieldClass} py-1.5 text-xs`}>
              <option value="current">In {channel.type === CHANNEL_TYPES.DM ? "this conversation" : `#${channel.name}`}</option>
              <option value="all">All conversations</option>
            </select>
          )}
          <select value={authorId} onChange={(event) => setAuthorId(event.target.value)} className={`${fieldClass} py-1.5 text-xs`}>
            <option value="">From anyone</option>
            {people.map((person) => <option key={person.id} value={person.id}>{getUserDisplayName(person)}</option>)}
          </select>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {state.loading && <p className="p-4 text-center text-sm text-slate-400">Searching…</p>}
        {!state.loading && state.searched && !state.results.length && (
          <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">No messages match your search.</p>
        )}
        {!state.loading && !state.searched && (
          <p className="p-6 text-center text-sm text-slate-400">Type at least two characters, or pick a person.</p>
        )}
        <ul className="space-y-1">
          {!state.loading && state.results.map((message) => {
            const where = chat.channelsById[message.channelId];
            const plain = toPlainText(message.text, { usersById: chat.usersById, channelsById: chat.channelsById });
            return (
              <li key={`${message.channelId}-${message.id}`}>
                <button
                  type="button"
                  onClick={() => pageApi.jumpToMessage(message.channelId, message.id)}
                  className="w-full rounded-xl p-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <UserAvatar user={chat.usersById[message.authorId]} size="xs" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{getUserDisplayName(chat.usersById[message.authorId])}</span>
                    {where && <span className="truncate">in {where.type === CHANNEL_TYPES.DM ? chat.getChannelName(where) : `#${where.name}`}</span>}
                    <span className="ml-auto flex-shrink-0" title={formatFullTimestamp(message.createdAt)}>{formatListTime(message.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 line-clamp-3 break-words">
                    {plain ? <Highlight text={plain} needle={query.trim()} /> : (message.attachments || []).map((file) => file.name).join(", ")}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </PanelShell>
  );
}
