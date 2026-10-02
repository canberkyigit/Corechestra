import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { UNSAVED_CONFIRM_MESSAGE } from "../constants/docsMessages";

/**
 * Tracks whether the open page editor has unsaved edits and asks before
 * navigating away. `dirtyRef` is shared with handlers that reset it after a
 * page/space disappears.
 */
export function useUnsavedChangesGuard() {
  const dirtyRef = useRef(false);

  const handleDirtyChange = useCallback((dirty) => {
    dirtyRef.current = Boolean(dirty);
  }, []);

  const confirmDiscardChanges = useCallback(() => {
    if (!dirtyRef.current) return true;
    // eslint-disable-next-line no-alert
    const ok = window.confirm(UNSAVED_CONFIRM_MESSAGE);
    if (ok) dirtyRef.current = false;
    return ok;
  }, []);

  return { dirtyRef, handleDirtyChange, confirmDiscardChanges };
}

/**
 * Deep link: /docs?page=<id> (used by notifications and search results).
 * Calls `onOpen(page)` once per navigation entry when the page exists.
 */
export function useDocsDeepLink({ dbReady, docPages, onOpen }) {
  const location = useLocation();
  const handledDeepLinkRef = useRef(null);

  useEffect(() => {
    if (!dbReady) return;
    const params = new URLSearchParams(location?.search || "");
    const pageId = params.get("page");
    if (!pageId || handledDeepLinkRef.current === `${location.key}:${pageId}`) return;
    const page = docPages.find((entry) => entry.id === pageId);
    if (!page) return;
    handledDeepLinkRef.current = `${location.key}:${pageId}`;
    onOpen(page);
  }, [dbReady, docPages, location, onOpen]);
}
