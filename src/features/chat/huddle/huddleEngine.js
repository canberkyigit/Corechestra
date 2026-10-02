/*
 * Huddle engine: WebRTC mesh (every participant connects to every other,
 * up to HUDDLE_MAX_PARTICIPANTS) using the "perfect negotiation" pattern.
 * Signalling (offers/answers/ICE candidates) travels through the chat
 * backend (`chatHuddles/{channelId}/signals`), so no extra server is needed
 * for discovery. Media flows peer-to-peer; networks that block direct
 * connections need a TURN server (REACT_APP_HUDDLE_TURN_*).
 */

const DEFAULT_ICE = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

export function getIceServers() {
  const servers = [...DEFAULT_ICE];
  const turnUrl = process.env.REACT_APP_HUDDLE_TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl.split(",").map((url) => url.trim()).filter(Boolean),
      username: process.env.REACT_APP_HUDDLE_TURN_USERNAME || undefined,
      credential: process.env.REACT_APP_HUDDLE_TURN_CREDENTIAL || undefined,
    });
  }
  return servers;
}

export function isHuddleSupported() {
  return typeof window !== "undefined"
    && typeof window.RTCPeerConnection === "function"
    && Boolean(navigator?.mediaDevices?.getUserMedia);
}

export function describeMediaError(error) {
  const name = error?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Microphone access was blocked. Allow it in your browser's site settings and try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone was found.";
  if (name === "NotReadableError") return "Your microphone is being used by another application.";
  return error?.message || "Could not start audio.";
}

/** Polite peer = the one with the larger id; it yields on offer collisions. */
export function isPolitePeer(localId, remoteId) {
  return String(localId) > String(remoteId);
}

export class HuddleEngine {
  constructor({ uid, sessionId, sendSignal, onChange, iceServers = getIceServers(), mediaDevices = navigator.mediaDevices, PeerConnection = window.RTCPeerConnection }) {
    this.uid = uid;
    this.sessionId = sessionId;
    this.sendSignal = sendSignal;
    this.onChange = onChange;
    this.iceServers = iceServers;
    this.mediaDevices = mediaDevices;
    this.PeerConnection = PeerConnection;
    this.peers = new Map(); // peerId -> { pc, polite, makingOffer, ignoreOffer, sessionId, stream, state }
    this.localStream = null;
    this.cameraTrack = null;
    this.screenTrack = null;
    this.muted = false;
    this.video = false;
    this.screen = false;
    this.closed = false;
    this.joinedAt = Date.now();
  }

  emit() {
    if (this.closed) return;
    const remote = {};
    this.peers.forEach((peer, id) => {
      remote[id] = { stream: peer.stream, state: peer.pc.connectionState || peer.pc.iceConnectionState || "new" };
    });
    this.onChange?.({
      localStream: this.localStream,
      remote,
      muted: this.muted,
      video: this.video,
      screen: this.screen,
    });
  }

  async start({ video = false } = {}) {
    this.localStream = await this.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: video ? { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } } : false,
    });
    this.cameraTrack = this.localStream.getVideoTracks()[0] || null;
    this.video = Boolean(this.cameraTrack);
    this.emit();
    return this.localStream;
  }

  /** Creates (or returns) the connection to `peerId`, adding our tracks. */
  ensurePeer(peerId, peerSessionId = null) {
    const existing = this.peers.get(peerId);
    if (existing && (!peerSessionId || !existing.sessionId || existing.sessionId === peerSessionId)) {
      if (peerSessionId && !existing.sessionId) existing.sessionId = peerSessionId;
      return existing;
    }
    if (existing) this.closePeer(peerId);

    const pc = new this.PeerConnection({ iceServers: this.iceServers });
    const peer = {
      pc,
      polite: isPolitePeer(this.uid, peerId),
      makingOffer: false,
      ignoreOffer: false,
      sessionId: peerSessionId,
      stream: null,
      pendingCandidates: [],
    };
    this.peers.set(peerId, peer);

    (this.localStream?.getTracks() || []).forEach((track) => pc.addTrack(track, this.localStream));
    if (this.screenTrack) {
      const sender = HuddleEngine.videoSender(pc);
      if (sender) sender.replaceTrack(this.screenTrack).catch(() => {});
      else pc.addTrack(this.screenTrack, this.localStream);
    }

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        this.send(peerId, "description", { type: pc.localDescription.type, sdp: pc.localDescription.sdp });
      } catch {
        // Negotiation retries on the next change.
      } finally {
        peer.makingOffer = false;
      }
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.send(peerId, "candidate", typeof candidate.toJSON === "function" ? candidate.toJSON() : candidate);
    };
    pc.ontrack = ({ track, streams }) => {
      peer.stream = streams?.[0] || peer.stream || new window.MediaStream();
      if (!streams?.[0]) peer.stream.addTrack(track);
      track.onunmute = () => this.emit();
      track.onended = () => this.emit();
      this.emit();
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") pc.restartIce?.();
      this.emit();
    };
    pc.oniceconnectionstatechange = () => this.emit();
    this.emit();
    return peer;
  }

  send(to, kind, payload) {
    this.sendSignal({ to, from: this.uid, fromSession: this.sessionId, kind, payload, at: Date.now() });
  }

  async handleSignal(signal) {
    if (this.closed || !signal || signal.from === this.uid) return;
    if (signal.kind === "bye") {
      this.closePeer(signal.from);
      return;
    }
    const peer = this.ensurePeer(signal.from, signal.fromSession);
    const { pc } = peer;
    try {
      if (signal.kind === "description") {
        const description = signal.payload;
        const offerCollision = description.type === "offer" && (peer.makingOffer || pc.signalingState !== "stable");
        peer.ignoreOffer = !peer.polite && offerCollision;
        if (peer.ignoreOffer) return;
        await pc.setRemoteDescription(description);
        while (peer.pendingCandidates.length) {
          // eslint-disable-next-line no-await-in-loop
          await pc.addIceCandidate(peer.pendingCandidates.shift()).catch(() => {});
        }
        if (description.type === "offer") {
          await pc.setLocalDescription();
          this.send(signal.from, "description", { type: pc.localDescription.type, sdp: pc.localDescription.sdp });
        }
      } else if (signal.kind === "candidate") {
        if (!pc.remoteDescription) {
          peer.pendingCandidates.push(signal.payload);
          return;
        }
        try {
          await pc.addIceCandidate(signal.payload);
        } catch (error) {
          if (!peer.ignoreOffer) throw error;
        }
      }
    } catch {
      // A broken negotiation is retried by ICE restart / the next renegotiation.
    }
  }

  /** Connects to peers that joined; closes connections to peers that left. */
  syncPeers(participants) {
    if (this.closed) return;
    const live = new Map((participants || []).filter((entry) => entry.id !== this.uid).map((entry) => [entry.id, entry]));
    this.peers.forEach((peer, id) => {
      const entry = live.get(id);
      if (!entry || (entry.sessionId && peer.sessionId && entry.sessionId !== peer.sessionId)) this.closePeer(id);
    });
    // Whoever joined later initiates (they see everyone already there).
    live.forEach((entry, id) => {
      if (!this.peers.has(id) && entry.joinedAt <= this.joinedAt) this.ensurePeer(id, entry.sessionId);
    });
  }

  closePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    try { peer.pc.close(); } catch { /* already closed */ }
    this.peers.delete(peerId);
    this.emit();
  }

  setMuted(muted) {
    this.muted = muted;
    (this.localStream?.getAudioTracks() || []).forEach((track) => { track.enabled = !muted; });
    this.emit();
  }

  /** Video sender of a connection — found via its transceiver, so it survives `replaceTrack(null)`. */
  static videoSender(pc) {
    const transceiver = (pc.getTransceivers?.() || []).find((entry) => (
      entry.sender && (entry.sender.track?.kind === "video" || entry.receiver?.track?.kind === "video")
      && entry.direction !== "recvonly" && entry.direction !== "inactive"
    ));
    return transceiver?.sender || pc.getSenders().find((entry) => entry.track?.kind === "video") || null;
  }

  replaceVideoTrack(track) {
    this.peers.forEach((peer) => {
      const sender = HuddleEngine.videoSender(peer.pc);
      if (sender) sender.replaceTrack(track).catch(() => {});
      else if (track) peer.pc.addTrack(track, this.localStream);
    });
  }

  async setVideo(enabled) {
    if (enabled === this.video) return;
    if (enabled) {
      const camera = await this.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } } });
      this.cameraTrack = camera.getVideoTracks()[0];
      this.localStream.addTrack(this.cameraTrack);
      if (!this.screen) this.replaceVideoTrack(this.cameraTrack);
      this.video = true;
    } else {
      if (this.cameraTrack) {
        this.cameraTrack.stop();
        this.localStream.removeTrack(this.cameraTrack);
      }
      this.cameraTrack = null;
      if (!this.screen) this.replaceVideoTrack(null);
      this.video = false;
    }
    this.emit();
  }

  async setScreenShare(enabled) {
    if (enabled === this.screen) return;
    if (enabled) {
      const display = await this.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15 } }, audio: false });
      this.screenTrack = display.getVideoTracks()[0];
      this.screenTrack.onended = () => { this.setScreenShare(false).catch(() => {}); };
      this.replaceVideoTrack(this.screenTrack);
      this.screen = true;
    } else {
      this.screenTrack?.stop();
      this.screenTrack = null;
      this.replaceVideoTrack(this.cameraTrack || null);
      this.screen = false;
    }
    this.emit();
  }

  /** Our outgoing video (screen share wins over camera). */
  getLocalVideoTrack() {
    return this.screenTrack || this.cameraTrack || null;
  }

  leave() {
    this.peers.forEach((_, id) => this.send(id, "bye", null));
    this.peers.forEach((peer) => { try { peer.pc.close(); } catch { /* ignore */ } });
    this.peers.clear();
    (this.localStream?.getTracks() || []).forEach((track) => track.stop());
    this.screenTrack?.stop();
    this.localStream = null;
    this.closed = true;
  }
}
