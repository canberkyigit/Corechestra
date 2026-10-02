import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { UNSAVED_CONFIRM_MESSAGE } from "../constants/docsMessages";
import { useConfirm } from "../../../shared/context/ConfirmContext";
import { useNavigationGuard } from "../../../shared/navigation/navigationGuard";

const DISCARD_DIALOG = {
  title: "Discard unsaved changes?",
  description: UNSAVED_CONFIRM_MESSAGE,
  confirmLabel: "Discard changes",
  cancelLabel: "Keep editing",
  tone: "danger",
};

/**
 * Tracks whether the open page editor has unsaved edits and asks before
 * switching pages/spaces inside Docs AND before leaving Docs through the app
 * shell (sidebar, palette, notifications). `dirtyRef` is shared with handlers
 * that reset it after a page/space disappears.
 *
 * `confirmDiscardChanges()` returns `true` synchronously when there is
 * nothing to lose (so clean navigation stays synchronous), otherwise a
 * Promise<boolean> from the confirm dialog. `whenDiscardConfirmed(fn)` wraps
 * both cases.
 */
export function useUnsavedChangesGuard() {
  const dirtyRef = useRef(false);
  const confirm = useConfirm();

  const handleDirtyChange = useCallback((dirty) => {
    dirtyRef.current = Boolean(dirty);
  }, []);

  const confirmDiscardChanges = useCallback(() => {
    if (!dirtyRef.current) return true;
    return confirm(DISCARD_DIALOG).then((ok) => {
      if (ok) dirtyRef.current = false;
      return ok;
    });
  }, [confirm]);

  const whenDiscardConfirmed = useCallback((callback) => {
    const result = confirmDiscardChanges();
    if (result === true) return callback();
    return result.then((ok) => (ok ? callback() : undefined));
  }, [confirmDiscardChanges]);

  useNavigationGuard(() => dirtyRef.current, {
    title: "Leave without saving?",
    description: "This doc page has unsaved edits. A local draft is kept, but the page itself won't be updated.",
    confirmLabel: "Leave page",
    onDiscard: () => { dirtyRef.current = false; },
  });

  return { dirtyRef, handleDirtyChange, confirmDiscardChanges, whenDiscardConfirmed };
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
