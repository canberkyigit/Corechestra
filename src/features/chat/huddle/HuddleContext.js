import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useChat, useChatActions } from "../../../shared/context/ChatContext";
import { useToast } from "../../../shared/context/ToastContext";
import {
  activeHuddleParticipants, createChatId, HUDDLE_HEARTBEAT_MS, HUDDLE_MAX_PARTICIPANTS, isHuddleLive,
} from "../../../shared/services/chat/chatModel";
import { describeMediaError, HuddleEngine, isHuddleSupported } from "./huddleEngine";

/*
 * Huddles: lightweight audio/video calls inside a conversation (Slack
 * huddles). This provider is mounted at the app level so a call keeps
 * running while you navigate around Corechestra.
 */

const HuddleContext = createContext(null);

export function useHuddle() {
  return useContext(HuddleContext);
}

export function HuddleProvider({ children }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const backend = chat?.backend;
  const uid = chat?.uid;
  const enabled = Boolean(chat?.enabled && backend?.subscribeHuddles);

  const [huddles, setHuddles] = useState({});
  const [current, setCurrent] = useState(null); // { channelId, sessionId, joinedAt }
  const [media, setMedia] = useState({ localStream: null, remote: {}, muted: false, video: false, screen: false });
  const [connecting, setConnecting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const engineRef = useRef(null);
  const currentRef = useRef(null);
  currentRef.current = current;

  useEffect(() => {
    if (!enabled) return undefined;
    return backend.subscribeHuddles((value) => setHuddles(value || {}), () => {});
  }, [backend, enabled]);

  // Re-evaluate liveness (stale heartbeats) periodically.
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, [enabled]);

  const liveHuddles = useMemo(() => {
    const live = {};
    Object.entries(huddles).forEach(([channelId, huddle]) => {
      if (isHuddleLive(huddle, now)) live[channelId] = { ...huddle, participants: activeHuddleParticipants(huddle, now) };
    });
    return live;
  }, [huddles, now]);

  const currentHuddle = current ? liveHuddles[current.channelId] || null : null;

  // Signals addressed to me in the huddle I'm in.
  useEffect(() => {
    if (!current || !backend) return undefined;
    const handled = new Set();
    return backend.subscribeSignals(current.channelId, uid, (signals) => {
      const fresh = (signals || []).filter((signal) => !handled.has(signal.id)).sort((a, b) => (a.at || 0) - (b.at || 0));
      if (!fresh.length) return;
      fresh.forEach((signal) => handled.add(signal.id));
      (async () => {
        for (const signal of fresh) {
          // eslint-disable-next-line no-await-in-loop
          await engineRef.current?.handleSignal(signal);
        }
      })();
      backend.deleteSignals(current.channelId, fresh.map((signal) => signal.id)).catch(() => {});
    }, () => {});
  }, [backend, current, uid]);

  // Keep peer connections in step with the participant list.
  useEffect(() => {
    if (!current || !engineRef.current) return;
    engineRef.current.syncPeers(currentHuddle?.participants || []);
  }, [current, currentHuddle]);

  // Heartbeat + publish my media flags.
  useEffect(() => {
    if (!current || !backend) return undefined;
    const beat = () => backend.updateHuddleParticipant(current.channelId, uid, {
      lastSeen: Date.now(),
      muted: media.muted,
      video: media.video,
      screen: media.screen,
    }).catch(() => {});
    beat();
    const timer = window.setInterval(beat, HUDDLE_HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [backend, current, media.muted, media.screen, media.video, uid]);

  const leave = useCallback(async ({ silent = false } = {}) => {
    const active = currentRef.current;
    if (!active) return;
    engineRef.current?.leave();
    engineRef.current = null;
    setCurrent(null);
    setExpanded(false);
    setMedia({ localStream: null, remote: {}, muted: false, video: false, screen: false });
    const now2 = Date.now();
    try {
      const result = await backend.leaveHuddle(active.channelId, uid, now2);
      if (result?.ended) {
        const startedAt = Number(result.huddle?.startedAt) || active.joinedAt;
        actions.sendMessage({
          channelId: active.channelId,
          text: "",
          system: { type: "huddle_ended", durationMs: Math.max(0, now2 - startedAt) },
        }).catch(() => {});
      }
    } catch {
      // The heartbeat expiry cleans up after us.
    }
    if (!silent) addToast("You left the huddle", "info");
  }, [actions, addToast, backend, uid]);

  const join = useCallback(async (channelId, { video = false } = {}) => {
    if (!enabled) return;
    if (!isHuddleSupported()) {
      addToast("This browser doesn't support huddles.", "warning");
      return;
    }
    if (currentRef.current?.channelId === channelId) { setExpanded(true); return; }
    if (currentRef.current) await leave({ silent: true });
    const live = liveHuddles[channelId];
    if (live && live.participants.length >= HUDDLE_MAX_PARTICIPANTS) {
      addToast(`Huddles are limited to ${HUDDLE_MAX_PARTICIPANTS} people.`, "warning");
      return;
    }
    setConnecting(true);
    const sessionId = createChatId("hs");
    const engine = new HuddleEngine({
      uid,
      sessionId,
      sendSignal: (signal) => backend.sendSignal(channelId, signal).catch(() => {}),
      onChange: setMedia,
    });
    try {
      await engine.start({ video });
    } catch (error) {
      setConnecting(false);
      addToast(describeMediaError(error), "error");
      return;
    }
    const joinedAt = Date.now();
    engine.joinedAt = joinedAt;
    engineRef.current = engine;
    try {
      const { started } = await backend.joinHuddle(channelId, uid, {
        joinedAt, lastSeen: joinedAt, muted: false, video: engine.video, screen: false, sessionId,
      }, { roomId: createChatId("room"), now: joinedAt });
      setCurrent({ channelId, sessionId, joinedAt });
      if (started) {
        actions.sendMessage({ channelId, text: "", system: { type: "huddle_started" } }).catch(() => {});
      }
    } catch (error) {
      engine.leave();
      engineRef.current = null;
      addToast(error?.message || "Could not join the huddle.", "error");
    }
    setConnecting(false);
  }, [actions, addToast, backend, enabled, leave, liveHuddles, uid]);

  // Leave on tab close (best effort; heartbeat expiry covers the rest).
  useEffect(() => {
    const onPageHide = () => {
      const active = currentRef.current;
      if (!active) return;
      engineRef.current?.leave();
      backend?.leaveHuddle(active.channelId, uid, Date.now()).catch(() => {});
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [backend, uid]);

  // Leave when the provider unmounts (sign-out).
  useEffect(() => () => { engineRef.current?.leave(); }, []);

  const toggleMute = useCallback(() => engineRef.current?.setMuted(!engineRef.current.muted), []);
  const toggleVideo = useCallback(async () => {
    try {
      await engineRef.current?.setVideo(!engineRef.current.video);
    } catch (error) {
      addToast(error?.name === "NotAllowedError" ? "Camera access was blocked." : error?.message || "Camera unavailable.", "error");
    }
  }, [addToast]);
  const toggleScreen = useCallback(async () => {
    try {
      await engineRef.current?.setScreenShare(!engineRef.current.screen);
    } catch (error) {
      if (error?.name !== "NotAllowedError") addToast(error?.message || "Screen sharing failed.", "error");
    }
  }, [addToast]);

  const value = useMemo(() => ({
    supported: isHuddleSupported(),
    huddles: liveHuddles,
    current: current ? { ...current, huddle: currentHuddle } : null,
    media,
    connecting,
    expanded,
    setExpanded,
    join,
    leave,
    toggleMute,
    toggleVideo,
    toggleScreen,
    getLocalVideoTrack: () => engineRef.current?.getLocalVideoTrack() || null,
  }), [connecting, current, currentHuddle, expanded, join, leave, liveHuddles, media, toggleMute, toggleScreen, toggleVideo]);

  return <HuddleContext.Provider value={value}>{children}</HuddleContext.Provider>;
}
