// Local backup of unsaved doc edits, so a draft survives browser Back, tab
// close or leaving Docs through the app shell. One entry per page.

const PREFIX = "corechestra_doc_draft:";

export function readDocDraft(pageId) {
  if (!pageId) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${pageId}`);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft && typeof draft.content === "string" ? draft : null;
  } catch {
    return null;
  }
}

export function writeDocDraft(pageId, { title, content }) {
  if (!pageId) return;
  try {
    localStorage.setItem(`${PREFIX}${pageId}`, JSON.stringify({ title, content, savedAt: new Date().toISOString() }));
  } catch {
    // Quota exceeded / storage disabled: the in-memory draft still works.
  }
}

export function clearDocDraft(pageId) {
  if (!pageId) return;
  try {
    localStorage.removeItem(`${PREFIX}${pageId}`);
  } catch {
    // ignore
  }
}

/** A stored draft is only worth offering when it differs from the saved page. */
export function getRecoverableDraft(page) {
  const draft = readDocDraft(page?.id);
  if (!draft) return null;
  const sameContent = (draft.content || "") === (page.content || "");
  const sameTitle = !draft.title || draft.title === page.title;
  if (sameContent && sameTitle) {
    clearDocDraft(page.id);
    return null;
  }
  return draft;
}
