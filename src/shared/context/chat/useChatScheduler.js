import { useEffect, useRef } from "react";

const TICK_MS = 30 * 1000;
const CLAIM_SETTLE_MS = 1200;
const CLAIM_STALE_MS = 60 * 1000;

const TAB_ID = `tab-${Math.random().toString(36).slice(2, 10)}`;

/*
 * Client-side delivery of scheduled messages and reminders (no server
 * scheduler yet). Each open tab ticks every 30 s; a due scheduled message is
 * first *claimed* by one tab (written to user state), and only the tab that
 * still owns the claim after it settles sends it — so two open tabs don't
 * both deliver. Reminders just raise an alert once (`notifiedAt`).
 */
export function useChatScheduler({ enabled, userState, updateUserState, deliverScheduled, notifyReminder }) {
  const stateRef = useRef(userState);
  stateRef.current = userState;
  const handlersRef = useRef({ updateUserState, deliverScheduled, notifyReminder });
  handlersRef.current = { updateUserState, deliverScheduled, notifyReminder };
  const sendingRef = useRef(new Set());

  useEffect(() => {
    if (!enabled) return undefined;

    const tick = () => {
      const now = Date.now();
      const state = stateRef.current || {};
      const { updateUserState: update, deliverScheduled: deliver, notifyReminder: notify } = handlersRef.current;

      Object.values(state.scheduled || {}).forEach((entry) => {
        if (!entry?.id || Number(entry.at) > now || sendingRef.current.has(entry.id)) return;
        const claimFresh = entry.claimedBy && now - (Number(entry.claimedAt) || 0) < CLAIM_STALE_MS;
        if (claimFresh && entry.claimedBy !== TAB_ID) return;
        if (!claimFresh) {
          update({ scheduled: { [entry.id]: { claimedBy: TAB_ID, claimedAt: now } } }).catch(() => {});
        }
        sendingRef.current.add(entry.id);
        window.setTimeout(() => {
          const latest = stateRef.current?.scheduled?.[entry.id];
          if (!latest || latest.claimedBy !== TAB_ID) {
            sendingRef.current.delete(entry.id);
            return;
          }
          Promise.resolve(deliver(latest))
            .then(() => update({ scheduled: { [entry.id]: null } }))
            .catch(() => update({ scheduled: { [entry.id]: { claimedBy: null, claimedAt: 0, failedAt: Date.now() } } }))
            .finally(() => sendingRef.current.delete(entry.id));
        }, CLAIM_SETTLE_MS);
      });

      Object.values(state.reminders || {}).forEach((reminder) => {
        if (!reminder?.id || reminder.done || reminder.notifiedAt || Number(reminder.at) > now) return;
        update({ reminders: { [reminder.id]: { notifiedAt: now } } }).catch(() => {});
        notify(reminder);
      });
    };

    tick();
    const interval = window.setInterval(tick, TICK_MS);
    const onVisible = () => { if (document.visibilityState !== "hidden") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
