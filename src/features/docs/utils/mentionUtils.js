export function buildMentionItems(users, query) {
  const normalizedQuery = (query || "").toLowerCase();

  return (users || [])
    .map((user) => {
      if (typeof user === "string") {
        return { id: user, label: user };
      }
      return {
        id: user?.username || user?.id || user?.email || user?.label,
        label: user?.name || user?.username || user?.email || user?.label,
      };
    })
    .filter((user) => user.id && user.label && user.label.toLowerCase().includes(normalizedQuery))
    .slice(0, 6);
}

function userHandles(user) {
  if (!user) return [];
  if (typeof user === "string") return [user.toLowerCase()];
  const handles = [];
  if (user.username) handles.push(String(user.username).toLowerCase());
  if (user.email) handles.push(String(user.email).split("@")[0].toLowerCase());
  return handles;
}

function userKey(user) {
  if (typeof user === "string") return user;
  return user?.username || (user?.email ? String(user.email).split("@")[0] : null) || user?.id || null;
}

/**
 * Returns the usernames (deduplicated) of known users mentioned as `@handle`
 * in `text`. Unknown handles are ignored so notifications only target real
 * people. Matching is case-insensitive against username and email local-part.
 */
export function extractMentionedUsernames(text, users) {
  if (!text) return [];
  const tokens = [...String(text).matchAll(/@([\w.-]+)/g)]
    .map((match) => match[1].replace(/[.-]+$/, "").toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return [];

  const result = [];
  const seen = new Set();
  tokens.forEach((token) => {
    const user = (users || []).find((candidate) => userHandles(candidate).includes(token));
    const key = userKey(user);
    if (key && !seen.has(key.toLowerCase())) {
      seen.add(key.toLowerCase());
      result.push(key);
    }
  });
  return result;
}

export function sameUser(left, right) {
  if (!left || !right) return false;
  return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
}
