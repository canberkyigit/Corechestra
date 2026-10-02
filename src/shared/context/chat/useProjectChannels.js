import { useCallback, useEffect, useRef } from "react";
import {
  CHANNEL_KINDS,
  CHANNEL_TYPES,
  projectChannelId,
  slugifyChannelName,
} from "../../services/chat/chatModel";

function uniqueProjectChannelName(project, channels, id) {
  const base = slugifyChannelName(project.key ? `${project.name}` : project.name) || slugifyChannelName(project.key) || "project";
  const taken = new Set((channels || []).filter((channel) => channel.id !== id && channel.type !== CHANNEL_TYPES.DM).map((channel) => channel.name));
  if (!taken.has(base)) return base;
  const withSuffix = `${base}-project`;
  return taken.has(withSuffix) ? `${base}-${String(project.id).slice(-4)}` : withSuffix;
}

/** Project members as People ids (no `memberUsernames` = everyone). */
export function projectMemberIds(project, users) {
  const usernames = Array.isArray(project?.memberUsernames) ? project.memberUsernames.filter(Boolean) : [];
  if (!usernames.length) return null;
  const wanted = new Set(usernames.map((name) => String(name).toLowerCase()));
  return (users || []).filter((user) => wanted.has(String(user.username || "").toLowerCase())).map((user) => user.id);
}

export function buildProjectChannel(project, { uid, users, channels, now = Date.now() }) {
  const id = projectChannelId(project.id);
  return {
    id,
    type: CHANNEL_TYPES.CHANNEL,
    kind: CHANNEL_KINDS.PROJECT,
    name: uniqueProjectChannelName(project, channels, id),
    description: `Updates and discussion for the ${project.name} project. Task, sprint, release and test events are posted here automatically.`,
    topic: "",
    isPrivate: false,
    isDefault: false,
    memberIds: projectMemberIds(project, users) || [uid],
    adminIds: [],
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    seq: 0,
    archived: false,
    projectId: project.id,
    botEvents: {},
  };
}

/**
 * Keeps one public channel per project and joins the current user to the
 * channels of projects they belong to (once — leaving is respected via
 * `userState.autoJoined`).
 */
export function useProjectChannels({ backend, enabled, uid, channelsRaw, projects, users, userState, onJoined }) {
  const ensuredRef = useRef(new Set());
  const joiningRef = useRef(new Set());

  const latestRef = useRef({ channelsRaw, users });
  latestRef.current = { channelsRaw, users };

  // Stable identity (reads the latest data from a ref) so it can live in the actions context.
  const ensureProjectChannel = useCallback(async (project) => {
    if (!project?.id || !uid) return null;
    const { channelsRaw: latestChannels, users: latestUsers } = latestRef.current;
    const channel = buildProjectChannel(project, { uid, users: latestUsers, channels: latestChannels || [] });
    return backend.ensureChannel(channel);
  }, [backend, uid]);

  useEffect(() => {
    if (!enabled || !channelsRaw || !userState) return;
    const byId = new Map(channelsRaw.map((channel) => [channel.id, channel]));
    (projects || []).forEach((project) => {
      if (!project?.id || project.archived || project.status === "archived") return;
      const id = projectChannelId(project.id);
      const existing = byId.get(id);
      if (!existing) {
        if (ensuredRef.current.has(id)) return;
        ensuredRef.current.add(id);
        ensureProjectChannel(project).catch(() => ensuredRef.current.delete(id));
        return;
      }
      const memberIds = projectMemberIds(project, users);
      const belongs = memberIds === null || memberIds.includes(uid);
      if (!belongs || existing.memberIds.includes(uid) || userState?.autoJoined?.[id] || joiningRef.current.has(id)) return;
      joiningRef.current.add(id);
      backend.addChannelMembers(id, [uid], Date.now())
        .then(() => backend.updateUserState(uid, {
          autoJoined: { [id]: true },
          readSeq: { [id]: existing.seq || 0 },
          lastReadAt: { [id]: Date.now() },
        }))
        .then(() => onJoined?.(existing))
        .catch(() => {})
        .finally(() => joiningRef.current.delete(id));
    });
  }, [backend, channelsRaw, enabled, ensureProjectChannel, onJoined, projects, uid, userState, users]);

  return { ensureProjectChannel };
}
