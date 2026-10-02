import { useEffect, useState } from "react";
import { useChat } from "../../../shared/context/ChatContext";
import { projectChannelId } from "../../../shared/services/chat/chatModel";

export function taskThreadId(taskId) {
  return `task-${String(taskId).replace(/[^\w.-]/g, "_")}`;
}

/**
 * Reply count of a task's discussion thread without creating it (task panel
 * tab badge). Returns null when chat is unavailable.
 */
export function useTaskDiscussionCount(task, fallbackProjectId = null) {
  const chat = useChat();
  const [count, setCount] = useState(0);
  const projectId = task?.projectId || fallbackProjectId;
  const channelId = projectId ? projectChannelId(projectId) : null;
  const exists = Boolean(channelId && chat?.channelsById?.[channelId]);
  const backend = chat?.backend;

  useEffect(() => {
    if (!exists || !task?.id || !backend) { setCount(0); return undefined; }
    return backend.subscribeMessage(channelId, taskThreadId(task.id), (message) => setCount(message?.replyCount || 0), () => setCount(0));
  }, [backend, channelId, exists, task?.id]);

  return chat?.enabled ? count : null;
}
