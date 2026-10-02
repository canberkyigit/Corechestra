import React, { useMemo, useState } from "react";
import {
  FaArchive, FaArrowRight, FaBook, FaBolt, FaCheck, FaCheckCircle, FaExclamationTriangle, FaExternalLinkAlt, FaFlask,
  FaPlay, FaPoll, FaRocket, FaShare, FaTag, FaTasks, FaTimes, FaUserCheck, FaVideo, FaGithub, FaFigma, FaGoogle, FaLink,
} from "react-icons/fa";
import { getUserDisplayName, tallyPoll } from "../../../../shared/services/chat/chatModel";
import {
  TASK_PRIORITY_HEX, TASK_STATUS_BADGE_STYLES, TASK_STATUS_SHORT_LABELS, TASK_TYPE_CHIP_STYLES, TASK_TYPE_ICON_META,
} from "../../../../shared/constants/taskMeta";
import { taskKey } from "../../../../shared/utils/helpers";
import Logo from "../../../../shared/components/Logo";
import { describeBotEvent } from "../../utils/chatBot";
import { extractReferences } from "../../utils/chatMarkdown";
import { classifyUrl, extractUrls } from "../../utils/chatLinks";
import { formatListTime } from "../../utils/chatTime";
import UserAvatar from "../common/UserAvatar";
import MessageText from "./MessageText";

const cardShell = "mt-1.5 w-full max-w-xl rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030]";

// ── Polls ───────────────────────────────────────────────────────────────────
export function PollCard({ message, ctx, onVote, onToggleClosed, canClose }) {
  const poll = message.poll;
  const { total, voters, counts, mine } = useMemo(() => tallyPoll(message, ctx.uid), [ctx.uid, message]);
  const [showVoters, setShowVoters] = useState(false);
  const leading = Math.max(0, ...Object.values(counts));
  return (
    <div className={`${cardShell} p-3.5`} data-testid="chat-poll">
      <div className="flex items-start gap-2">
        <FaPoll className="mt-0.5 w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-slate-900 dark:text-white break-words">{poll.question}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {poll.multi ? "Choose any" : "Choose one"}{poll.anonymous ? " · Anonymous" : ""}{poll.closed ? " · Closed" : ""}
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {(poll.options || []).map((option) => {
          const count = counts[option.id] || 0;
          const percent = total ? Math.round((count / total) * 100) : 0;
          const selected = mine.has(option.id);
          const ids = message.pollVotes?.[option.id] || [];
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={poll.closed}
                onClick={() => onVote(message, option.id)}
                aria-pressed={selected}
                className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${
                  selected
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-500/10"
                    : "border-slate-200 dark:border-[#2a3044] hover:border-slate-300 dark:hover:border-slate-500"
                }`}
              >
                <span
                  className={`absolute inset-y-0 left-0 ${poll.closed && count === leading && count > 0 ? "bg-emerald-100 dark:bg-emerald-500/15" : "bg-slate-100 dark:bg-[#232838]"} transition-all`}
                  style={{ width: `${percent}%` }}
                  aria-hidden="true"
                />
                <span className="relative flex items-center gap-2">
                  <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center ${poll.multi ? "rounded" : "rounded-full"} border ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 dark:border-slate-500"}`}>
                    {selected && <FaCheck className="w-2 h-2" />}
                  </span>
                  <span className="flex-1 font-medium text-slate-800 dark:text-slate-100 break-words">{option.text}</span>
                  <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">{percent}% · {count}</span>
                </span>
                {showVoters && !poll.anonymous && ids.length > 0 && (
                  <span className="relative mt-1.5 flex flex-wrap gap-1">
                    {ids.map((id) => (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-[#141720]/80 px-1.5 py-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                        <UserAvatar user={ctx.usersById[id]} size="xs" /> {getUserDisplayName(ctx.usersById[id])}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{voters} {voters === 1 ? "person" : "people"} voted</span>
        {!poll.anonymous && total > 0 && (
          <button type="button" onClick={() => setShowVoters((value) => !value)} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {showVoters ? "Hide votes" : "Show who voted"}
          </button>
        )}
        {canClose && (
          <button type="button" onClick={() => onToggleClosed(message)} className="ml-auto font-medium text-slate-600 dark:text-slate-300 hover:underline">
            {poll.closed ? "Reopen poll" : "Close poll"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Quote / forwarded ───────────────────────────────────────────────────────
export function QuoteCard({ quote, ctx }) {
  if (!quote) return null;
  return (
    <button
      type="button"
      onClick={() => quote.channelId && ctx.onJumpToMessage?.(quote.channelId, quote.messageId, quote.threadRootId)}
      className="mb-1 flex w-full max-w-xl gap-2 rounded-lg border-l-4 border-blue-400 bg-slate-50 dark:bg-[#1c2030] px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-[#232838]"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <UserAvatar user={ctx.usersById[quote.authorId]} size="xs" />
          {getUserDisplayName(ctx.usersById[quote.authorId])}
          <span className="font-normal text-slate-400">{formatListTime(quote.createdAt)}</span>
        </span>
        <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300 line-clamp-2 break-words">{quote.preview || "Message"}</span>
      </span>
    </button>
  );
}

export function ForwardedCard({ forwarded, ctx }) {
  if (!forwarded) return null;
  const channel = ctx.channelsById[forwarded.channelId];
  const where = forwarded.channelIsDm ? "a direct message" : channel ? `#${channel.name}` : forwarded.channelName ? `#${forwarded.channelName}` : "a private conversation";
  return (
    <div className={`${cardShell} border-l-4 border-l-slate-300 dark:border-l-slate-600 px-3.5 py-2.5`}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <FaShare className="w-2.5 h-2.5" /> Forwarded from {where}
      </p>
      <div className="mt-1.5 flex items-center gap-2">
        <UserAvatar user={ctx.usersById[forwarded.authorId]} size="xs" />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{getUserDisplayName(ctx.usersById[forwarded.authorId])}</span>
        <span className="text-xs text-slate-400">{formatListTime(forwarded.createdAt)}</span>
      </div>
      {forwarded.text && <MessageText text={forwarded.text} ctx={ctx} className="mt-1" />}
      {forwarded.attachments?.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {forwarded.attachments.map((file) => (String(file.type || "").startsWith("image/") ? (
            <img key={file.id} src={file.url || file.dataUrl} alt={file.name} className="h-24 rounded-lg border border-slate-200 dark:border-[#2a3044] object-cover" />
          ) : (
            <span key={file.id} className="rounded-lg border border-slate-200 dark:border-[#2a3044] px-2 py-1 text-xs text-slate-600 dark:text-slate-300">📎 {file.name}</span>
          )))}
        </div>
      )}
      {channel && (
        <button type="button" onClick={() => ctx.onJumpToMessage?.(forwarded.channelId, forwarded.messageId, forwarded.threadRootId)} className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
          View original message
        </button>
      )}
    </div>
  );
}

// ── Bot events ──────────────────────────────────────────────────────────────
const TONE_STYLES = {
  green: "border-l-emerald-500",
  red: "border-l-red-500",
  blue: "border-l-blue-500",
  amber: "border-l-amber-500",
  violet: "border-l-violet-500",
};
const TONE_TEXT = {
  green: "text-emerald-600 dark:text-emerald-400",
  red: "text-red-600 dark:text-red-400",
  blue: "text-blue-600 dark:text-blue-400",
  amber: "text-amber-600 dark:text-amber-400",
  violet: "text-violet-600 dark:text-violet-400",
};
const BOT_ICONS = {
  task: FaTasks, done: FaCheckCircle, blocked: FaExclamationTriangle, move: FaArrowRight, assign: FaUserCheck,
  archive: FaArchive, sprint: FaRocket, epic: FaBolt, release: FaTag, testPass: FaFlask, testFail: FaFlask,
};

export function BotEventCard({ message, ctx }) {
  const event = message.system?.event || {};
  const nameOf = (username) => {
    if (!username) return "Someone";
    const person = Object.values(ctx.usersById).find((user) => String(user.username || "").toLowerCase() === String(username).toLowerCase());
    return person ? getUserDisplayName(person) : username;
  };
  const view = describeBotEvent(event, { nameOf });
  const Icon = BOT_ICONS[view.icon] || FaArrowRight;
  const task = view.taskId ? ctx.resolveTask?.(view.taskId) : null;

  const open = () => {
    if (view.taskId) ctx.onOpenTaskKey?.(view.taskId);
    else if (view.releaseId) ctx.onOpenRelease?.(view.releaseId);
    else if (view.route) ctx.onOpenRoute?.(view.route);
  };

  return (
    <div className="group flex gap-3 px-5 py-1.5" data-message-id={message.id} data-testid="chat-bot-card">
      <span className="mt-0.5 h-9 w-9 flex-shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center" title="Corechestra">
        <Logo size={20} color="white" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[14.5px] font-semibold text-slate-900 dark:text-white">Corechestra</span>
          <span className="rounded bg-slate-100 dark:bg-[#232838] px-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">App</span>
          <span className="text-[11.5px] text-slate-400">{formatListTime(message.createdAt)}</span>
        </div>
        <button
          type="button"
          onClick={open}
          className={`mt-1 block w-full max-w-xl rounded-xl border border-slate-200 dark:border-[#2a3044] border-l-4 ${TONE_STYLES[view.tone] || TONE_STYLES.blue} bg-white dark:bg-[#1c2030] px-3.5 py-2.5 text-left hover:shadow-sm`}
        >
          <span className={`flex items-center gap-2 text-sm font-semibold ${TONE_TEXT[view.tone] || TONE_TEXT.blue}`}>
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="min-w-0 break-words">{view.title}</span>
          </span>
          {view.detail && <span className="mt-0.5 block text-sm text-slate-700 dark:text-slate-200 break-words">{view.detail}</span>}
          {view.progress !== null && view.progress !== undefined && (
            <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-[#232838]">
              <span className={`block h-full rounded-full ${view.tone === "red" ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${view.progress}%` }} />
            </span>
          )}
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {view.meta && <span>{view.meta}</span>}
            {task && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${TASK_STATUS_BADGE_STYLES[task.status] || TASK_STATUS_BADGE_STYLES.todo}`}>
                Now: {TASK_STATUS_SHORT_LABELS[task.status] || task.status}
              </span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

export function TaskThreadCard({ message, ctx, onOpenThread }) {
  const taskId = message.system?.taskId || message.taskId;
  const task = ctx.resolveTask?.(taskId);
  return (
    <div className="flex gap-3 px-5 py-1.5" data-message-id={message.id}>
      <span className="mt-0.5 h-9 w-9 flex-shrink-0 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
        <FaTasks className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Discussion about{" "}
          <button type="button" onClick={() => ctx.onOpenTaskKey?.(taskId)} className="font-mono font-semibold text-indigo-600 dark:text-indigo-300 hover:underline">{taskKey(taskId)}</button>
          {" "}<span className="font-medium text-slate-800 dark:text-slate-100">{task?.title || message.system?.title || ""}</span>
        </p>
        <button type="button" onClick={() => onOpenThread(message)} className="mt-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          {message.replyCount ? `${message.replyCount} ${message.replyCount === 1 ? "reply" : "replies"} · last ${formatListTime(message.lastReplyAt)}` : "Open discussion"}
        </button>
      </div>
    </div>
  );
}

// ── Entity references (tasks, docs, releases) ──────────────────────────────
function TaskEntityCard({ task, ctx }) {
  const type = task.type || "task";
  const Icon = TASK_TYPE_ICON_META[type]?.icon || FaTasks;
  const assignee = Object.values(ctx.usersById).find((user) => user.username && user.username === task.assignedTo);
  return (
    <button type="button" onClick={() => ctx.onOpenTaskKey?.(task.id)} className={`${cardShell} flex items-center gap-3 px-3 py-2.5 text-left hover:border-indigo-300 dark:hover:border-indigo-500/40`}>
      <span className={`h-8 w-8 flex-shrink-0 rounded-lg flex items-center justify-center ${TASK_TYPE_CHIP_STYLES[type] || TASK_TYPE_CHIP_STYLES.task}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono font-semibold">{taskKey(task.id)}</span>
          {task.priority && <span className="inline-flex items-center gap-1 capitalize"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TASK_PRIORITY_HEX[task.priority] || "#94a3b8" }} />{task.priority}</span>}
          {task.archived && <span className="inline-flex items-center gap-1"><FaArchive className="w-2.5 h-2.5" /> Archived</span>}
          {task.storyPoint ? <span>{task.storyPoint} SP</span> : null}
        </span>
        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{task.title || "Untitled task"}</span>
      </span>
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TASK_STATUS_BADGE_STYLES[task.status] || TASK_STATUS_BADGE_STYLES.todo}`}>
        {TASK_STATUS_SHORT_LABELS[task.status] || task.status || "To Do"}
      </span>
      {assignee ? <UserAvatar user={assignee} size="sm" /> : <span className="h-6 w-6 rounded-md border border-dashed border-slate-300 dark:border-slate-600" title="Unassigned" />}
    </button>
  );
}

function DocEntityCard({ page, ctx }) {
  return (
    <button type="button" onClick={() => ctx.onOpenDoc?.(page.id)} className={`${cardShell} flex items-center gap-3 px-3 py-2.5 text-left hover:border-emerald-300 dark:hover:border-emerald-500/40`}>
      <span className="h-8 w-8 flex-shrink-0 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center text-base">
        {page.emoji || <FaBook className="w-3.5 h-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-slate-500 dark:text-slate-400">Doc page{page.updatedAt ? ` · updated ${formatListTime(new Date(page.updatedAt).getTime())}` : ""}</span>
        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{page.title || "Untitled page"}</span>
      </span>
      <FaExternalLinkAlt className="w-3 h-3 text-slate-400" />
    </button>
  );
}

const RELEASE_STATUS_STYLES = {
  released: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "code-freeze": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "rolled-back": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300",
  planned: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

function ReleaseEntityCard({ release, ctx }) {
  const taskIds = release.taskIds || [];
  const done = taskIds.filter((id) => ctx.resolveTask?.(id)?.status === "done").length;
  const percent = taskIds.length ? Math.round((done / taskIds.length) * 100) : null;
  const date = release.targetDate || release.releaseDate;
  return (
    <button type="button" onClick={() => ctx.onOpenRelease?.(release.id)} className={`${cardShell} block px-3 py-2.5 text-left hover:border-violet-300 dark:hover:border-violet-500/40`}>
      <span className="flex items-center gap-3">
        <span className="h-8 w-8 flex-shrink-0 rounded-lg bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 flex items-center justify-center">
          <FaTag className="w-3.5 h-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-slate-500 dark:text-slate-400">Release{date ? ` · ${new Date(date).toLocaleDateString()}` : ""}</span>
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{[release.version, release.name].filter(Boolean).join(" · ") || "Release"}</span>
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${RELEASE_STATUS_STYLES[release.status] || RELEASE_STATUS_STYLES.planned}`}>{String(release.status || "planned").replace("-", " ")}</span>
      </span>
      {percent !== null && (
        <span className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-[#232838]"><span className="block h-full rounded-full bg-violet-500" style={{ width: `${percent}%` }} /></span>
          {done}/{taskIds.length} tasks done
        </span>
      )}
    </button>
  );
}

/** Rich cards for up to three entities referenced in the message (text tokens + internal links). */
export function EntityCards({ message, ctx }) {
  const cards = useMemo(() => {
    const refs = extractReferences(message.text);
    extractUrls(message.text).forEach((url) => {
      const info = classifyUrl(url);
      if (info?.kind !== "internal") return;
      if (info.entity === "doc") refs.docs.push(info.id);
      if (info.entity === "release") refs.releases.push(info.id);
    });
    const list = [];
    [...new Set(refs.tasks)].forEach((key) => { const task = ctx.resolveTask?.(key); if (task) list.push({ kind: "task", id: key, task }); });
    [...new Set(refs.docs)].forEach((id) => { const page = ctx.resolveDoc?.(id); if (page) list.push({ kind: "doc", id, page }); });
    [...new Set(refs.releases)].forEach((id) => { const release = ctx.resolveRelease?.(id); if (release) list.push({ kind: "release", id, release }); });
    return list.slice(0, 3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.entityVersion, message.text]);
  if (!cards.length) return null;
  return (
    <div className="space-y-1.5">
      {cards.map((card) => {
        if (card.kind === "task") return <TaskEntityCard key={`t-${card.id}`} task={card.task} ctx={ctx} />;
        if (card.kind === "doc") return <DocEntityCard key={`d-${card.id}`} page={card.page} ctx={ctx} />;
        return <ReleaseEntityCard key={`r-${card.id}`} release={card.release} ctx={ctx} />;
      })}
    </div>
  );
}

// ── Link previews ───────────────────────────────────────────────────────────
const PROVIDER_ICONS = { GitHub: FaGithub, Figma: FaFigma, "Google Docs": FaGoogle, "Google Sheets": FaGoogle, "Google Slides": FaGoogle, "Google Forms": FaGoogle };

function VideoPreview({ info }) {
  const [playing, setPlaying] = useState(false);
  if (playing && info.embed) {
    return (
      <div className={`${cardShell} overflow-hidden`}>
        <div className="relative w-full pt-[56.25%]">
          <iframe
            src={`${info.embed}?autoplay=1`}
            title={info.title}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    );
  }
  return (
    <div className={`${cardShell} overflow-hidden`}>
      <button type="button" onClick={() => setPlaying(true)} className="group/video relative block w-full bg-slate-900" aria-label={`Play ${info.provider} video`}>
        {info.image ? (
          <img src={info.image} alt="" loading="lazy" className="aspect-video w-full object-cover opacity-90 group-hover/video:opacity-100" />
        ) : (
          <span className="flex aspect-video w-full items-center justify-center text-white/70"><FaVideo className="w-8 h-8" /></span>
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white shadow-lg group-hover/video:bg-red-600"><FaPlay className="ml-0.5 w-4 h-4" /></span>
        </span>
      </button>
      <a href={info.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 hover:underline">
        <FaVideo className="w-3 h-3" /> {info.provider} · {info.host}
      </a>
    </div>
  );
}

export function LinkPreviews({ message, canHide, onHide }) {
  const items = useMemo(() => {
    if (message.hidePreviews) return [];
    const stored = new Map((message.previews || []).map((preview) => [preview.url, preview]));
    return extractUrls(message.text)
      .map((url) => {
        const info = classifyUrl(url);
        if (!info || info.kind === "internal") return null;
        const meta = stored.get(url) || stored.get(info.url);
        if (info.generic && !meta) return null;
        return { info, meta };
      })
      .filter(Boolean);
  }, [message.hidePreviews, message.previews, message.text]);

  if (!items.length) return null;
  return (
    <div className="group/previews relative space-y-1.5">
      {items.map(({ info, meta }) => {
        if (info.kind === "video") return <VideoPreview key={info.url} info={info} />;
        if (info.kind === "image") {
          return (
            <a key={info.url} href={info.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block w-fit overflow-hidden rounded-lg border border-slate-200 dark:border-[#2a3044]">
              <img src={info.url} alt={info.title} loading="lazy" className="max-h-72 max-w-[min(420px,100%)] object-cover" />
            </a>
          );
        }
        const Icon = PROVIDER_ICONS[info.provider] || FaLink;
        return (
          <a key={info.url} href={info.url} target="_blank" rel="noopener noreferrer" className={`${cardShell} flex gap-3 overflow-hidden border-l-4 border-l-blue-400 px-3 py-2.5 hover:shadow-sm`}>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Icon className="w-3 h-3" /> {meta?.siteName || info.provider}
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-blue-700 dark:text-blue-300">{meta?.title || info.title}</span>
              {(meta?.description || info.subtitle) && (
                <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{meta?.description || info.subtitle}</span>
              )}
            </span>
            {meta?.image && <img src={meta.image} alt="" loading="lazy" className="h-16 w-16 flex-shrink-0 rounded-lg object-cover" />}
          </a>
        );
      })}
      {canHide && (
        <button
          type="button"
          onClick={onHide}
          title="Remove previews"
          aria-label="Remove link previews"
          className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white group-hover/previews:flex"
        >
          <FaTimes className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}
