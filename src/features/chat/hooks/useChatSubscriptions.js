import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "../../../shared/context/ChatContext";
import { MESSAGE_PAGE_SIZE, TYPING_TTL_MS } from "../../../shared/services/chat/chatModel";

const EMPTY = [];

function mergePending(messages, pendingList) {
  if (!pendingList?.length) return messages;
  const ids = new Set(messages.map((message) => message.id));
  return [...messages, ...pendingList.filter((entry) => !ids.has(entry.id))];
}

/** Live, paged top-level messages of a channel (+ optimistic sends). */
export function useChannelMessages(channelId, initialPageSize = MESSAGE_PAGE_SIZE) {
  const { backend, pending } = useChat();
  const [state, setState] = useState({ channelId: null, messages: EMPTY, hasMore: false, loading: true, error: null });
  const [paging, setPaging] = useState({ channelId, size: initialPageSize });
  const pageSize = paging.channelId === channelId ? paging.size : initialPageSize;

  useEffect(() => {
    if (!channelId) return undefined;
    setState((prev) => (prev.channelId === channelId ? { ...prev, loading: true } : { channelId, messages: EMPTY, hasMore: false, loading: true, error: null }));
    return backend.subscribeMessages(
      channelId,
      pageSize,
      (messages, meta) => setState({ channelId, messages, hasMore: Boolean(meta?.hasMore), loading: false, error: null }),
      (error) => setState((prev) => ({ ...prev, loading: false, error: error?.message || "Messages could not be loaded." }))
    );
  }, [backend, channelId, pageSize]);

  const loadMore = useCallback(() => setPaging((prev) => ({
    channelId,
    size: (prev.channelId === channelId ? prev.size : initialPageSize) + MESSAGE_PAGE_SIZE,
  })), [channelId, initialPageSize]);

  const messages = useMemo(
    () => (state.channelId === channelId ? mergePending(state.messages, pending[channelId]) : EMPTY),
    [channelId, pending, state.channelId, state.messages]
  );

  return {
    messages,
    hasMore: state.channelId === channelId && state.hasMore,
    loading: state.channelId !== channelId || state.loading,
    error: state.error,
    loadMore,
    pageSize,
  };
}

/** Root message + live replies of one thread. */
export function useThreadMessages(channelId, rootId) {
  const { backend, pending } = useChat();
  const [root, setRoot] = useState(undefined);
  const [replies, setReplies] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId || !rootId) return undefined;
    setRoot(undefined);
    setReplies(EMPTY);
    setLoading(true);
    const unsubRoot = backend.subscribeMessage(channelId, rootId, setRoot, () => setRoot(null));
    const unsubReplies = backend.subscribeThread(channelId, rootId, (list) => { setReplies(list); setLoading(false); }, () => setLoading(false));
    return () => { unsubRoot(); unsubReplies(); };
  }, [backend, channelId, rootId]);

  const merged = useMemo(
    () => mergePending(replies, pending[`${channelId}/${rootId}`]),
    [channelId, pending, replies, rootId]
  );

  return { root, replies: merged, loading: loading || root === undefined };
}

export function usePinnedMessages(channelId, enabled = true) {
  const { backend } = useChat();
  const [pinned, setPinned] = useState(EMPTY);
  useEffect(() => {
    if (!channelId || !enabled) return undefined;
    setPinned(EMPTY);
    return backend.subscribePinned(channelId, setPinned, () => setPinned(EMPTY));
  }, [backend, channelId, enabled]);
  return pinned;
}

/** User ids currently typing in a channel (excluding the current user). */
export function useTypingUsers(channelId) {
  const { backend, uid } = useChat();
  const [typing, setTyping] = useState({});
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef(null);

  useEffect(() => {
    if (!channelId) return undefined;
    setTyping({});
    return backend.subscribeTyping(channelId, (value) => { setTyping(value || {}); setNow(Date.now()); }, () => {});
  }, [backend, channelId]);

  const active = useMemo(
    () => Object.entries(typing)
      .filter(([id, at]) => id !== uid && now - Number(at) < TYPING_TTL_MS)
      .map(([id]) => id),
    [now, typing, uid]
  );

  // Re-evaluate expiry while someone is typing.
  useEffect(() => {
    if (!active.length) return undefined;
    timerRef.current = window.setInterval(() => setNow(Date.now()), 1500);
    return () => window.clearInterval(timerRef.current);
  }, [active.length]);

  return active;
}

/** Live read markers of other members (DM / small-channel read receipts). */
export function useReadReceipts(channel, uid, enabled = true) {
  const { backend } = useChat();
  const [states, setStates] = useState({});
  const memberKey = (channel?.memberIds || []).filter((id) => id !== uid).slice(0, 8).join(",");
  useEffect(() => {
    if (!enabled || !channel?.id || !memberKey) return undefined;
    setStates({});
    const unsubs = memberKey.split(",").map((id) => backend.subscribeUserState(id, (state) => {
      setStates((prev) => ({ ...prev, [id]: { readSeq: state?.readSeq?.[channel.id] || 0, lastReadAt: state?.lastReadAt?.[channel.id] || 0 } }));
    }, () => {}));
    return () => unsubs.forEach((unsub) => unsub?.());
  }, [backend, channel?.id, enabled, memberKey]);
  return states;
}
