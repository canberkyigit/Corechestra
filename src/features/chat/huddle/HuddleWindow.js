import React, { useEffect, useRef, useState } from "react";
import {
  FaCompress, FaDesktop, FaExpand, FaHeadphones, FaMicrophone, FaMicrophoneSlash, FaPhoneSlash, FaVideo, FaVideoSlash,
} from "react-icons/fa";
import { useChat } from "../../../shared/context/ChatContext";
import { requestNavigate } from "../../../shared/components/appNavigation";
import { getUserDisplayName } from "../../../shared/services/chat/chatModel";
import UserAvatar from "../components/common/UserAvatar";
import { useHuddle } from "./HuddleContext";

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value) => String(value).padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Audio level 0..1 of a stream, sampled ~6×/s. */
function useAudioLevel(stream) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    const track = stream?.getAudioTracks?.()[0];
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!track || !AudioContextClass) return undefined;
    let context;
    let timer;
    try {
      context = new AudioContextClass();
      const source = context.createMediaStreamSource(new window.MediaStream([track]));
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      timer = window.setInterval(() => {
        analyser.getByteFrequencyData(data);
        const average = data.reduce((sum, value) => sum + value, 0) / data.length;
        setLevel(Math.min(1, average / 60));
      }, 160);
    } catch {
      return undefined;
    }
    return () => {
      window.clearInterval(timer);
      context?.close?.().catch?.(() => {});
    };
  }, [stream]);
  return level;
}

function RemoteAudio({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play?.().catch(() => {});
    }
  }, [stream]);
  // eslint-disable-next-line jsx-a11y/media-has-caption
  return <audio ref={ref} autoPlay playsInline className="hidden" />;
}

function VideoView({ stream, track, mirrored = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (track) ref.current.srcObject = new window.MediaStream([track]);
    else ref.current.srcObject = stream || null;
  }, [stream, track]);
  // eslint-disable-next-line jsx-a11y/media-has-caption
  return <video ref={ref} autoPlay playsInline muted className={`h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""}`} />;
}

function Tile({ person, stream, localTrack, isLocal, flags, large }) {
  const level = useAudioLevel(stream);
  const speaking = !flags?.muted && level > 0.18;
  const remoteVideo = stream?.getVideoTracks?.().find((track) => track.readyState === "live" && !track.muted);
  const showVideo = isLocal ? Boolean(localTrack) : Boolean(remoteVideo && (flags?.video || flags?.screen));
  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-800 ${large ? "aspect-video" : "aspect-[4/3]"} ring-2 transition-shadow ${speaking ? "ring-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.25)]" : "ring-transparent"}`}>
      {showVideo ? (
        <VideoView stream={isLocal ? null : stream} track={isLocal ? localTrack : null} mirrored={isLocal && !flags?.screen} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <UserAvatar user={person} size="xl" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-[11px] font-semibold text-white">
        {flags?.muted ? <FaMicrophoneSlash className="w-2.5 h-2.5 text-red-300" /> : <FaMicrophone className={`w-2.5 h-2.5 ${speaking ? "text-emerald-300" : "opacity-70"}`} />}
        <span className="truncate">{isLocal ? "You" : getUserDisplayName(person)}</span>
        {flags?.screen && <span className="ml-auto rounded bg-white/20 px-1">Screen</span>}
      </div>
    </div>
  );
}

function ControlButton({ icon: Icon, label, onClick, active = true, danger = false, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      data-testid={testId}
      className={`h-10 w-10 inline-flex items-center justify-center rounded-full transition-colors ${
        danger ? "bg-red-600 text-white hover:bg-red-500" : active ? "bg-white/15 text-white hover:bg-white/25" : "bg-white text-slate-900 hover:bg-slate-200"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

/** Floating call window, visible on every page while you're in a huddle. */
export default function HuddleWindow() {
  const huddle = useHuddle();
  const chat = useChat();
  const [clock, setClock] = useState(Date.now());
  const inCall = Boolean(huddle?.current);

  useEffect(() => {
    if (!inCall) return undefined;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [inCall]);

  if (!huddle?.current || !chat) return null;
  const { current, media, expanded, setExpanded } = huddle;
  const channel = chat.channelsById[current.channelId];
  const participants = current.huddle?.participants || [];
  const startedAt = Number(current.huddle?.startedAt) || current.joinedAt;
  const others = participants.filter((entry) => entry.id !== chat.uid);
  const localTrack = huddle.getLocalVideoTrack();
  const name = channel ? chat.getChannelName(channel) : "Huddle";

  return (
    <div
      className={`fixed z-[9997] ${expanded ? "inset-4 md:inset-10" : "bottom-5 right-5 w-[min(340px,calc(100vw-2.5rem))]"} flex flex-col rounded-2xl bg-slate-900 text-white shadow-2xl ring-1 ring-white/10`}
      role="dialog"
      aria-label={`Huddle in ${name}`}
      data-testid="huddle-window"
    >
      {Object.entries(media.remote || {}).map(([peerId, entry]) => (entry.stream ? <RemoteAudio key={peerId} stream={entry.stream} /> : null))}
      <div className="flex items-center gap-2 px-3 pt-3">
        <span className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center"><FaHeadphones className="w-3.5 h-3.5" /></span>
        <button type="button" onClick={() => requestNavigate(`chats?c=${encodeURIComponent(current.channelId)}`)} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block text-[11px] text-white/60 tabular-nums">{formatDuration(clock - startedAt)} · {participants.length} in huddle</span>
        </button>
        <button type="button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Minimize" : "Expand"} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-white/70 hover:bg-white/10">
          {expanded ? <FaCompress className="w-3.5 h-3.5" /> : <FaExpand className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto p-3 grid gap-2 ${expanded ? "grid-cols-2 lg:grid-cols-3 content-center" : "grid-cols-2"}`}>
        <Tile person={chat.usersById[chat.uid]} stream={media.localStream} localTrack={localTrack} isLocal flags={{ muted: media.muted, video: media.video, screen: media.screen }} large={expanded} />
        {others.map((entry) => (
          <Tile key={entry.id} person={chat.usersById[entry.id]} stream={media.remote?.[entry.id]?.stream} flags={entry} large={expanded} />
        ))}
        {!others.length && (
          <div className={`flex items-center justify-center rounded-xl border border-dashed border-white/20 p-3 text-center text-xs text-white/60 ${expanded ? "aspect-video" : "aspect-[4/3]"}`}>
            Waiting for others to join…
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 px-3 pb-3">
        <ControlButton icon={media.muted ? FaMicrophoneSlash : FaMicrophone} label={media.muted ? "Unmute" : "Mute"} active={!media.muted} onClick={huddle.toggleMute} testId="huddle-mute" />
        <ControlButton icon={media.video ? FaVideo : FaVideoSlash} label={media.video ? "Turn camera off" : "Turn camera on"} active={!media.video} onClick={huddle.toggleVideo} testId="huddle-video" />
        {navigator.mediaDevices?.getDisplayMedia && (
          <ControlButton icon={FaDesktop} label={media.screen ? "Stop sharing" : "Share screen"} active={!media.screen} onClick={huddle.toggleScreen} />
        )}
        <ControlButton icon={FaPhoneSlash} label="Leave huddle" danger onClick={() => huddle.leave()} testId="huddle-leave" />
      </div>
    </div>
  );
}
