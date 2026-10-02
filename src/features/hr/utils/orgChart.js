export const ORG_NODE_W = 164;
export const ORG_NODE_H = 94;
export const ORG_H_GAP = 52;
export const ORG_V_GAP = 80;
export const ORG_ROOT_KEY = "__organization__";

export function displayName(user) {
  return user?.name || user?.email?.split("@")[0] || "Unknown";
}

/**
 * Builds the org tree from People records (`appData/entities.users[].managerId`).
 * Nodes are keyed by user id (names may collide). Users caught in a managerId cycle are
 * attached as extra roots so nobody silently disappears from the chart.
 * Returns null when no manager relationship exists yet.
 */
export function buildTreeFromUsers(users, currentUserId, { allowFlat = false } = {}) {
  if (!users || users.length === 0) return null;
  const userMap = {};
  users.forEach((user) => { userMap[user.id] = user; });
  const hasAnyHierarchy = users.some((user) => user.managerId && userMap[user.managerId] && user.managerId !== user.id);
  if (!hasAnyHierarchy && !allowFlat) return null;

  const childrenByManager = {};
  users.forEach((user) => {
    if (user.managerId && userMap[user.managerId] && user.managerId !== user.id) {
      (childrenByManager[user.managerId] = childrenByManager[user.managerId] || []).push(user);
    }
  });

  const visited = new Set();
  function buildNode(user) {
    visited.add(user.id);
    const children = (childrenByManager[user.id] || []).filter((child) => !visited.has(child.id));
    children.forEach((child) => visited.add(child.id));
    return {
      key: user.id,
      name: displayName(user),
      role: user.title || user.role || "Team Member",
      dept: user.department || "",
      color: user.color || "#6366f1",
      reports: children.length,
      isMe: user.id === currentUserId,
      _userId: user.id,
      children: children.map(buildNode),
    };
  }

  const roots = users.filter((user) => !user.managerId || !userMap[user.managerId] || user.managerId === user.id);
  const rootNodes = roots.map(buildNode);
  // Anyone not reached is part of a managerId cycle: surface them as roots.
  users.forEach((user) => {
    if (!visited.has(user.id)) rootNodes.push({ ...buildNode(user), inCycle: true });
  });

  if (rootNodes.length === 1) return rootNodes[0];
  return {
    key: ORG_ROOT_KEY,
    name: "Organization",
    role: "",
    dept: "",
    color: "#6366f1",
    reports: rootNodes.length,
    isMe: false,
    _userId: null,
    children: rootNodes,
  };
}

export function buildOrgLayout(root) {
  function clone(node) {
    return { ...node, children: (node.children ?? []).map(clone) };
  }
  const tree = clone(root);

  function measure(node) {
    if (!node.children.length) {
      node._sw = ORG_NODE_W;
      return;
    }
    node.children.forEach(measure);
    const totalWidth = node.children.reduce((sum, child) => sum + child._sw, 0) + ORG_H_GAP * (node.children.length - 1);
    node._sw = Math.max(ORG_NODE_W, totalWidth);
  }

  function place(node, centerX, depth) {
    node._cx = centerX;
    node._depth = depth;
    if (!node.children.length) return;
    const totalWidth = node.children.reduce((sum, child) => sum + child._sw, 0) + ORG_H_GAP * (node.children.length - 1);
    let left = centerX - totalWidth / 2;
    for (const child of node.children) {
      place(child, left + child._sw / 2, depth + 1);
      left += child._sw + ORG_H_GAP;
    }
  }

  function flatten(node, parentKey) {
    const y = node._depth * (ORG_NODE_H + ORG_V_GAP);
    const x = node._cx - ORG_NODE_W / 2;
    const output = { nodes: [{ ...node, x, y, cx: node._cx, parentKey: parentKey || null }], edges: [] };
    for (const child of (node.children ?? [])) {
      const childY = child._depth * (ORG_NODE_H + ORG_V_GAP);
      output.edges.push({ fromKey: node.key, toKey: child.key, x1: node._cx, y1: y + ORG_NODE_H, x2: child._cx, y2: childY });
      const sub = flatten(child, node.key);
      output.nodes.push(...sub.nodes);
      output.edges.push(...sub.edges);
    }
    return output;
  }

  measure(tree);
  place(tree, tree._sw / 2, 0);
  const { nodes, edges } = flatten(tree, null);
  const xs = nodes.flatMap((node) => [node.x, node.x + ORG_NODE_W]);
  const ys = nodes.flatMap((node) => [node.y, node.y + ORG_NODE_H]);
  return {
    nodes,
    edges,
    bounds: {
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      ox: Math.min(...xs),
      oy: Math.min(...ys),
    },
  };
}

export function findNodeByKey(node, key) {
  if (!node) return null;
  if (node.key === key) return node;
  for (const child of (node.children ?? [])) {
    const found = findNodeByKey(child, key);
    if (found) return found;
  }
  return null;
}

export function findParentByKey(node, key) {
  if (!node) return null;
  for (const child of (node.children ?? [])) {
    if (child.key === key) return node;
    const found = findParentByKey(child, key);
    if (found) return found;
  }
  return null;
}

/** Manager chain (closest first) for `userId`, stopping on cycles. */
export function getManagerChain(users, userId) {
  const byId = new Map((users || []).map((user) => [user.id, user]));
  const chain = [];
  const seen = new Set([userId]);
  let current = byId.get(userId);
  while (current?.managerId && byId.has(current.managerId) && !seen.has(current.managerId)) {
    seen.add(current.managerId);
    current = byId.get(current.managerId);
    chain.push(current);
  }
  return chain;
}

export function getDirectReports(users, userId) {
  return (users || []).filter((user) => user.managerId === userId && user.id !== userId);
}

function collectSubtree(users, userId, seen = new Set()) {
  getDirectReports(users, userId).forEach((report) => {
    if (seen.has(report.id)) return;
    seen.add(report.id);
    collectSubtree(users, report.id, seen);
  });
  return seen;
}

/**
 * View filters for the org chart.
 *   all     → everyone
 *   mine    → my manager chain + me + my direct reports
 *   focus   → focus person's manager chain + focus person + their whole team (subtree)
 * Users outside the view keep only managerIds that point into the view, so the tree stays connected.
 */
export function filterUsersForView(users, mode, { currentUserId, focusUserId } = {}) {
  if (!users?.length || mode === "all") return users || [];
  const anchorId = mode === "focus" ? focusUserId : currentUserId;
  if (!anchorId || !users.some((user) => user.id === anchorId)) return users;
  const include = new Set([anchorId]);
  getManagerChain(users, anchorId).forEach((user) => include.add(user.id));
  if (mode === "focus") {
    collectSubtree(users, anchorId).forEach((id) => include.add(id));
  } else {
    getDirectReports(users, anchorId).forEach((user) => include.add(user.id));
  }
  return users
    .filter((user) => include.has(user.id))
    .map((user) => (user.managerId && !include.has(user.managerId) ? { ...user, managerId: null } : user));
}

export function buildOrgCsvRows(users) {
  const byId = new Map((users || []).map((user) => [user.id, user]));
  const header = ["Name", "Email", "Title", "Role", "Department", "Manager", "Manager email", "Direct reports"];
  const rows = (users || []).map((user) => {
    const manager = user.managerId ? byId.get(user.managerId) : null;
    return [
      displayName(user),
      user.email || "",
      user.title || "",
      user.role || "",
      user.department || "",
      manager ? displayName(manager) : "",
      manager?.email || "",
      getDirectReports(users, user.id).length,
    ];
  });
  return [header, ...rows];
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncate(ctx, text, maxWidth) {
  let value = String(text || "");
  if (ctx.measureText(value).width <= maxWidth) return value;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1);
  return `${value}…`;
}

/**
 * Renders the laid-out chart onto a canvas and resolves with a PNG Blob.
 * Resolves null when canvas rendering is unavailable (e.g. jsdom).
 */
export function renderOrgChartPng(layout, { dark = false, scale = 2 } = {}) {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || !layout?.nodes?.length) { resolve(null); return; }
    const pad = 40;
    const { bounds, nodes, edges } = layout;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil((bounds.width + pad * 2) * scale);
    canvas.height = Math.ceil((bounds.height + pad * 2) * scale);
    let ctx = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    if (!ctx) { resolve(null); return; }

    const colors = dark
      ? { bg: "#080b14", card: "#1c2030", border: "#2a3044", text: "#f1f5f9", sub: "#94a3b8", edge: "#2a3044", me: "#10b981" }
      : { bg: "#f8fafc", card: "#ffffff", border: "#e2e8f0", text: "#1e293b", sub: "#64748b", edge: "#cbd5e1", me: "#10b981" };

    ctx.scale(scale, scale);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, bounds.width + pad * 2, bounds.height + pad * 2);
    ctx.translate(pad - bounds.ox, pad - bounds.oy);

    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 1.5;
    edges.forEach((edge) => {
      const midY = (edge.y1 + edge.y2) / 2;
      ctx.beginPath();
      ctx.moveTo(edge.x1, edge.y1);
      ctx.bezierCurveTo(edge.x1, midY, edge.x2, midY, edge.x2, edge.y2);
      ctx.stroke();
    });

    nodes.forEach((node) => {
      roundRect(ctx, node.x, node.y, ORG_NODE_W, ORG_NODE_H, 14);
      ctx.fillStyle = colors.card;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = node.isMe ? colors.me : colors.border;
      ctx.stroke();

      const cx = node.x + ORG_NODE_W / 2;
      ctx.beginPath();
      ctx.arc(cx, node.y + 24, 14, 0, Math.PI * 2);
      ctx.fillStyle = node.color || "#6366f1";
      ctx.fill();
      const initials = String(node.name || "?").split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials, cx, node.y + 24);

      ctx.fillStyle = colors.text;
      ctx.font = "600 11px sans-serif";
      ctx.fillText(truncate(ctx, node.name, ORG_NODE_W - 16), cx, node.y + 52);
      ctx.fillStyle = colors.sub;
      ctx.font = "10px sans-serif";
      ctx.fillText(truncate(ctx, node.role, ORG_NODE_W - 16), cx, node.y + 68);
      if (node.reports > 0) ctx.fillText(`${node.reports} report${node.reports === 1 ? "" : "s"}`, cx, node.y + 83);
    });

    if (typeof canvas.toBlob === "function") {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } else {
      resolve(null);
    }
  });
}
