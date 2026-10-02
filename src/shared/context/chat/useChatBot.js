import { useEffect, useRef } from "react";
import { subscribeWorkspaceEvents } from "../../services/workspaceEvents";
import { buildBotSystemPayload, isBotEventEnabled } from "../../services/chat/chatBotModel";
import { projectChannelId } from "../../services/chat/chatModel";

const DEDUPE_WINDOW_MS = 4000;

/**
 * Posts workspace events (emitted on the acting user's client) as bot cards
 * into the matching project channel. Identical events fired in quick
 * succession (double clicks, bulk re-renders) are collapsed.
 */
export function useChatBot({ enabled, getChannel, sendSystemMessage }) {
  const recentRef = useRef(new Map());
  const handlersRef = useRef({ getChannel, sendSystemMessage });
  handlersRef.current = { getChannel, sendSystemMessage };

  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeWorkspaceEvents((event) => {
      if (!event?.projectId) return;
      const channel = handlersRef.current.getChannel(projectChannelId(event.projectId));
      if (!channel || channel.archived || !isBotEventEnabled(channel, event)) return;
      const key = JSON.stringify([event.type, event.task?.id, event.to, event.release?.id, event.run?.id, event.sprint?.name, event.epic?.id]);
      const now = Date.now();
      const last = recentRef.current.get(key);
      if (last && now - last < DEDUPE_WINDOW_MS) return;
      recentRef.current.set(key, now);
      if (recentRef.current.size > 200) recentRef.current.clear();
      handlersRef.current.sendSystemMessage(channel.id, buildBotSystemPayload(event));
    });
  }, [enabled]);
}
