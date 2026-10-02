import { db } from "../firebase";
import { createFirestoreChatBackend } from "./chatFirestoreBackend";
import { createLocalChatBackend } from "./chatLocalBackend";

/*
 * Chat persistence boundary. Chat is real-time, per-message data, so (like
 * HR) it does not go through the debounced `appData` domain documents.
 * Firestore is used whenever Firebase is initialised; otherwise (E2E mode,
 * tests) a localStorage backend with the same API takes over.
 */

let backend = null;

export function getChatBackend() {
  if (!backend) backend = db ? createFirestoreChatBackend(db) : createLocalChatBackend();
  return backend;
}

/** Test hook: swap the backend (pass `null` to reset to the default). */
export function setChatBackend(nextBackend) {
  backend = nextBackend;
}
