const FALLBACK_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#6366f1", "#f59e0b", "#14b8a6", "#ef4444"];

const hashString = (value) => {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

/** Finds a People record by username, id or email. */
export function findUser(users, key) {
  if (!key || key === "unassigned") return null;
  return (users || []).find((user) => (
    typeof user === "object" && (user.username === key || user.id === key || user.email === key)
  )) || null;
}

/** Stable avatar color for a user: their configured color, else a hash-derived one. */
export function getUserColor(key, users) {
  if (!key || key === "unassigned") return "#94a3b8";
  const user = findUser(users, key);
  if (user?.color) return user.color;
  return FALLBACK_COLORS[hashString(key) % FALLBACK_COLORS.length];
}

export function getUserDisplayName(key, users, teamMembers) {
  if (!key || key === "unassigned") return "Unassigned";
  const member = (teamMembers || []).find((item) => item.value === key);
  if (member?.label) return member.label;
  const user = findUser(users, key);
  return user?.name || user?.username || key;
}

export function getInitial(name) {
  const text = String(name || "").trim();
  return text ? text.charAt(0).toUpperCase() : "?";
}
