import { extractMentionIds, getUserDisplayName, reactionCount, toPlainText } from "../../../shared/services/chat/chatModel";
import { extractTaskKeys } from "./chatMarkdown";

/*
 * "Catch me up" summaries.
 *
 * Runs fully on the device: an extractive, rule-based pass that ranks
 * messages and pulls out decisions, open questions and action items
 * (English + Turkish phrasing). When `REACT_APP_CHAT_AI_ENDPOINT` is set the
 * same message payload is POSTed there and the model's prose summary is shown
 * on top. The key for any model must stay on that backend — never here.
 */

const DECISION_PATTERN = /\b(decided|decision|agreed|we(?:'ll| will) go with|let'?s go with|approved|signed off|final answer|going forward|karar(?:ı|ımız)?|anlaştık|onaylandı|onayladık|kesinleşti)\b/i;
const ACTION_PATTERNS = [
  /^\s*(?:-|\*)?\s*\[ \]\s+(.+)/i, // - [ ] checklist
  /\b(?:todo|to-do|action item|ai)\s*[:-]\s*(.+)/i,
  /\b(?:i'?ll|i will|i'm going to|i am going to|we need to|we should|we must|need to|needs to|please|can you|could you|will you|let'?s)\b(.+)/i,
  /\b(.+?)\s+(?:yapacağım|halledeceğim|bakacağım|ekleyeceğim|düzelteceğim|göndereceğim)\b/i,
  /\b(?:yapmamız|yapılması|bakılması|eklenmesi|düzeltilmesi)\s+(?:lazım|gerek(?:iyor)?|şart)\b/i,
  /\b(?:lütfen|rica etsem)\b(.+)/i,
];
const FIRST_PERSON = /\b(i'?ll|i will|i'm going to|i am going to|yapacağım|halledeceğim|bakacağım|ekleyeceğim|düzelteceğim|göndereceğim)\b/i;
const DUE_HINTS = /\b(today|tomorrow|tonight|eod|end of day|this week|next week|monday|tuesday|wednesday|thursday|friday|bugün|yarın|bu hafta|haftaya|pazartesi|salı|çarşamba|perşembe|cuma)\b/i;

function splitSentences(text) {
  return String(text || "")
    .split(/\n+|(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/^[-*>\s]+/, "").trim())
    .filter((sentence) => sentence.length >= 4);
}

function clip(text, max = 180) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function scoreMessage(message) {
  const text = message.text || "";
  return reactionCount(message.reactions) * 2
    + (message.replyCount || 0) * 2.5
    + (message.pinned ? 4 : 0)
    + (message.mentionsAll || message.mentionsHere ? 2 : 0)
    + (message.attachments?.length ? 1 : 0)
    + (message.poll ? 2 : 0)
    + Math.min(2, text.length / 240);
}

/** Flattens top-level messages and their (optional) `replies` into one chronological list. */
export function flattenForSummary(messages) {
  const flat = [];
  (messages || []).forEach((message) => {
    flat.push(message);
    (message.replies || []).forEach((reply) => flat.push({ ...reply, isReply: true }));
  });
  return flat
    .filter((message) => !message.deleted && !message.pending && (!message.system || message.system.type === "me"))
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Readable text without markdown markers (summaries show prose, not syntax). */
export function stripMarkdown(text) {
  return String(text || "")
    .replace(/```[a-z0-9+#-]*\n?([\s\S]*?)```/gi, "$1")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1")
    .replace(/(\*\*|__|~~)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])[*_](\S(?:.*?\S)?)[*_](?=[\s).,!?:;]|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*>\s?/gm, "");
}

export function summarizeConversation(messages, { usersById = {}, channelsById = {}, since = 0, until = Infinity } = {}) {
  const list = flattenForSummary(messages).filter((message) => message.createdAt >= since && message.createdAt <= until);
  const plainOf = (message) => stripMarkdown(toPlainText(message.text, { usersById, channelsById }));

  const participantCounts = new Map();
  const taskCounts = new Map();
  let links = 0;
  let files = 0;
  list.forEach((message) => {
    participantCounts.set(message.authorId, (participantCounts.get(message.authorId) || 0) + 1);
    extractTaskKeys(message.text).forEach((key) => taskCounts.set(key, (taskCounts.get(key) || 0) + 1));
    links += (String(message.text).match(/https?:\/\//g) || []).length;
    files += message.attachments?.length || 0;
  });

  const highlights = [...list]
    .filter((message) => !message.isReply && (message.text || message.attachments?.length || message.poll))
    .map((message) => ({ message, score: scoreMessage(message) }))
    .filter((entry) => entry.score >= 2 || list.length <= 6)
    .sort((a, b) => b.score - a.score || b.message.createdAt - a.message.createdAt)
    .slice(0, 5)
    .sort((a, b) => a.message.createdAt - b.message.createdAt)
    .map(({ message }) => ({ message, text: clip(plainOf(message)) }));

  const decisions = [];
  const questions = [];
  const actionItems = [];
  const seenActions = new Set();

  list.forEach((message, index) => {
    const plain = plainOf(message);
    splitSentences(plain).forEach((sentence) => {
      if (DECISION_PATTERN.test(sentence) && decisions.length < 6) {
        decisions.push({ message, text: clip(sentence) });
      }
    });

    // A question is "open" when nobody else answered: no thread replies and
    // no message from someone else in the next few minutes.
    if (/\?\s*$/.test(plain.trim()) || /\?\s/.test(plain)) {
      const answered = (message.replyCount || 0) > 0 || list.slice(index + 1).some((later) => (
        later.authorId !== message.authorId && later.createdAt - message.createdAt < 15 * 60 * 1000
      ));
      if (!answered && questions.length < 6) questions.push({ message, text: clip(plain) });
    }

    splitSentences(message.text).forEach((rawSentence) => {
      const sentence = stripMarkdown(toPlainText(rawSentence, { usersById, channelsById }));
      const matched = ACTION_PATTERNS.some((pattern) => pattern.test(sentence));
      const plainQuestion = sentence.endsWith("?") && !/\b(can you|could you|will you)\b/i.test(sentence);
      if (!matched || plainQuestion) return;
      const key = sentence.toLowerCase();
      if (seenActions.has(key) || actionItems.length >= 10) return;
      seenActions.add(key);
      const mentioned = extractMentionIds(rawSentence);
      const assigneeId = mentioned[0] || (FIRST_PERSON.test(sentence) ? message.authorId : null);
      actionItems.push({
        id: `${message.id}-${actionItems.length}`,
        text: clip(sentence.replace(/^\s*(?:-|\*)?\s*\[ \]\s+/, ""), 160),
        assigneeId,
        due: (sentence.match(DUE_HINTS) || [])[0] || null,
        message,
      });
    });
  });

  const participants = [...participantCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({ id, count, name: getUserDisplayName(usersById[id]) }));

  return {
    messageCount: list.length,
    from: list[0]?.createdAt || since || 0,
    to: list[list.length - 1]?.createdAt || 0,
    participants,
    highlights,
    decisions,
    questions,
    actionItems,
    tasks: [...taskCounts.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count })),
    links,
    files,
  };
}

export function formatSummaryMarkdown(summary, { title = "Summary", usersById = {} } = {}) {
  const lines = [`**${title}** — ${summary.messageCount} messages from ${summary.participants.length} people`];
  if (summary.aiSummary) lines.push("", summary.aiSummary);
  if (summary.highlights.length) {
    lines.push("", "**Highlights**");
    summary.highlights.forEach((entry) => lines.push(`- ${getUserDisplayName(usersById[entry.message.authorId])}: ${entry.text}`));
  }
  if (summary.decisions.length) {
    lines.push("", "**Decisions**");
    summary.decisions.forEach((entry) => lines.push(`- ${entry.text}`));
  }
  if (summary.actionItems.length) {
    lines.push("", "**Action items**");
    summary.actionItems.forEach((item) => lines.push(`- [ ] ${item.text}${item.assigneeId ? ` (<@${item.assigneeId}>)` : ""}${item.due ? ` — ${item.due}` : ""}`));
  }
  if (summary.questions.length) {
    lines.push("", "**Open questions**");
    summary.questions.forEach((entry) => lines.push(`- ${entry.text}`));
  }
  if (summary.tasks.length) {
    lines.push("", `**Tasks mentioned:** ${summary.tasks.map((task) => task.key).join(", ")}`);
  }
  return lines.join("\n");
}

const AI_ENDPOINT = process.env.REACT_APP_CHAT_AI_ENDPOINT || "";

export function isAiSummaryAvailable() {
  return Boolean(AI_ENDPOINT);
}

/**
 * Optional model-written summary from a backend endpoint. Expected response:
 * `{ summary: string, actionItems?: [{ text, assignee? }] }`.
 */
export async function requestAiSummary(messages, { usersById = {}, channelsById = {}, channelName = "", signal } = {}) {
  if (!AI_ENDPOINT) return null;
  const payload = {
    channel: channelName,
    messages: flattenForSummary(messages).slice(-400).map((message) => ({
      author: getUserDisplayName(usersById[message.authorId]),
      at: new Date(message.createdAt).toISOString(),
      text: toPlainText(message.text, { usersById, channelsById }),
      reply: Boolean(message.isReply),
    })),
  };
  const response = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
    signal,
  });
  if (!response.ok) throw new Error(`Summary service responded with ${response.status}.`);
  const data = await response.json();
  return { summary: String(data?.summary || ""), actionItems: Array.isArray(data?.actionItems) ? data.actionItems : [] };
}
