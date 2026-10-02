import { format } from "date-fns";
import { CHANNEL_TYPES, getUserDisplayName, toPlainText } from "../../../shared/services/chat/chatModel";

/*
 * Client-side exports of conversation history (JSON / Markdown / CSV).
 * Attachments are exported as metadata only (name, type, size) — embedded
 * data URLs would make the files huge.
 */

function channelLabel(channel, getName) {
  if (!channel) return "conversation";
  return channel.type === CHANNEL_TYPES.DM ? getName(channel) : `#${channel.name}`;
}

function systemText(message, usersById) {
  const actor = getUserDisplayName(usersById[message.authorId]);
  const system = message.system || {};
  if (system.type === "me") return `${actor} ${system.text}`;
  if (system.type === "event") return `[bot] ${system.event?.type || "event"}`;
  return `${actor} · ${system.type}`;
}

function serialiseMessage(message, ctx) {
  return {
    id: message.id,
    author: getUserDisplayName(ctx.usersById[message.authorId]),
    authorId: message.authorId,
    createdAt: new Date(message.createdAt).toISOString(),
    editedAt: message.editedAt ? new Date(message.editedAt).toISOString() : null,
    text: message.system ? systemText(message, ctx.usersById) : toPlainText(message.text, ctx),
    rawText: message.text,
    deleted: message.deleted || undefined,
    pinned: message.pinned || undefined,
    reactions: Object.fromEntries(Object.entries(message.reactions || {}).filter(([, ids]) => ids?.length).map(([key, ids]) => [key, ids.length])),
    attachments: (message.attachments || []).map((file) => ({ name: file.name, type: file.type, size: file.size, url: file.url || undefined })),
    poll: message.poll || undefined,
    pollVotes: message.poll ? Object.fromEntries(Object.entries(message.pollVotes || {}).map(([key, ids]) => [key, ids.length])) : undefined,
    replies: message.replies ? message.replies.map((reply) => serialiseMessage(reply, ctx)) : undefined,
  };
}

export function buildJsonExport(channel, messages, ctx) {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    channel: {
      id: channel.id,
      name: channelLabel(channel, ctx.getName),
      type: channel.type,
      isPrivate: channel.isPrivate,
      topic: channel.topic,
      description: channel.description,
      members: (channel.memberIds || []).map((id) => getUserDisplayName(ctx.usersById[id])),
    },
    messages: messages.map((message) => serialiseMessage(message, ctx)),
  }, null, 2);
}

export function buildMarkdownExport(channel, messages, ctx) {
  const lines = [`# ${channelLabel(channel, ctx.getName)}`, "", `Exported ${format(new Date(), "d MMM yyyy HH:mm")}`, ""];
  if (channel.topic) lines.push(`> ${channel.topic}`, "");
  let day = "";
  const push = (message, indent = "") => {
    const author = getUserDisplayName(ctx.usersById[message.authorId]);
    const time = format(new Date(message.createdAt), "HH:mm");
    const body = message.deleted ? "_deleted_" : message.system ? `_${systemText(message, ctx.usersById)}_` : toPlainText(message.text, ctx);
    lines.push(`${indent}**${author}** ${time}${message.editedAt ? " (edited)" : ""}`);
    String(body || "").split("\n").forEach((line) => lines.push(`${indent}${line}`));
    (message.attachments || []).forEach((file) => lines.push(`${indent}📎 ${file.name}`));
    lines.push("");
  };
  messages.forEach((message) => {
    const label = format(new Date(message.createdAt), "EEEE d MMMM yyyy");
    if (label !== day) {
      day = label;
      lines.push(`## ${label}`, "");
    }
    push(message);
    (message.replies || []).forEach((reply) => push(reply, "> "));
  });
  return lines.join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsvExport(channel, messages, ctx) {
  const rows = [["timestamp", "author", "thread", "text", "attachments", "reactions"]];
  const add = (message, threadId = "") => rows.push([
    new Date(message.createdAt).toISOString(),
    getUserDisplayName(ctx.usersById[message.authorId]),
    threadId,
    message.system ? systemText(message, ctx.usersById) : toPlainText(message.text, ctx),
    (message.attachments || []).map((file) => file.name).join("; "),
    Object.values(message.reactions || {}).reduce((sum, ids) => sum + (ids?.length || 0), 0),
  ]);
  messages.forEach((message) => {
    add(message);
    (message.replies || []).forEach((reply) => add(reply, message.id));
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function downloadTextFile(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportFileName(channel, getName, extension) {
  const base = channelLabel(channel, getName).replace(/^#/, "").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "chat";
  return `${base}-${format(new Date(), "yyyy-MM-dd")}.${extension}`;
}
