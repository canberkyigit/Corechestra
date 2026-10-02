import { useCallback, useMemo, useRef } from "react";
import { useApp } from "../../../shared/context/AppContext";
import { useChat } from "../../../shared/context/ChatContext";
import { requestNavigate } from "../../../shared/components/appNavigation";
import { getActiveCustomStatus } from "../../../shared/services/chat/chatModel";
import { taskKey } from "../../../shared/utils/helpers";

/**
 * Lookups for Corechestra entities referenced in chat (tasks, docs,
 * releases), plus a search used by the `[[` reference picker.
 */
export function useEntityResolver() {
  const { activeTasks, backlogSections, archivedTasks, docPages, releases, projects } = useApp();

  const index = useMemo(() => {
    const tasks = new Map();
    (activeTasks || []).forEach((task) => tasks.set(String(task.id), { ...task, location: "sprint" }));
    (backlogSections || []).forEach((section) => (section.tasks || []).forEach((task) => tasks.set(String(task.id), { ...task, location: "backlog", sectionTitle: section.title })));
    (archivedTasks || []).forEach((task) => { if (!tasks.has(String(task.id))) tasks.set(String(task.id), { ...task, location: "archive", archived: true }); });
    const docs = new Map((docPages || []).map((page) => [String(page.id), page]));
    const releaseMap = new Map((releases || []).map((release) => [String(release.id), release]));
    const projectMap = new Map((projects || []).map((project) => [String(project.id), project]));
    return { tasks, docs, releases: releaseMap, projects: projectMap };
  }, [activeTasks, archivedTasks, backlogSections, docPages, projects, releases]);

  const indexRef = useRef(index);
  indexRef.current = index;

  const resolveTask = useCallback((key) => indexRef.current.tasks.get(String(key)) || null, []);
  const resolveDoc = useCallback((id) => indexRef.current.docs.get(String(id)) || null, []);
  const resolveRelease = useCallback((id) => indexRef.current.releases.get(String(id)) || null, []);
  const resolveProject = useCallback((id) => indexRef.current.projects.get(String(id)) || null, []);

  const searchEntities = useCallback((query, max = 10) => {
    const needle = String(query || "").trim().toLowerCase();
    const { tasks, docs, releases: releaseMap } = indexRef.current;
    const results = [];
    const matches = (...values) => !needle || values.some((value) => String(value || "").toLowerCase().includes(needle));
    tasks.forEach((task) => {
      if (task.archived || !matches(task.title, taskKey(task.id))) return;
      results.push({ kind: "task", id: task.id, label: task.title || taskKey(task.id), sublabel: taskKey(task.id), insert: `${taskKey(task.id)} `, status: task.status });
    });
    docs.forEach((page) => {
      if (!matches(page.title)) return;
      results.push({ kind: "doc", id: page.id, label: page.title || "Untitled page", sublabel: "Doc page", insert: `<doc:${page.id}> `, emoji: page.emoji });
    });
    releaseMap.forEach((release) => {
      if (!matches(release.version, release.name)) return;
      results.push({ kind: "release", id: release.id, label: [release.version, release.name].filter(Boolean).join(" · ") || "Release", sublabel: release.status || "Release", insert: `<release:${release.id}> ` });
    });
    const rank = (entry) => {
      const label = String(entry.label).toLowerCase();
      if (needle && (label.startsWith(needle) || String(entry.sublabel).toLowerCase().startsWith(needle))) return 0;
      return 1;
    };
    return results.sort((a, b) => rank(a) - rank(b)).slice(0, max);
  }, []);

  const entityLabel = useCallback((kind, id) => {
    if (kind === "doc") return `📄 ${indexRef.current.docs.get(String(id))?.title || "Doc page"}`;
    if (kind === "release") {
      const release = indexRef.current.releases.get(String(id));
      return `🏷️ ${release ? [release.version, release.name].filter(Boolean).join(" ") : "Release"}`;
    }
    return "";
  }, []);

  // `index` is part of the identity on purpose: entity cards re-render when tasks/docs/releases change.
  return useMemo(
    () => ({ resolveTask, resolveDoc, resolveRelease, resolveProject, searchEntities, entityLabel, entityVersion: index }),
    [entityLabel, index, resolveDoc, resolveProject, resolveRelease, resolveTask, searchEntities]
  );
}

/**
 * Render context shared by every message list (Chats page, thread panel,
 * task discussions). Only depends on the fields messages render with, so
 * read-marker / inbox updates don't re-render every message.
 */
export function useChatCtx(pageApi) {
  const chat = useChat();
  const resolver = useEntityResolver();
  const uid = chat?.uid;
  const usersById = chat?.usersById;
  const channelsById = chat?.channelsById;
  const channels = chat?.channels;
  const activeUsers = chat?.activeUsers;
  const presence = chat?.presence;
  const customEmoji = chat?.customEmoji;

  return useMemo(() => ({
    uid,
    usersById: usersById || {},
    channelsById: channelsById || {},
    channelList: channels || [],
    activeUsers: activeUsers || [],
    presence: presence || {},
    customEmoji: customEmoji || {},
    statusFor: (userId) => getActiveCustomStatus(presence?.[userId]),
    ...resolver,
    onOpenProfile: pageApi.openProfile,
    onOpenChannel: pageApi.openChannel,
    onOpenTaskKey: pageApi.openTaskKey,
    onOpenImage: pageApi.openImage,
    onOpenDoc: (id) => requestNavigate(`docs?page=${encodeURIComponent(id)}`),
    onOpenRelease: (id) => requestNavigate(`releases?release=${encodeURIComponent(id)}`),
    onOpenRoute: (route) => requestNavigate(route),
    onJumpToMessage: pageApi.jumpToMessage,
  }), [activeUsers, channels, channelsById, customEmoji, pageApi, presence, resolver, uid, usersById]);
}
