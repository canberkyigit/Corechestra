export function buildMentionItems(users = [], query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  return users
    .map((user) => {
      if (typeof user === "string") return { id: user, label: user };
      const label = user?.name || user?.username || user?.email || "";
      const id = user?.username || user?.id || user?.email || label;
      return { id, label };
    })
    .filter((item) => item.id && item.label && (
      item.label.toLowerCase().includes(normalizedQuery)
      || item.id.toLowerCase().includes(normalizedQuery)
    ))
    .slice(0, 6);
}
