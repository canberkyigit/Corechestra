import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaCheck, FaCopy, FaLightbulb, FaListUl, FaMagic, FaPaperPlane, FaQuestionCircle, FaRobot, FaStar, FaTasks } from "react-icons/fa";
import { useApp } from "../../../../shared/context/AppContext";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { useToast } from "../../../../shared/context/ToastContext";
import { CHANNEL_TYPES, getUserDisplayName } from "../../../../shared/services/chat/chatModel";
import { TASK_STATUS_BADGE_STYLES, TASK_STATUS_SHORT_LABELS } from "../../../../shared/constants/taskMeta";
import { formatSummaryMarkdown, isAiSummaryAvailable, requestAiSummary, summarizeConversation } from "../../utils/chatSummary";
import { formatListTime } from "../../utils/chatTime";
import UserAvatar from "../common/UserAvatar";
import { PanelShell } from "./ThreadPanel";

const DAY = 24 * 60 * 60 * 1000;
const MAX_THREADS = 15;

function fetchThreadOnce(backend, channelId, rootId) {
  return new Promise((resolve) => {
    let unsub = null;
    let settled = false;
    const finish = (list) => {
      if (settled) return;
      settled = true;
      resolve(list || []);
      window.setTimeout(() => unsub?.(), 0);
    };
    unsub = backend.subscribeThread(channelId, rootId, finish, () => finish([]));
    window.setTimeout(() => finish([]), 4000);
  });
}

function Section({ icon: Icon, title, count, children }) {
  if (!count) return null;
  return (
    <section className="px-4 py-3 border-b border-slate-100 dark:border-[#232838]">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Icon className="w-3 h-3" /> {title} <span className="font-semibold text-slate-400">{count}</span>
      </h3>
      {children}
    </section>
  );
}

export default function SummaryPanel({ channel, rootId = null, ctx, onClose, canCreateTask }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const { createTask } = useApp();
  const lastReadRef = useRef(Number(chat.userState?.lastReadAt?.[channel.id]) || 0);
  // "Since I last read" only makes sense with something unread; otherwise start with the last week.
  const hasUnread = (chat.unread?.perChannel?.[channel.id]?.unread || 0) > 0;
  const [range, setRange] = useState(rootId ? "all" : lastReadRef.current && hasUnread ? "unread" : "week");
  const [state, setState] = useState({ loading: true, messages: [], error: null });
  const [ai, setAi] = useState({ loading: false, text: "", error: null });
  const [selected, setSelected] = useState(new Set());
  const [created, setCreated] = useState({});

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    const load = async () => {
      if (rootId) {
        const [root, replies] = await Promise.all([
          chat.backend.fetchMessage(channel.id, rootId),
          fetchThreadOnce(chat.backend, channel.id, rootId),
        ]);
        return root ? [{ ...root, replies }] : [];
      }
      const recent = (await chat.backend.fetchRecentMessages(channel.id, 300)).sort((a, b) => a.createdAt - b.createdAt);
      const busiest = recent.filter((message) => message.replyCount > 0).sort((a, b) => b.replyCount - a.replyCount).slice(0, MAX_THREADS);
      const threads = await Promise.all(busiest.map((message) => fetchThreadOnce(chat.backend, channel.id, message.id).then((replies) => [message.id, replies])));
      const byRoot = new Map(threads);
      return recent.map((message) => ({ ...message, replies: byRoot.get(message.id) || [] }));
    };
    load()
      .then((messages) => { if (!cancelled) setState({ loading: false, messages, error: null }); })
      .catch((error) => { if (!cancelled) setState({ loading: false, messages: [], error: error?.message || "Could not load messages." }); });
    return () => { cancelled = true; };
  }, [channel.id, chat.backend, rootId]);

  const since = useMemo(() => {
    const now = Date.now();
    if (range === "unread") return lastReadRef.current;
    if (range === "today") { const start = new Date(); start.setHours(0, 0, 0, 0); return start.getTime(); }
    if (range === "week") return now - 7 * DAY;
    return 0;
  }, [range]);

  const summary = useMemo(
    () => summarizeConversation(state.messages, { usersById: chat.usersById, channelsById: chat.channelsById, since }),
    [chat.channelsById, chat.usersById, since, state.messages]
  );

  useEffect(() => { setSelected(new Set(summary.actionItems.map((item) => item.id))); setCreated({}); }, [summary.actionItems]);

  const channelLabel = channel.type === CHANNEL_TYPES.DM ? chat.getChannelName(channel) : `#${channel.name}`;

  const runAi = useCallback(() => {
    const scoped = state.messages
      .filter((message) => message.createdAt >= since || (message.replies || []).some((reply) => reply.createdAt >= since));
    setAi({ loading: true, text: "", error: null });
    requestAiSummary(scoped, { usersById: chat.usersById, channelsById: chat.channelsById, channelName: channelLabel })
      .then((result) => setAi({ loading: false, text: result?.summary || "", error: null }))
      .catch((error) => setAi({ loading: false, text: "", error: error?.message || "AI summary failed." }));
  }, [channelLabel, chat.channelsById, chat.usersById, since, state.messages]);

  const markdown = () => formatSummaryMarkdown({ ...summary, aiSummary: ai.text }, { title: `Catch-up for ${channelLabel}`, usersById: chat.usersById });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown().replace(/<@([\w.-]+)>/g, (_, id) => `@${getUserDisplayName(chat.usersById[id])}`));
      addToast("Summary copied", "info");
    } catch {
      addToast("Copy failed", "error");
    }
  };

  const post = () => {
    actions.sendMessage({ channelId: channel.id, text: markdown(), rootMessage: rootId ? state.messages[0] : null })
      .then(() => addToast("Summary posted", "success"))
      .catch((error) => addToast(error?.message || "Could not post.", "error"));
  };

  const createTasks = () => {
    const items = summary.actionItems.filter((item) => selected.has(item.id) && !created[item.id]);
    const next = { ...created };
    items.forEach((item) => {
      const assignee = item.assigneeId ? chat.usersById[item.assigneeId]?.username : null;
      const task = createTask({
        title: item.text.slice(0, 160),
        description: `From ${channelLabel}${item.due ? ` (due: ${item.due})` : ""}\n\n> ${item.text}`,
        type: "task",
        priority: "medium",
        assignedTo: assignee || "unassigned",
        status: "todo",
      }, "active");
      if (task) {
        next[item.id] = task.id;
        actions.linkTaskToMessage(item.message, task).catch(() => {});
      }
    });
    setCreated(next);
    if (items.length) addToast(`Created ${items.length} task${items.length === 1 ? "" : "s"}`, "success");
  };

  const ranges = rootId
    ? [{ id: "all", label: "Whole thread" }]
    : [
      lastReadRef.current ? { id: "unread", label: "Since I last read" } : null,
      { id: "today", label: "Today" },
      { id: "week", label: "Last 7 days" },
      { id: "all", label: "Recent 300" },
    ].filter(Boolean);

  return (
    <PanelShell title={rootId ? "Thread summary" : "Catch me up"} subtitle={`${channelLabel} · generated on this device`} onClose={onClose}>
      <div className="flex-shrink-0 flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-[#2a3044] px-4 py-2.5">
        {ranges.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setRange(entry.id)}
            className={`h-7 rounded-full px-3 text-xs font-semibold ${range === entry.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#232838] dark:text-slate-300 dark:hover:bg-[#2a3044]"}`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto" data-testid="chat-summary">
        {state.loading && <p className="p-6 text-center text-sm text-slate-400">Reading the conversation…</p>}
        {state.error && <p className="p-6 text-center text-sm text-red-500">{state.error}</p>}
        {!state.loading && !state.error && (
          summary.messageCount === 0 ? (
            <div className="p-8 text-center">
              <FaMagic className="mx-auto mb-2 w-5 h-5 text-blue-500" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nothing to catch up on</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No messages in this range. Try a longer period.</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100 dark:border-[#232838]">
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  <b>{summary.messageCount}</b> messages from <b>{summary.participants.length}</b> {summary.participants.length === 1 ? "person" : "people"}
                  {summary.from ? <> · {formatListTime(summary.from)} – {formatListTime(summary.to)}</> : null}
                  {summary.files ? <> · {summary.files} files</> : null}
                  {summary.links ? <> · {summary.links} links</> : null}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {summary.participants.slice(0, 8).map((person) => (
                    <span key={person.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-[#232838] py-0.5 pl-0.5 pr-2 text-xs text-slate-700 dark:text-slate-200">
                      <UserAvatar user={chat.usersById[person.id]} size="xs" /> {person.name} <span className="text-slate-400">{person.count}</span>
                    </span>
                  ))}
                </div>
              </div>

              {isAiSummaryAvailable() && (
                <section className="px-4 py-3 border-b border-slate-100 dark:border-[#232838]">
                  {ai.text ? (
                    <>
                      <h3 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400"><FaRobot className="w-3 h-3" /> AI summary</h3>
                      <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{ai.text}</p>
                    </>
                  ) : (
                    <button type="button" disabled={ai.loading} onClick={runAi} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60">
                      <FaRobot className="w-3 h-3" /> {ai.loading ? "Summarizing…" : "Write an AI summary"}
                    </button>
                  )}
                  {ai.error && <p className="mt-1 text-xs text-red-500">{ai.error}</p>}
                </section>
              )}

              <Section icon={FaStar} title="Highlights" count={summary.highlights.length}>
                <ul className="space-y-2">
                  {summary.highlights.map((entry) => (
                    <li key={entry.message.id}>
                      <button type="button" onClick={() => ctx.onJumpToMessage(channel.id, entry.message.id, entry.message.isReply ? entry.message.threadRootId : null)} className="flex w-full gap-2 rounded-lg p-1.5 text-left hover:bg-slate-50 dark:hover:bg-white/5">
                        <UserAvatar user={chat.usersById[entry.message.authorId]} size="sm" />
                        <span className="min-w-0 text-sm text-slate-700 dark:text-slate-200">
                          <b className="font-semibold">{getUserDisplayName(chat.usersById[entry.message.authorId])}</b> {entry.text}
                          {(entry.message.replyCount > 0 || Object.keys(entry.message.reactions || {}).length > 0) && (
                            <span className="ml-1 text-xs text-slate-400">{entry.message.replyCount ? `${entry.message.replyCount} replies` : ""}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section icon={FaLightbulb} title="Decisions" count={summary.decisions.length}>
                <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
                  {summary.decisions.map((entry, index) => (
                    <li key={`${entry.message.id}-${index}`} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                      <button type="button" className="text-left hover:underline" onClick={() => ctx.onJumpToMessage(channel.id, entry.message.id, entry.message.isReply ? entry.message.threadRootId : null)}>{entry.text}</button>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section icon={FaListUl} title="Action items" count={summary.actionItems.length}>
                <ul className="space-y-1.5">
                  {summary.actionItems.map((item) => {
                    const done = created[item.id];
                    return (
                      <li key={item.id} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          disabled={Boolean(done)}
                          checked={selected.has(item.id)}
                          onChange={(event) => setSelected((prev) => {
                            const next = new Set(prev);
                            if (event.target.checked) next.add(item.id); else next.delete(item.id);
                            return next;
                          })}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Select action item: ${item.text}`}
                        />
                        <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
                          {item.text}
                          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            {item.assigneeId && <span className="inline-flex items-center gap-1"><UserAvatar user={chat.usersById[item.assigneeId]} size="xs" /> {getUserDisplayName(chat.usersById[item.assigneeId])}</span>}
                            {item.due && <span>Due: {item.due}</span>}
                            {done && <button type="button" onClick={() => ctx.onOpenTaskKey(done)} className="inline-flex items-center gap-1 font-semibold text-emerald-600"><FaCheck className="w-2.5 h-2.5" /> {done}</button>}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {canCreateTask && (
                  <button
                    type="button"
                    disabled={![...selected].some((id) => !created[id])}
                    onClick={createTasks}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                    data-testid="chat-summary-create-tasks"
                  >
                    <FaTasks className="w-3 h-3" /> Create tasks from selected
                  </button>
                )}
              </Section>

              <Section icon={FaQuestionCircle} title="Open questions" count={summary.questions.length}>
                <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
                  {summary.questions.map((entry) => (
                    <li key={entry.message.id}>
                      <button type="button" className="text-left hover:underline" onClick={() => ctx.onJumpToMessage(channel.id, entry.message.id, entry.message.isReply ? entry.message.threadRootId : null)}>
                        <b className="font-semibold">{getUserDisplayName(chat.usersById[entry.message.authorId])}:</b> {entry.text}
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section icon={FaTasks} title="Tasks mentioned" count={summary.tasks.length}>
                <div className="flex flex-wrap gap-1.5">
                  {summary.tasks.map(({ key, count }) => {
                    const task = ctx.resolveTask?.(key);
                    return (
                      <button key={key} type="button" onClick={() => ctx.onOpenTaskKey(key)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] px-2 py-1 text-xs hover:border-indigo-300">
                        <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-300">{key}</span>
                        {task && <span className={`rounded-full px-1.5 text-[10.5px] font-semibold ${TASK_STATUS_BADGE_STYLES[task.status] || TASK_STATUS_BADGE_STYLES.todo}`}>{TASK_STATUS_SHORT_LABELS[task.status] || task.status}</span>}
                        <span className="text-slate-400">×{count}</span>
                      </button>
                    );
                  })}
                </div>
              </Section>
            </>
          )
        )}
      </div>
      {!state.loading && summary.messageCount > 0 && (
        <div className="flex-shrink-0 flex gap-2 border-t border-slate-200 dark:border-[#2a3044] px-4 py-3">
          <button type="button" onClick={copy} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5">
            <FaCopy className="w-3 h-3" /> Copy
          </button>
          <button type="button" onClick={post} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-500">
            <FaPaperPlane className="w-3 h-3" /> Post to {rootId ? "thread" : "channel"}
          </button>
        </div>
      )}
    </PanelShell>
  );
}
