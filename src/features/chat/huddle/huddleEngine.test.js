import { HuddleEngine, isPolitePeer } from "./huddleEngine";

/*
 * Minimal in-memory RTCPeerConnection: enough of the signalling state machine
 * to exercise perfect negotiation (offers, answers, collisions, candidates).
 */
class FakeTrack {
  constructor(kind) { this.kind = kind; this.enabled = true; this.readyState = "live"; }
  stop() { this.readyState = "ended"; }
}

class FakeStream {
  constructor(tracks = []) { this.tracks = tracks; }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter((track) => track.kind === "audio"); }
  getVideoTracks() { return this.tracks.filter((track) => track.kind === "video"); }
  addTrack(track) { this.tracks.push(track); }
  removeTrack(track) { this.tracks = this.tracks.filter((entry) => entry !== track); }
}

class FakePeerConnection {
  constructor() {
    this.signalingState = "stable";
    this.localDescription = null;
    this.remoteDescription = null;
    this.senders = [];
    this.candidates = [];
    this.connectionState = "new";
    FakePeerConnection.instances.push(this);
  }

  addTrack(track) {
    const sender = { track, replaceTrack: async (next) => { sender.track = next; } };
    this.senders.push(sender);
    Promise.resolve().then(() => this.onnegotiationneeded?.());
    return sender;
  }

  getSenders() { return this.senders; }

  getTransceivers() { return this.senders.map((sender) => ({ sender, receiver: { track: { kind: sender.track?.kind } }, direction: "sendrecv" })); }

  async setLocalDescription(description) {
    const type = description?.type || (this.signalingState === "have-remote-offer" ? "answer" : "offer");
    this.localDescription = { type, sdp: `${type}-sdp` };
    this.signalingState = type === "offer" ? "have-local-offer" : "stable";
  }

  async setRemoteDescription(description) {
    if (description.type === "offer" && this.signalingState === "have-local-offer") {
      // Rollback (what browsers do implicitly for the polite peer).
      this.localDescription = null;
    }
    this.remoteDescription = description;
    this.signalingState = description.type === "offer" ? "have-remote-offer" : "stable";
  }

  async addIceCandidate(candidate) { this.candidates.push(candidate); }

  close() { this.closed = true; }
}
FakePeerConnection.instances = [];

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function makeEngine(uid, bus) {
  const mediaDevices = { getUserMedia: async ({ video }) => new FakeStream([new FakeTrack("audio"), ...(video ? [new FakeTrack("video")] : [])]) };
  const engine = new HuddleEngine({
    uid,
    sessionId: `${uid}-s`,
    sendSignal: (signal) => bus.push(signal),
    onChange: () => {},
    iceServers: [],
    mediaDevices,
    PeerConnection: FakePeerConnection,
  });
  return engine;
}

async function deliver(bus, engines) {
  // Pump signals until both sides are quiet.
  for (let round = 0; round < 10 && bus.length; round += 1) {
    const batch = bus.splice(0, bus.length);
    // eslint-disable-next-line no-await-in-loop
    for (const signal of batch) await engines[signal.to].handleSignal(signal);
    // eslint-disable-next-line no-await-in-loop
    await flush();
  }
}

describe("HuddleEngine", () => {
  beforeEach(() => { FakePeerConnection.instances = []; });

  it("decides politeness deterministically", () => {
    expect(isPolitePeer("b", "a")).toBe(true);
    expect(isPolitePeer("a", "b")).toBe(false);
  });

  it("negotiates a connection between a newcomer and an existing participant", async () => {
    const bus = [];
    const alice = makeEngine("alice", bus);
    const bob = makeEngine("bob", bus);
    await alice.start();
    alice.joinedAt = 1;
    await bob.start();
    bob.joinedAt = 2;

    // Bob joined later: he connects to Alice and sends the offer.
    bob.syncPeers([{ id: "alice", joinedAt: 1, sessionId: "alice-s" }, { id: "bob", joinedAt: 2 }]);
    alice.syncPeers([{ id: "alice", joinedAt: 1 }, { id: "bob", joinedAt: 2, sessionId: "bob-s" }]);
    await flush();
    await deliver(bus, { alice, bob });

    const bobPc = bob.peers.get("alice").pc;
    const alicePc = alice.peers.get("bob").pc;
    expect(bobPc.signalingState).toBe("stable");
    expect(alicePc.signalingState).toBe("stable");
    expect(alicePc.remoteDescription.type).toBeDefined();
    expect(bobPc.remoteDescription).not.toBeNull();
  });

  it("resolves offer collisions with the polite peer yielding", async () => {
    const bus = [];
    const a = makeEngine("a", bus);
    const b = makeEngine("b", bus);
    await a.start();
    await b.start();
    // Both create connections at once → both send offers.
    a.ensurePeer("b", "b-s");
    b.ensurePeer("a", "a-s");
    await flush();
    await deliver(bus, { a, b });
    expect(a.peers.get("b").pc.signalingState).toBe("stable");
    expect(b.peers.get("a").pc.signalingState).toBe("stable");
  });

  it("queues ICE candidates until the remote description is set", async () => {
    const bus = [];
    // "z" > "b": the polite side, so it accepts the offer even mid-negotiation.
    const z = makeEngine("z", bus);
    await z.start();
    await z.handleSignal({ from: "b", fromSession: "b-s", kind: "candidate", payload: { candidate: "c1" } });
    const peer = z.peers.get("b");
    expect(peer.pendingCandidates).toHaveLength(1);
    await z.handleSignal({ from: "b", fromSession: "b-s", kind: "description", payload: { type: "offer", sdp: "x" } });
    expect(peer.pc.candidates).toEqual([{ candidate: "c1" }]);
    expect(bus.some((signal) => signal.kind === "description" && signal.payload.type === "answer")).toBe(true);
  });

  it("lets the impolite peer ignore a colliding offer", async () => {
    const bus = [];
    const a = makeEngine("a", bus);
    await a.start();
    a.ensurePeer("b", "b-s");
    await flush(); // a is now making its own offer
    await a.handleSignal({ from: "b", fromSession: "b-s", kind: "description", payload: { type: "offer", sdp: "x" } });
    expect(a.peers.get("b").ignoreOffer).toBe(true);
    expect(a.peers.get("b").pc.signalingState).toBe("have-local-offer");
  });

  it("mutes, closes departed peers and cleans up on leave", async () => {
    const bus = [];
    const a = makeEngine("a", bus);
    await a.start();
    a.joinedAt = 5;
    a.syncPeers([{ id: "b", joinedAt: 1, sessionId: "b-s" }]);
    expect(a.peers.has("b")).toBe(true);
    a.setMuted(true);
    expect(a.localStream.getAudioTracks()[0].enabled).toBe(false);
    a.syncPeers([]);
    expect(a.peers.has("b")).toBe(false);
    a.syncPeers([{ id: "b", joinedAt: 1, sessionId: "b-s" }]);
    const tracks = a.localStream.getTracks();
    a.leave();
    expect(bus.some((signal) => signal.kind === "bye" && signal.to === "b")).toBe(true);
    expect(tracks.every((track) => track.readyState === "ended")).toBe(true);
    expect(a.peers.size).toBe(0);
  });

  it("reconnects when a peer rejoins with a new session", async () => {
    const bus = [];
    const a = makeEngine("a", bus);
    await a.start();
    a.joinedAt = 5;
    a.syncPeers([{ id: "b", joinedAt: 1, sessionId: "s1" }]);
    const first = a.peers.get("b").pc;
    a.syncPeers([{ id: "b", joinedAt: 1, sessionId: "s2" }]);
    expect(first.closed).toBe(true);
    expect(a.peers.get("b").sessionId).toBe("s2");
  });
});
