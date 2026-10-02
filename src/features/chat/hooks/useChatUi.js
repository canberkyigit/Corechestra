import { useCallback, useEffect, useRef, useState } from "react";

function storageKey(uid, name) {
  return `corechestra_chat_${name}_${uid || "anon"}`;
}

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full / blocked: drafts simply stay in memory.
  }
}

/**
 * Per-browser drafts keyed by conversation ("channelId" or "channelId/rootId").
 * Draft text lives in a ref so typing doesn't re-render the whole page; only
 * the set of conversations that *have* a draft (sidebar pencil icons) is state.
 */
export function useChatDrafts(uid) {
  const key = storageKey(uid, "drafts");
  const draftsRef = useRef(readJson(key, {}));
  const [draftIds, setDraftIds] = useState(() => new Set(Object.keys(draftsRef.current)));
  const timerRef = useRef(null);

  useEffect(() => {
    draftsRef.current = readJson(key, {});
    setDraftIds(new Set(Object.keys(draftsRef.current)));
  }, [key]);

  useEffect(() => () => {
    window.clearTimeout(timerRef.current);
    writeJson(key, draftsRef.current);
  }, [key]);

  const setDraft = useCallback((conversation, text) => {
    const next = { ...draftsRef.current };
    const has = Boolean(text && text.trim());
    if (has) next[conversation] = text; else delete next[conversation];
    draftsRef.current = next;
    setDraftIds((prev) => {
      if (prev.has(conversation) === has) return prev;
      const ids = new Set(prev);
      if (has) ids.add(conversation); else ids.delete(conversation);
      return ids;
    });
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => writeJson(key, draftsRef.current), 400);
  }, [key]);

  const getDraft = useCallback((conversation) => draftsRef.current[conversation] || "", []);

  return { getDraft, setDraft, draftIds };
}

export function useStoredValue(uid, name, fallback) {
  const key = storageKey(uid, name);
  const [value, setValue] = useState(() => readJson(key, fallback));
  const update = useCallback((next) => {
    setValue((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      writeJson(key, resolved);
      return resolved;
    });
  }, [key]);
  return [value, update];
}

/** Calls `onDismiss` on outside mousedown or Escape while `active`. */
export function useDismiss(ref, onDismiss, active = true) {
  const handlerRef = useRef(onDismiss);
  handlerRef.current = onDismiss;
  useEffect(() => {
    if (!active) return undefined;
    const onMouseDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) handlerRef.current?.();
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        handlerRef.current?.();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [active, ref]);
}

const RECENT_EMOJI_KEY = "corechestra_chat_recent_emoji";

export function useRecentEmojis() {
  const [recent, setRecent] = useState(() => readJson(RECENT_EMOJI_KEY, []));
  const push = useCallback((emoji) => {
    setRecent((prev) => {
      const next = [emoji, ...prev.filter((entry) => entry !== emoji)].slice(0, 18);
      writeJson(RECENT_EMOJI_KEY, next);
      return next;
    });
  }, []);
  return [recent, push];
}

export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return mobile;
}
