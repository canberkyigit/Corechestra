export const SLASH_COMMANDS = [
  { id: "task", usage: "/task [title]", description: "Create a task from this conversation" },
  { id: "poll", usage: "/poll", description: "Create a poll" },
  { id: "remind", usage: "/remind in 30m [text]", description: "Set a reminder (in 2h, tomorrow, at 15:00…)" },
  { id: "summarize", usage: "/summarize", description: "Catch up on this conversation" },
  { id: "huddle", usage: "/huddle", description: "Start or join a huddle" },
  { id: "topic", usage: "/topic [text]", description: "Set the conversation topic" },
  { id: "shrug", usage: "/shrug [message]", description: "Append ¯\\_(ツ)_/¯ to your message" },
  { id: "me", usage: "/me [action]", description: "Display an action, e.g. /me is grabbing coffee" },
  { id: "status", usage: "/status [emoji] [text]", description: "Set your status (empty clears it)" },
  { id: "away", usage: "/away", description: "Toggle your availability between active and away" },
  { id: "mute", usage: "/mute", description: "Mute or unmute this conversation" },
  { id: "leave", usage: "/leave", description: "Leave this channel" },
  { id: "invite", usage: "/invite @person", description: "Add people to this channel" },
];

export function filterSlashCommands(query) {
  const needle = String(query || "").toLowerCase();
  return SLASH_COMMANDS.filter((command) => command.id.startsWith(needle));
}

/** `"/topic Release prep"` → `{ id: "topic", args: "Release prep" }`; null when not a known command. */
export function parseSlashCommand(text) {
  const match = String(text || "").match(/^\/([\w-]+)(?:\s+([\s\S]*))?$/);
  if (!match) return null;
  const id = match[1].toLowerCase();
  if (!SLASH_COMMANDS.some((command) => command.id === id)) return null;
  return { id, args: (match[2] || "").trim() };
}

/** `/status 🌴 On vacation` → `{ emoji: "🌴", text: "On vacation" }`. */
export function parseStatusArgs(args) {
  const value = String(args || "").trim();
  if (!value) return null;
  const match = value.match(/^(\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic}|️)*)\s*(.*)$/u);
  if (match) return { emoji: match[1], text: match[2].trim() };
  return { emoji: "💬", text: value };
}
