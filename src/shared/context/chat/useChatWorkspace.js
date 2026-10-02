import { useEffect, useRef, useState } from "react";

const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const RETENTION_OPTIONS = [
  { days: 0, label: "Keep everything" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 180, label: "6 months" },
  { days: 365, label: "1 year" },
  { days: 730, label: "2 years" },
];

/** Effective retention for a channel: its own override, else the workspace default. */
export function effectiveRetentionDays(channel, workspace) {
  const own = Number(channel?.retentionDays) || 0;
  if (own > 0) return own;
  return Number(workspace?.retention?.days) || 0;
}

/** Workspace-wide chat settings (custom emoji, retention, integrations). */
export function useChatWorkspaceSettings({ backend, enabled }) {
  const [workspace, setWorkspace] = useState({});
  useEffect(() => {
    if (!enabled) return undefined;
    return backend.subscribeWorkspace((value) => setWorkspace(value || {}), () => {});
  }, [backend, enabled]);
  return workspace;
}

/**
 * Retention clean-up. Without a scheduled backend job it runs from an
 * admin's client at most once a day (and on demand), over the channels that
 * admin can see.
 */
export async function runRetentionCleanup({ backend, channels, workspace, now = Date.now() }) {
  const results = [];
  for (const channel of channels || []) {
    const days = effectiveRetentionDays(channel, workspace);
    if (!days) continue;
    // eslint-disable-next-line no-await-in-loop
    const removed = await backend.deleteMessagesBefore(channel.id, now - days * DAY_MS).catch(() => 0);
    if (removed) results.push({ channelId: channel.id, name: channel.name, removed });
  }
  return results;
}

export function useRetentionJob({ backend, enabled, isAdmin, uid, channels, workspace, onComplete }) {
  const runningRef = useRef(false);
  const handlersRef = useRef({ onComplete });
  handlersRef.current = { onComplete };

  useEffect(() => {
    if (!enabled || !isAdmin || !channels?.length || runningRef.current) return;
    const anyPolicy = Number(workspace?.retention?.days) > 0 || channels.some((channel) => Number(channel.retentionDays) > 0);
    if (!anyPolicy) return;
    const lastRun = Number(workspace?.retention?.lastRunAt) || 0;
    if (Date.now() - lastRun < RETENTION_INTERVAL_MS) return;
    runningRef.current = true;
    const startedAt = Date.now();
    // Claim first so other admins' clients skip this cycle.
    backend.updateWorkspace({ retention: { lastRunAt: startedAt, lastRunBy: uid } })
      .then(() => runRetentionCleanup({ backend, channels, workspace }))
      .then((results) => {
        const removed = results.reduce((sum, entry) => sum + entry.removed, 0);
        return backend.updateWorkspace({ retention: { lastRemoved: removed, lastRunFinishedAt: Date.now() } })
          .then(() => handlersRef.current.onComplete?.({ removed, results, automatic: true }));
      })
      .catch(() => {})
      .finally(() => { runningRef.current = false; });
  }, [backend, channels, enabled, isAdmin, uid, workspace]);
}
