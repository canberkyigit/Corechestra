import { CHANNEL_KINDS, CHANNEL_TYPES, createChatId, isChannelMember, isStarred } from "../../../shared/services/chat/chatModel";

/*
 * Sidebar layout. Stored per user in `userState.sidebar`:
 *   sections:  [{ id, name }]               custom sections, in order
 *   placement: { [channelId]: sectionId }    conversations moved into a custom section
 *   order:     { [sectionId]: [channelId] }  manual order inside any section
 * Built-in sections: starred, projects, channels, dms. Unplaced
 * conversations fall back to their default section; anything not in `order`
 * is appended using the section's default sort.
 */

export const BUILTIN_SECTIONS = {
  starred: { id: "starred", name: "Starred" },
  projects: { id: "projects", name: "Projects" },
  channels: { id: "channels", name: "Channels" },
  dms: { id: "dms", name: "Direct messages" },
};

function defaultSectionFor(channel, userState) {
  if (isStarred(channel.id, userState)) return "starred";
  if (channel.type === CHANNEL_TYPES.DM) return "dms";
  if (channel.kind === CHANNEL_KINDS.PROJECT) return "projects";
  return "channels";
}

function defaultSort(sectionId, getName) {
  if (sectionId === "dms") return (a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
  if (sectionId === "channels") return (a, b) => (Number(b.isDefault) - Number(a.isDefault)) || a.name.localeCompare(b.name);
  return (a, b) => getName(a).localeCompare(getName(b));
}

export function getSidebarConfig(userState) {
  const sidebar = userState?.sidebar || {};
  return {
    sections: Array.isArray(sidebar.sections) ? sidebar.sections.filter((section) => section?.id && section?.name) : [],
    placement: sidebar.placement && typeof sidebar.placement === "object" ? sidebar.placement : {},
    order: sidebar.order && typeof sidebar.order === "object" ? sidebar.order : {},
  };
}

/**
 * Sections to render, each `{ id, name, custom, items: channel[] }`.
 * `isVisible(channel)` filters conversations (archived, hidden DMs, search).
 */
export function buildSidebarSections({ channels, uid, userState, getName, isVisible = () => true }) {
  const config = getSidebarConfig(userState);
  const customIds = new Set(config.sections.map((section) => section.id));
  const buckets = new Map();
  [...Object.keys(BUILTIN_SECTIONS), ...customIds].forEach((id) => buckets.set(id, []));

  (channels || []).forEach((channel) => {
    if (!isChannelMember(channel, uid) || !isVisible(channel)) return;
    const placed = config.placement[channel.id];
    const sectionId = placed && customIds.has(placed) ? placed : defaultSectionFor(channel, userState);
    buckets.get(sectionId).push(channel);
  });

  const ordered = (sectionId) => {
    const list = [...(buckets.get(sectionId) || [])].sort(defaultSort(sectionId, getName));
    const order = config.order[sectionId] || [];
    if (!order.length) return list;
    const rank = new Map(order.map((id, index) => [id, index]));
    return list
      .map((channel, index) => ({ channel, index }))
      .sort((a, b) => {
        const left = rank.has(a.channel.id) ? rank.get(a.channel.id) : order.length + a.index;
        const right = rank.has(b.channel.id) ? rank.get(b.channel.id) : order.length + b.index;
        return left - right;
      })
      .map((entry) => entry.channel);
  };

  return [
    { ...BUILTIN_SECTIONS.starred, custom: false, items: ordered("starred") },
    ...config.sections.map((section) => ({ id: section.id, name: section.name, custom: true, items: ordered(section.id) })),
    { ...BUILTIN_SECTIONS.projects, custom: false, items: ordered("projects") },
    { ...BUILTIN_SECTIONS.channels, custom: false, items: ordered("channels") },
    { ...BUILTIN_SECTIONS.dms, custom: false, items: ordered("dms") },
  ];
}

/** Flattened navigation order (Alt+↑/↓). */
export function sidebarNavigationOrder(sections) {
  return sections.flatMap((section) => section.items);
}

/**
 * Patch for `userState.sidebar` after dragging `channelId` from one section
 * to `toSectionId` at `toIndex`. `sections` is the rendered layout. Returns
 * `{ sidebar, starred? }` — moving into/out of "starred" toggles the star.
 */
export function planSidebarMove({ sections, channelId, fromSectionId, toSectionId, toIndex, userState }) {
  const config = getSidebarConfig(userState);
  const target = sections.find((section) => section.id === toSectionId);
  if (!target) return null;
  const channel = sections.flatMap((section) => section.items).find((item) => item.id === channelId);
  if (!channel) return null;

  // Built-in sections only accept conversations that belong there.
  if (!target.custom && toSectionId !== fromSectionId) {
    const natural = channel.type === CHANNEL_TYPES.DM ? "dms" : channel.kind === CHANNEL_KINDS.PROJECT ? "projects" : "channels";
    if (toSectionId !== "starred" && toSectionId !== natural) return null;
  }

  const ids = target.items.map((item) => item.id).filter((id) => id !== channelId);
  ids.splice(Math.max(0, Math.min(toIndex, ids.length)), 0, channelId);

  const placement = { ...config.placement };
  if (target.custom) placement[channelId] = toSectionId;
  else delete placement[channelId];

  const order = { ...config.order, [toSectionId]: ids };
  if (fromSectionId !== toSectionId && order[fromSectionId]) {
    order[fromSectionId] = order[fromSectionId].filter((id) => id !== channelId);
  }

  let starred;
  if (toSectionId === "starred" && fromSectionId !== "starred") starred = true;
  if (fromSectionId === "starred" && toSectionId !== "starred") starred = false;

  return { sidebar: { sections: config.sections, placement, order }, starred };
}

export function addSidebarSection(userState, name) {
  const config = getSidebarConfig(userState);
  const clean = String(name || "").trim().slice(0, 40);
  if (!clean) return null;
  const section = { id: createChatId("sec"), name: clean };
  return { section, sidebar: { ...config, sections: [...config.sections, section] } };
}

export function renameSidebarSection(userState, sectionId, name) {
  const config = getSidebarConfig(userState);
  const clean = String(name || "").trim().slice(0, 40);
  if (!clean) return null;
  return { ...config, sections: config.sections.map((section) => (section.id === sectionId ? { ...section, name: clean } : section)) };
}

/** Removes a custom section; its conversations return to their default sections. */
export function removeSidebarSection(userState, sectionId) {
  const config = getSidebarConfig(userState);
  const placement = Object.fromEntries(Object.entries(config.placement).filter(([, value]) => value !== sectionId));
  const order = { ...config.order };
  delete order[sectionId];
  return { sections: config.sections.filter((section) => section.id !== sectionId), placement, order };
}

export function moveSidebarSection(userState, sectionId, direction) {
  const config = getSidebarConfig(userState);
  const index = config.sections.findIndex((section) => section.id === sectionId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= config.sections.length) return null;
  const sections = [...config.sections];
  [sections[index], sections[target]] = [sections[target], sections[index]];
  return { ...config, sections };
}

export function placeInSection(userState, channelId, sectionId) {
  const config = getSidebarConfig(userState);
  const placement = { ...config.placement };
  if (sectionId) placement[channelId] = sectionId; else delete placement[channelId];
  return { ...config, placement };
}
