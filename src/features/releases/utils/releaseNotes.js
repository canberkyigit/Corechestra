// Release notes: grouping, generation from completed work, Markdown export.
import { taskKey } from "../../../shared/utils/helpers";
import { CHANGELOG_TYPE_META, CHANGELOG_TYPES } from "../constants/releaseMeta";
import { formatDate } from "./releaseUtils";

export function changelogTypeForTask(task) {
  const type = task?.type;
  if (type === "bug" || type === "defect") return "bugfix";
  if (type === "feature" || type === "userstory") return "feature";
  return "improvement";
}

export function groupChangelog(changelog) {
  const groups = CHANGELOG_TYPES.map((type) => ({ type, entries: [] }));
  const byType = new Map(groups.map((group) => [group.type, group]));
  (changelog || []).forEach((entry) => {
    const group = byType.get(entry.type) || byType.get("improvement");
    group.entries.push(entry);
  });
  return groups.filter((group) => group.entries.length > 0);
}

const normalizeText = (text) => String(text || "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Builds changelog entries for done linked tasks that are not yet covered by
 * an entry (same `taskId` or same text). Returns entries without ids.
 */
export function generateNotesFromTasks(linkedTasks, existingChangelog = [], { author = null, now = new Date() } = {}) {
  const coveredTaskIds = new Set((existingChangelog || []).map((entry) => entry.taskId).filter(Boolean).map(String));
  const coveredTexts = new Set((existingChangelog || []).map((entry) => normalizeText(entry.text)));
  const generated = [];
  (linkedTasks || []).forEach((task) => {
    if (!task || task.status !== "done") return;
    const id = String(task.id);
    const text = String(task.title || "").trim();
    if (!text || coveredTaskIds.has(id) || coveredTexts.has(normalizeText(text))) return;
    coveredTaskIds.add(id);
    coveredTexts.add(normalizeText(text));
    generated.push({
      type: changelogTypeForTask(task),
      text,
      taskId: task.id,
      author,
      createdAt: now.toISOString(),
      generated: true,
    });
  });
  return generated;
}

export function releaseNotesMarkdown(release) {
  if (!release) return "";
  const lines = [];
  const title = release.name ? `${release.version} — ${release.name}` : release.version;
  lines.push(`# ${title}`);
  const dateLine = release.status === "released" && (release.releasedAt || release.releaseDate)
    ? `Released ${formatDate(release.releasedAt || release.releaseDate)}`
    : release.releaseDate ? `Target date ${formatDate(release.releaseDate)}` : "";
  if (dateLine) lines.push("", `_${dateLine}_`);
  if (release.description) lines.push("", release.description.trim());
  const groups = groupChangelog(release.changelog);
  if (groups.length === 0) {
    lines.push("", "_No release notes yet._");
  }
  groups.forEach((group) => {
    lines.push("", `## ${CHANGELOG_TYPE_META[group.type].label}`, "");
    group.entries.forEach((entry) => {
      lines.push(`- ${entry.text}${entry.taskId ? ` (${taskKey(entry.taskId)})` : ""}`);
    });
  });
  return `${lines.join("\n")}\n`;
}

export function releaseNotesFileName(release) {
  const safe = String(release?.version || "release").replace(/[^a-z0-9._-]+/gi, "-");
  return `release-notes-${safe}.md`;
}
