export const E2E_MODE = process.env.REACT_APP_E2E === "1";

export const E2E_DOMAINS_KEY = "corechestra_e2e_domains";
export const E2E_AUTH_USERS_KEY = "corechestra_e2e_auth_users";
export const E2E_SESSION_KEY = "corechestra_e2e_session";
export const E2E_EVENT_NAME = "corechestra:e2e-update";
export const E2E_CHANNEL_NAME = "corechestra-e2e-sync";

export function isE2EMode() {
  return E2E_MODE;
}

export function readE2EJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeE2EJson(key, value) {
  if (typeof window === "undefined") return;
  if (value === null || value === undefined) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
  window.dispatchEvent(new CustomEvent(E2E_EVENT_NAME, {
    detail: { key, value },
  }));

  if (typeof window.BroadcastChannel === "function") {
    const channel = new window.BroadcastChannel(E2E_CHANNEL_NAME);
    channel.postMessage({ key });
    channel.close();
  }
}

export function subscribeE2EKey(key, callback) {
  if (typeof window === "undefined") return () => {};
  const channel = typeof window.BroadcastChannel === "function"
    ? new window.BroadcastChannel(E2E_CHANNEL_NAME)
    : null;

  const handleStorage = (event) => {
    if (event.key !== key) return;
    callback(readE2EJson(key, null));
  };

  const handleCustom = (event) => {
    if (event.detail?.key !== key) return;
    callback(readE2EJson(key, null));
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(E2E_EVENT_NAME, handleCustom);
  channel?.addEventListener("message", (event) => {
    if (event.data?.key !== key) return;
    callback(readE2EJson(key, null));
  });

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(E2E_EVENT_NAME, handleCustom);
    channel?.close();
  };
}

export function readE2EDomains() {
  return readE2EJson(E2E_DOMAINS_KEY, {});
}

export function writeE2EDomains(domains) {
  writeE2EJson(E2E_DOMAINS_KEY, domains);
}

export function readE2EAuthUsers() {
  return readE2EJson(E2E_AUTH_USERS_KEY, []);
}

export function writeE2EAuthUsers(users) {
  writeE2EJson(E2E_AUTH_USERS_KEY, users);
}

export function readE2ESession() {
  return readE2EJson(E2E_SESSION_KEY, null);
}

export function writeE2ESession(session) {
  writeE2EJson(E2E_SESSION_KEY, session);
}

export function updateE2EAuthUserRole(uid, role) {
  const users = readE2EAuthUsers();
  const nextUsers = users.map((user) => (
    user.uid === uid ? { ...user, role } : user
  ));
  writeE2EAuthUsers(nextUsers);

  const session = readE2ESession();
  if (session?.uid === uid) {
    writeE2ESession({ ...session, role });
  }
}

export function upsertE2EAuthUser(uid, updates) {
  const users = readE2EAuthUsers();
  const index = users.findIndex((user) => user.uid === uid);
  const nextUsers = [...users];

  if (index >= 0) {
    nextUsers[index] = { ...nextUsers[index], ...updates };
  } else {
    nextUsers.push({ uid, role: "member", ...updates });
  }

  writeE2EAuthUsers(nextUsers);

  const session = readE2ESession();
  if (session?.uid === uid) {
    writeE2ESession({ ...session, ...updates });
  }
}
