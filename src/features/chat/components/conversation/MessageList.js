import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FaArrowDown, FaArrowUp, FaCheckDouble } from "react-icons/fa";
import { buildMessageRows } from "../../../../shared/services/chat/chatModel";
import { formatDayDivider, formatMessageTime } from "../../utils/chatTime";
import MessageItem from "./MessageItem";

const BOTTOM_THRESHOLD = 96;
const MAX_HIGHLIGHT_PAGES = 12;
/** Above this many rows the list is windowed; below it everything renders (and day dividers stay sticky). */
export const VIRTUALIZE_THRESHOLD = 150;

/**
 * The rule stays in the flow; only the date pill sticks to the top while you
 * scroll, so the line never draws across the messages underneath it.
 */
function DayDivider({ at, sticky }) {
  const pill = (
    <span className="rounded-full border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] px-3 py-0.5 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
      {formatDayDivider(at)}
    </span>
  );
  if (!sticky) {
    return (
      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-x-5 top-1/2 border-t border-slate-200 dark:border-[#2a3044]" />
        <span className="relative">{pill}</span>
      </div>
    );
  }
  return (
    <>
      <div className="mx-5 mt-[18px] border-t border-slate-200 dark:border-[#2a3044]" aria-hidden="true" />
      <div className="pointer-events-none sticky top-1.5 z-[5] -mt-[11px] mb-2 flex justify-center">
        <span className="pointer-events-auto">{pill}</span>
      </div>
    </>
  );
}

function NewDivider() {
  return (
    <div className="relative flex items-center py-1.5 px-5" role="separator" aria-label="New messages" data-new-divider="true">
      <div className="flex-1 border-t border-red-400/70" />
      <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-red-500">New</span>
    </div>
  );
}

export default function MessageList({
  conversationId,
  messages,
  loading,
  hasMore,
  loadMore,
  lastReadAt = 0,
  ctx,
  channel,
  handlers,
  editingId,
  highlightId,
  onHighlightDone,
  savedIds,
  canEditMessage,
  canDeleteMessage,
  canPin,
  canCreateTask,
  threadUnreadIds,
  intro,
  onAtBottomChange,
  onMarkRead,
  footerFor = null,
  footer,
}) {
  const scrollRef = useRef(null);
  const atBottomRef = useRef(true);
  const prevRef = useRef({ conversationId: null, firstId: null, lastId: null, height: 0, count: 0 });
  const [showJump, setShowJump] = useState(false);
  const [unseenBelow, setUnseenBelow] = useState(0);
  const [newAbove, setNewAbove] = useState(false);
  const highlightAttemptsRef = useRef(0);
  // Freeze the "New" divider position for the visit (it should not jump as you read).
  const frozenReadRef = useRef({ conversationId: null, lastReadAt: 0 });
  if (frozenReadRef.current.conversationId !== conversationId) {
    frozenReadRef.current = { conversationId, lastReadAt };
  }

  const rows = useMemo(
    () => buildMessageRows(messages, { lastReadAt: frozenReadRef.current.lastReadAt, currentUserId: ctx.uid }),
    [ctx.uid, messages]
  );
  const newIndex = useMemo(() => rows.findIndex((row) => row.kind === "new"), [rows]);
  const newCount = useMemo(
    () => (newIndex < 0 ? 0 : rows.slice(newIndex).filter((row) => row.kind === "message" && !row.message.system && row.message.authorId !== ctx.uid).length),
    [ctx.uid, newIndex, rows]
  );
  const firstNewAt = newIndex >= 0 ? rows.slice(newIndex).find((row) => row.kind === "message")?.message.createdAt : null;
  const virtual = rows.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: virtual ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      if (!row) return 48;
      if (row.kind !== "message") return 36;
      const message = row.message;
      let size = row.grouped ? 30 : 62;
      if (message.attachments?.length) size += 160;
      if (message.poll) size += 140;
      if (message.replyCount) size += 28;
      if (Object.keys(message.reactions || {}).length) size += 30;
      size += Math.min(200, Math.floor((message.text?.length || 0) / 90) * 22);
      return size;
    },
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan: 10,
  });

  const setAtBottom = useCallback((value) => {
    if (atBottomRef.current === value) return;
    atBottomRef.current = value;
    setShowJump(!value);
    if (value) setUnseenBelow(0);
    onAtBottomChange?.(value);
  }, [onAtBottomChange]);

  const scrollToBottom = useCallback((behavior = "auto") => {
    const node = scrollRef.current;
    if (!node) return;
    if (virtual && rows.length) virtualizer.scrollToIndex(rows.length - 1, { align: "end" });
    if (node.scrollTo) node.scrollTo({ top: node.scrollHeight, behavior });
    else node.scrollTop = node.scrollHeight;
    setAtBottom(true);
  }, [rows.length, setAtBottom, virtual, virtualizer]);

  /** Scrolls a row into view (works for windowed rows too). */
  const scrollToRow = useCallback((index, align = "center") => {
    const node = scrollRef.current;
    if (!node || index < 0) return false;
    if (virtual) {
      virtualizer.scrollToIndex(index, { align });
      return true;
    }
    const id = rows[index]?.id;
    const target = id ? node.querySelector(`[data-row-id="${String(id).replace(/"/g, "")}"]`) : null;
    if (!target) return false;
    target.scrollIntoView?.({ block: align === "start" ? "start" : "center" });
    return true;
  }, [rows, virtual, virtualizer]);

  const updateNewAbove = useCallback(() => {
    const node = scrollRef.current;
    if (!node || newIndex < 0) { setNewAbove(false); return; }
    if (virtual) {
      const first = virtualizer.getVirtualItems()[0];
      setNewAbove(Boolean(first && first.index > newIndex));
      return;
    }
    const divider = node.querySelector("[data-new-divider]");
    setNewAbove(Boolean(divider && divider.offsetTop + divider.offsetHeight < node.scrollTop));
  }, [newIndex, virtual, virtualizer]);

  // Keep the viewport stable when older pages are prepended and follow new messages at the bottom.
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const prev = prevRef.current;
    const firstId = messages[0]?.id || null;
    const last = messages[messages.length - 1] || null;
    const lastId = last?.id || null;

    if (prev.conversationId !== conversationId) {
      if (messages.length && !loading) {
        if (newIndex >= 0 && !highlightId) {
          if (!scrollToRow(newIndex, "start")) node.scrollTop = node.scrollHeight;
          window.requestAnimationFrame(() => {
            const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
            setAtBottom(distance < BOTTOM_THRESHOLD);
          });
        } else {
          if (virtual) virtualizer.scrollToIndex(rows.length - 1, { align: "end" });
          node.scrollTop = node.scrollHeight;
          setAtBottom(true);
        }
        prevRef.current = { conversationId, firstId, lastId, height: node.scrollHeight, count: messages.length };
      }
      return;
    }

    if (firstId !== prev.firstId && lastId === prev.lastId) {
      node.scrollTop += node.scrollHeight - prev.height;
    } else if (lastId !== prev.lastId) {
      const mine = last?.authorId === ctx.uid;
      if (atBottomRef.current || mine) {
        if (virtual) virtualizer.scrollToIndex(rows.length - 1, { align: "end" });
        node.scrollTop = node.scrollHeight;
        setAtBottom(true);
      } else {
        const added = Math.max(1, messages.length - prev.count);
        setUnseenBelow((value) => value + added);
      }
    } else if (atBottomRef.current) {
      // Content grew (images loaded, reactions, edits) – stay pinned to the bottom.
      node.scrollTop = node.scrollHeight;
    }
    prevRef.current = { conversationId, firstId, lastId, height: node.scrollHeight, count: messages.length };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, ctx.uid, highlightId, loading, messages, setAtBottom]);

  // Images finishing loading change the height after layout.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;
    const onLoad = () => {
      if (atBottomRef.current) node.scrollTop = node.scrollHeight;
      prevRef.current.height = node.scrollHeight;
    };
    node.addEventListener("load", onLoad, true);
    return () => node.removeEventListener("load", onLoad, true);
  }, []);

  // Jump to a specific message (deep links, search, pinned, saved).
  useEffect(() => {
    if (!highlightId || loading) return undefined;
    const index = rows.findIndex((row) => row.kind === "message" && row.id === highlightId);
    if (index >= 0) {
      highlightAttemptsRef.current = 0;
      scrollToRow(index, "center");
      const timer = window.setTimeout(() => onHighlightDone?.(), 2600);
      return () => window.clearTimeout(timer);
    }
    if (hasMore && highlightAttemptsRef.current < MAX_HIGHLIGHT_PAGES) {
      highlightAttemptsRef.current += 1;
      loadMore();
    } else {
      highlightAttemptsRef.current = 0;
      onHighlightDone?.(false);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, highlightId, loadMore, loading, rows, onHighlightDone]);

  useEffect(() => { updateNewAbove(); }, [rows, updateNewAbove]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    setAtBottom(distance < BOTTOM_THRESHOLD);
    updateNewAbove();
    if (node.scrollTop < 160 && hasMore && !loading) {
      prevRef.current.height = node.scrollHeight;
      loadMore();
    }
  };

  const renderRow = (row) => {
    if (row.kind === "date") return <DayDivider at={row.at} sticky={!virtual} />;
    if (row.kind === "new") return <NewDivider />;
    const { message } = row;
    return (
      <MessageItem
        message={message}
        grouped={row.grouped}
        ctx={ctx}
        channel={channel}
        saved={savedIds?.has(message.id)}
        canEdit={canEditMessage(message)}
        canDelete={canDeleteMessage(message)}
        canPin={canPin}
        canCreateTask={canCreateTask}
        editing={editingId === message.id}
        highlighted={highlightId === message.id}
        threadUnread={threadUnreadIds?.has(message.id)}
        footer={footerFor?.messageId === message.id ? footerFor.node : null}
        handlers={handlers}
      />
    );
  };

  return (
    <div className="relative flex-1 min-h-0">
      {newAbove && newCount > 0 && (
        <div className="absolute inset-x-0 top-2 z-10 flex justify-center px-4">
          <div className="flex items-center gap-1 rounded-full bg-blue-600 pl-3 pr-1 py-1 text-xs font-semibold text-white shadow-lg" data-testid="chat-new-banner">
            <button type="button" onClick={() => scrollToRow(newIndex, "start")} className="inline-flex items-center gap-1.5 hover:underline">
              <FaArrowUp className="w-2.5 h-2.5" /> {newCount} new message{newCount === 1 ? "" : "s"}{firstNewAt ? ` since ${formatMessageTime(firstNewAt)}` : ""}
            </button>
            {onMarkRead && (
              <button type="button" onClick={() => { onMarkRead(); setNewAbove(false); }} className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 hover:bg-white/25">
                <FaCheckDouble className="w-2.5 h-2.5" /> Mark read
              </button>
            )}
          </div>
        </div>
      )}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        data-testid="chat-message-list"
        data-virtualized={virtual ? "true" : "false"}
      >
        <div className="flex min-h-full flex-col justify-end pb-3">
          {hasMore ? (
            <div className="py-4 text-center">
              <button type="button" onClick={loadMore} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                {loading ? "Loading…" : "Load older messages"}
              </button>
            </div>
          ) : (!loading && intro)}

          {loading && !messages.length && (
            <div className="space-y-4 px-5 py-6" aria-label="Loading messages">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700/50" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700/50" />
                    <div className={`h-3 rounded bg-slate-200 dark:bg-slate-700/50 ${index % 2 ? "w-2/3" : "w-11/12"}`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {virtual ? (
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((item) => {
                const row = rows[item.index];
                if (!row) return null;
                return (
                  <div
                    key={item.key}
                    data-index={item.index}
                    data-row-id={row.id}
                    ref={virtualizer.measureElement}
                    className="absolute left-0 top-0 w-full"
                    style={{ transform: `translateY(${item.start}px)` }}
                  >
                    {renderRow(row)}
                  </div>
                );
              })}
            </div>
          ) : rows.map((row) => (
            <div key={row.id} data-row-id={row.id} className={row.kind === "date" ? "contents" : undefined}>
              {renderRow(row)}
            </div>
          ))}
          {footer}
        </div>
      </div>

      {showJump && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg hover:bg-blue-500"
        >
          <FaArrowDown className="w-3 h-3" />
          {unseenBelow > 0 ? `${unseenBelow} new message${unseenBelow === 1 ? "" : "s"}` : "Jump to latest"}
        </button>
      )}
    </div>
  );
}
