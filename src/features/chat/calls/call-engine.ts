import { incomingText } from '@/features/chat/calls/call-texts';
import type { CallIceServers, CallSignal, CallSignalInput } from '@/lib/chat-call-signal';
import {
  getDocumentLocale,
  requestNativeSystemNotification,
} from '@/utils/foreground-notifications';
import { isNativeAppWebView } from '@/utils/standalone-check';

/**
 * A voice call between the two members of a one-to-one chat, peer to peer over WebRTC.
 *
 * The caller rings every device of the partner with an `invite`. The device that picks up
 * answers with `accept`, and from then on the two devices talk to each other only: the caller
 * sends the WebRTC offer, the callee the answer, and both trickle their ICE candidates. The
 * audio goes directly between the phones, or through the TURN relay when they cannot reach
 * each other, never through our server.
 *
 * One call at a time per page; a second `invite` is answered with `busy`. The state is a module
 * level store, so the call screen and the call button read the same call.
 */

export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active' | 'ended';

export type CallEndReason =
  | 'hungUp'
  | 'partnerHungUp'
  | 'declined'
  | 'busy'
  | 'noAnswer'
  | 'missed'
  | 'connectionLost'
  | 'micDenied'
  | 'micUnavailable'
  | 'error';

export interface CallState {
  phase: CallPhase;
  chatId?: string | undefined;
  partnerId?: string | undefined;
  partnerName?: string | undefined;
  muted: boolean;
  /** When the audio started to flow; the duration on the screen counts from here. */
  connectedAt?: number | undefined;
  /** The connection dropped and is being re-established. */
  reconnecting: boolean;
  endReason?: CallEndReason | undefined;
  /** Set with `endReason: 'error'`: what the server refused, for the screen to translate. */
  error?: unknown;
}

/** How the engine reaches the server; set by the hook that mounts the call screen. */
export interface CallTransport {
  send: (signal: CallSignalInput) => Promise<void>;
  getIceServers: () => Promise<CallIceServers>;
}

/** How long a call rings before the caller gives up. */
const RING_TIMEOUT_MS = 45_000;
/** How long the screen says how the call ended before it closes. */
const ENDED_DISPLAY_MS = 2500;
/** A refused microphone says what to do about it, which takes longer to read. */
const MIC_DENIED_DISPLAY_MS = 8000;
/** How long a dropped connection may recover on its own before the caller restarts ICE. */
const RECONNECT_GRACE_MS = 5000;
/** How long the callee waits for the caller's restart before giving up on a failed call. */
const FAILED_GIVE_UP_MS = 15_000;
/** How long a taken call may take to connect before both sides give up on it. */
const CONNECT_TIMEOUT_MS = 20_000;

/** Swiss ringback: 425 Hz, one second on, four off. */
const RINGBACK_TONE = { frequency: 425, onMs: 1000, offMs: 4000 };
/** The ring of an incoming call, two short beeps every two seconds. */
const RING_TONE = { frequency: 880, onMs: 400, offMs: 1600 };
const RING_VIBRATION = [400, 200, 400];

interface Session {
  callId: string;
  chatId: string;
  partnerName: string;
  isCaller: boolean;
  /** The partner's device in this call; for the callee the one that rang, for the caller the one that answered. */
  remoteDevice?: string | undefined;
  pc?: RTCPeerConnection | undefined;
  localStream?: MediaStream | undefined;
  remoteStream?: MediaStream | undefined;
  audio?: HTMLAudioElement | undefined;
  iceServers: RTCIceServer[];
  /** Candidates that arrived before the description they belong to. */
  pendingCandidates: RTCIceCandidateInit[];
  restartedIce: boolean;
  /**
   * One of the partner's devices is in another call. Only one: the others may still ring and
   * be picked up, so the call rings on and says "busy" only if nobody answers.
   */
  partnerBusy: boolean;
  timers: ReturnType<typeof setTimeout>[];
  stopTone?: (() => void) | undefined;
}

const idleState: CallState = { phase: 'idle', muted: false, reconnecting: false };

interface EngineStore {
  state: CallState;
  session: Session | undefined;
  transport: CallTransport | undefined;
  endedTimer: ReturnType<typeof setTimeout> | undefined;
  audioContext: AudioContext | undefined;
  deviceId: string | undefined;
  /** Signals go out one after the other, so the partner gets them in the order they were made. */
  sendChain: Promise<void>;
  listeners: Set<() => void>;
}

/**
 * Kept on the global object, not in module variables: a hot reload in development evaluates
 * this module again, and a second copy of the state splits a running call between the screen
 * and the stream's listener, which then drops every signal.
 */
const engine: EngineStore = ((
  globalThis as { __conveniatCallEngine?: EngineStore }
).__conveniatCallEngine ??= {
  state: idleState,
  session: undefined,
  transport: undefined,
  endedTimer: undefined,
  audioContext: undefined,
  deviceId: undefined,
  sendChain: Promise.resolve(),
  listeners: new Set(),
});

const getDeviceId = (): string => {
  engine.deviceId ??= crypto.randomUUID();
  return engine.deviceId;
};

const setState = (patch: Partial<CallState>): void => {
  engine.state = { ...engine.state, ...patch };
  for (const listener of engine.listeners) listener();
};

/** Subscribes to the call state, for `useSyncExternalStore`. */
export const subscribeToCall = (listener: () => void): (() => void) => {
  engine.listeners.add(listener);
  return (): void => {
    engine.listeners.delete(listener);
  };
};

export const getCallState = (): CallState => engine.state;
export const getServerCallState = (): CallState => idleState;

export const setCallTransport = (next: CallTransport | undefined): void => {
  engine.transport = next;
};

/**
 * Whether the native app around this page can call: only a build that declares the
 * microphone says so. Read on every check, because the app may add the info after our bundle
 * ran; a read must never throw in a torn-down WebView.
 */
const nativeAppSupportsCalls = (): boolean => {
  try {
    return globalThis.AppWebViewNativeApp?.voiceCalls === true;
  } catch {
    return false;
  }
};

/**
 * Whether this browser can place and take calls: a native app build that supports them and
 * Chromium browsers. An older app build neither shows the button nor rings.
 */
export const canMakeCalls = (): boolean => {
  if (typeof navigator === 'undefined' || typeof RTCPeerConnection === 'undefined') return false;
  // undefined outside a secure context, whatever the types say
  const mediaDevices = navigator.mediaDevices as MediaDevices | undefined;
  if (mediaDevices === undefined) return false;
  const { userAgentData } = navigator as Navigator & {
    userAgentData?: { brands?: { brand: string }[] };
  };
  const isChromium = userAgentData?.brands?.some((entry) => entry.brand === 'Chromium') === true;
  if (isNativeAppWebView()) return nativeAppSupportsCalls();
  return isChromium;
};

const send = (
  s: Session,
  kind: CallSignalInput['kind'],
  extra: Partial<CallSignalInput> = {},
  /** Told when the server refused the signal, for the one refusal worth showing: the invite. */
  onRefused?: (error: unknown) => void,
): void => {
  const current = engine.transport;
  if (current === undefined) return;
  const signal: CallSignalInput = {
    chatId: s.chatId,
    callId: s.callId,
    kind,
    fromDevice: getDeviceId(),
    ...(s.remoteDevice === undefined ? {} : { toDevice: s.remoteDevice }),
    ...extra,
  };
  engine.sendChain = engine.sendChain
    .then(() => current.send(signal))
    .catch((error: unknown) => {
      console.warn('[Call] Sending a signal failed:', kind, error);
      onRefused?.(error);
    });
};

/** The context is made on the tap that starts or takes a call, where the browser allows sound. */
const getAudioContext = (): AudioContext | undefined => {
  try {
    engine.audioContext ??= new AudioContext();
    if (engine.audioContext.state === 'suspended') engine.audioContext.resume().catch(() => {});
    return engine.audioContext;
  } catch {
    return undefined;
  }
};

/** Safari has no vibration, whatever the types say. */
const vibrate = (pattern: number | number[]): void => {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
};

const playTone = (
  tone: { frequency: number; onMs: number; offMs: number },
  vibration?: number[],
): (() => void) => {
  const beep = (): void => {
    if (vibration !== undefined) vibrate(vibration);
    const context = getAudioContext();
    if (context?.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.08;
    oscillator.frequency.value = tone.frequency;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + tone.onMs / 1000);
  };
  beep();
  const interval = setInterval(beep, tone.onMs + tone.offMs);
  return (): void => {
    clearInterval(interval);
    vibrate(0);
  };
};

/**
 * The element the partner's voice plays through. Started on the user's tap with a still empty
 * stream, because the WebView would refuse to start it later without one; the partner's track
 * is added to the stream once it arrives.
 */
const attachAudioSink = (s: Session): void => {
  const remoteStream = new MediaStream();
  const audio = new Audio();
  audio.autoplay = true;
  audio.srcObject = remoteStream;
  audio.play().catch(() => {});
  s.remoteStream = remoteStream;
  s.audio = audio;
};

/** What the browser refused with when the user, or a policy, said no to the microphone. */
const isMicrophoneDenied = (error: unknown): boolean =>
  error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name);

/**
 * Asks for the microphone. Every refusal ends the call with its own answer: denied, which the
 * user can change in the settings, or not available, like none at all or one another app holds.
 */
const takeMicrophone = async (s: Session): Promise<MediaStream | undefined> => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
  } catch (error) {
    console.warn('[Call] No microphone:', error);
    if (engine.session === s) {
      end(isMicrophoneDenied(error) ? 'micDenied' : 'micUnavailable', !s.isCaller);
    }
    return undefined;
  }
};

/** Takes the microphone and the relay credentials, both needed before anything is sent. */
const prepareMedia = async (s: Session): Promise<boolean> => {
  const transport = engine.transport;
  if (transport === undefined) {
    end('error', false);
    return false;
  }
  const iceServers = transport.getIceServers();
  // handled below; without this an early refusal of the microphone leaves it unhandled
  iceServers.catch(() => {});

  const stream = await takeMicrophone(s);
  if (stream === undefined) return false;
  try {
    const ice = await iceServers;
    if (engine.session !== s) {
      for (const track of stream.getTracks()) track.stop();
      return false;
    }
    s.localStream = stream;
    s.iceServers = ice.iceServers;
    return true;
  } catch (error) {
    for (const track of stream.getTracks()) track.stop();
    if (engine.session === s) end('error', !s.isCaller, error);
    return false;
  }
};

const cleanup = (s: Session): void => {
  for (const timer of s.timers) clearTimeout(timer);
  s.stopTone?.();
  if (s.pc !== undefined) {
    s.pc.onicecandidate = null;
    s.pc.ontrack = null;
    s.pc.onconnectionstatechange = null;
    s.pc.close();
  }
  for (const track of s.localStream?.getTracks() ?? []) track.stop();
  if (s.audio !== undefined) {
    s.audio.pause();
    s.audio.srcObject = null;
  }
};

/**
 * Ends the current call. `notify` tells the partner with a `hangup`; `display` shows how the
 * call ended for a moment instead of closing the screen right away.
 */
const end = (reason: CallEndReason, notify: boolean, error?: unknown, display = true): void => {
  const s = engine.session;
  if (s === undefined) return;
  engine.session = undefined;
  if (notify) send(s, 'hangup');
  cleanup(s);
  if (engine.endedTimer !== undefined) clearTimeout(engine.endedTimer);
  if (!display) {
    engine.state = idleState;
    for (const listener of engine.listeners) listener();
    return;
  }
  setState({ phase: 'ended', endReason: reason, error, reconnecting: false });
  engine.endedTimer = setTimeout(
    () => {
      engine.endedTimer = undefined;
      engine.state = idleState;
      for (const listener of engine.listeners) listener();
    },
    reason === 'micDenied' || reason === 'micUnavailable'
      ? MIC_DENIED_DISPLAY_MS
      : ENDED_DISPLAY_MS,
  );
};

const flushCandidates = async (s: Session): Promise<void> => {
  const pending = s.pendingCandidates.splice(0);
  for (const candidate of pending) {
    await s.pc?.addIceCandidate(candidate).catch((error: unknown) => {
      console.warn('[Call] Dropping a candidate:', error);
    });
  }
};

const makeOffer = async (s: Session, iceRestart: boolean): Promise<void> => {
  if (s.pc === undefined || engine.session !== s) return;
  const offer = await s.pc.createOffer({ iceRestart });
  await s.pc.setLocalDescription(offer);
  send(s, 'offer', { sdp: offer.sdp ?? '' });
};

const onConnectionStateChange = (s: Session): void => {
  if (engine.session !== s || s.pc === undefined) return;
  const connectionState = s.pc.connectionState;

  if (connectionState === 'connected') {
    setState({
      phase: 'active',
      connectedAt: engine.state.connectedAt ?? Date.now(),
      reconnecting: false,
    });
    return;
  }
  if (connectionState === 'disconnected') {
    // often a switch between Wi-Fi and mobile data; the caller restarts ICE if it lasts
    setState({ reconnecting: true });
    if (s.isCaller) {
      s.timers.push(
        setTimeout(() => {
          if (engine.session === s && s.pc?.connectionState !== 'connected') {
            makeOffer(s, true).catch(() => end('connectionLost', true));
          }
        }, RECONNECT_GRACE_MS),
      );
    }
    return;
  }
  if (connectionState === 'failed') {
    setState({ reconnecting: true });
    if (s.isCaller && !s.restartedIce) {
      s.restartedIce = true;
      makeOffer(s, true).catch(() => end('connectionLost', true));
    } else if (s.isCaller) {
      end('connectionLost', true);
    } else {
      s.timers.push(
        setTimeout(() => {
          if (engine.session === s && s.pc?.connectionState !== 'connected')
            end('connectionLost', true);
        }, FAILED_GIVE_UP_MS),
      );
    }
  }
};

const createPeer = (s: Session): RTCPeerConnection => {
  const pc = new RTCPeerConnection({ iceServers: s.iceServers });
  s.pc = pc;
  for (const track of s.localStream?.getTracks() ?? []) {
    if (s.localStream !== undefined) pc.addTrack(track, s.localStream);
  }
  pc.onicecandidate = (event): void => {
    if (event.candidate === null || engine.session !== s) return;
    send(s, 'ice', {
      candidate: {
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
      },
    });
  };
  pc.ontrack = (event): void => {
    s.remoteStream?.addTrack(event.track);
    s.audio?.play().catch(() => {});
  };
  pc.onconnectionstatechange = (): void => onConnectionStateChange(s);
  return pc;
};

const newSession = (
  callId: string,
  chatId: string,
  partnerName: string,
  isCaller: boolean,
): Session => ({
  callId,
  chatId,
  partnerName,
  isCaller,
  iceServers: [],
  pendingCandidates: [],
  restartedIce: false,
  partnerBusy: false,
  timers: [],
});

const clearEndedScreen = (): void => {
  if (engine.endedTimer !== undefined) clearTimeout(engine.endedTimer);
  engine.endedTimer = undefined;
};

/**
 * A taken call that does not connect, because the other side went away or its signals were
 * lost, ends instead of hanging in "connecting" until someone gives up.
 */
const armConnectTimeout = (s: Session): void => {
  s.timers.push(
    setTimeout(() => {
      if (engine.session === s && engine.state.phase === 'connecting') end('connectionLost', true);
    }, CONNECT_TIMEOUT_MS),
  );
};

/** Rings the partner of a one-to-one chat. Call it from the tap on the call button. */
export const startCall = async (
  chatId: string,
  partnerName: string,
  partnerId?: string,
): Promise<void> => {
  if (engine.session !== undefined) return;
  clearEndedScreen();
  const s = newSession(crypto.randomUUID(), chatId, partnerName, true);
  engine.session = s;
  attachAudioSink(s);
  setState({
    ...idleState,
    phase: 'outgoing',
    chatId,
    partnerId,
    partnerName,
  });

  if (!(await prepareMedia(s))) return;
  // refused, e.g. calls are off in this chat: say so instead of ringing into the void
  send(s, 'invite', {}, (error) => {
    if (engine.session === s) end('error', false, error);
  });
  s.stopTone = playTone(RINGBACK_TONE);
  s.timers.push(
    setTimeout(() => {
      if (engine.session === s && engine.state.phase === 'outgoing')
        end(s.partnerBusy ? 'busy' : 'noAnswer', true);
    }, RING_TIMEOUT_MS),
  );
};

/** Takes the ringing call. Call it from the tap on the accept button. */
export const acceptCall = async (): Promise<void> => {
  const s = engine.session;
  if (s === undefined || engine.state.phase !== 'incoming') return;
  s.stopTone?.();
  s.stopTone = undefined;
  attachAudioSink(s);
  setState({ phase: 'connecting' });
  armConnectTimeout(s);

  if (!(await prepareMedia(s))) return;
  createPeer(s);
  send(s, 'accept');
};

/** Turns the ringing call down; the caller hears that it was declined. */
export const declineCall = (): void => {
  const s = engine.session;
  if (s === undefined || engine.state.phase !== 'incoming') return;
  send(s, 'decline');
  end('declined', false, undefined, false);
};

/** Closes the screen that says how the call ended, before it closes by itself. */
export const dismissEndedCall = (): void => {
  if (engine.state.phase !== 'ended') return;
  if (engine.endedTimer !== undefined) clearTimeout(engine.endedTimer);
  engine.endedTimer = undefined;
  engine.state = idleState;
  for (const listener of engine.listeners) listener();
};

/** Ends the call from this side, ringing or talking. */
export const hangUp = (): void => {
  end('hungUp', true);
};

export const toggleMute = (): void => {
  const s = engine.session;
  if (s === undefined) return;
  const muted = !engine.state.muted;
  for (const track of s.localStream?.getAudioTracks() ?? []) track.enabled = !muted;
  setState({ muted });
};

/**
 * The app in the background still gets the invite while Android keeps it alive, but nothing on
 * the screen shows it: the shell's system notification does, and leads back to the chat.
 */
const notifyInBackground = (signal: CallSignal): void => {
  if (!isNativeAppWebView() || document.visibilityState === 'visible') return;
  requestNativeSystemNotification({
    chatId: signal.chatId,
    messageId: `call:${signal.callId}`,
    title: signal.fromName,
    body: incomingText[getDocumentLocale()],
    targetPath: `/app/chat/${signal.chatId}`,
  });
};

const onInvite = (signal: CallSignal): void => {
  if (engine.session !== undefined) {
    if (engine.session.callId === signal.callId) return;
    const busy = newSession(signal.callId, signal.chatId, signal.fromName, false);
    busy.remoteDevice = signal.fromDevice;
    send(busy, 'busy');
    return;
  }
  // a browser that cannot take the call lets it ring out on the caller's side
  if (!canMakeCalls()) return;

  clearEndedScreen();
  const s = newSession(signal.callId, signal.chatId, signal.fromName, false);
  s.remoteDevice = signal.fromDevice;
  engine.session = s;
  setState({
    ...idleState,
    phase: 'incoming',
    chatId: signal.chatId,
    partnerId: signal.fromUser,
    partnerName: signal.fromName,
  });
  s.stopTone = playTone(RING_TONE, RING_VIBRATION);
  notifyInBackground(signal);
  s.timers.push(
    setTimeout(() => {
      // tells the server too: a caller who closed the app while it rang never ends the call,
      // and the chat would miss its "Verpasster Anruf"
      if (engine.session === s && engine.state.phase === 'incoming') end('missed', true);
    }, RING_TIMEOUT_MS + 5000),
  );
};

const onAccept = async (s: Session, signal: CallSignal): Promise<void> => {
  if (!s.isCaller || engine.state.phase !== 'outgoing') {
    console.warn('[Call] Ignoring accept:', { isCaller: s.isCaller, phase: engine.state.phase });
    return;
  }
  s.remoteDevice = signal.fromDevice;
  s.stopTone?.();
  s.stopTone = undefined;
  setState({ phase: 'connecting' });
  armConnectTimeout(s);
  createPeer(s);
  await makeOffer(s, false);
};

const onOffer = async (s: Session, sdp: string): Promise<void> => {
  const pc = s.pc;
  if (pc === undefined) return;
  await pc.setRemoteDescription({ type: 'offer', sdp });
  await flushCandidates(s);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  send(s, 'answer', { sdp: answer.sdp ?? '' });
};

const onAnswer = async (s: Session, sdp: string): Promise<void> => {
  const pc = s.pc;
  if (pc?.signalingState !== 'have-local-offer') return;
  await pc.setRemoteDescription({ type: 'answer', sdp });
  await flushCandidates(s);
};

const onCandidate = async (s: Session, candidate: RTCIceCandidateInit): Promise<void> => {
  if (s.pc?.remoteDescription == undefined) {
    s.pendingCandidates.push(candidate);
    return;
  }
  await s.pc.addIceCandidate(candidate);
};

const dispatch = async (s: Session, signal: CallSignal): Promise<void> => {
  switch (signal.kind) {
    case 'accept': {
      await onAccept(s, signal);
      break;
    }
    case 'decline': {
      end('declined', false);
      break;
    }
    case 'busy': {
      s.partnerBusy = true;
      break;
    }
    case 'hangup': {
      end(engine.state.phase === 'incoming' ? 'missed' : 'partnerHungUp', false);
      break;
    }
    case 'offer': {
      if (signal.sdp !== undefined) await onOffer(s, signal.sdp);
      break;
    }
    case 'answer': {
      if (signal.sdp !== undefined) await onAnswer(s, signal.sdp);
      break;
    }
    case 'ice': {
      if (signal.candidate !== undefined) await onCandidate(s, signal.candidate);
      break;
    }
    case 'invite': {
      break;
    }
  }
};

/**
 * Handles a signal from the user's personal realtime channel. `recipient` is the user it was
 * delivered to, so a signal from that same user is one of their other devices.
 */
export const handleCallSignal = (signal: CallSignal, recipient: string): void => {
  if (signal.fromUser === recipient) {
    // the user picked up or declined on another of their devices: stop ringing here
    const s = engine.session;
    if (s?.callId === signal.callId && signal.fromDevice !== getDeviceId()) {
      end('declined', false, undefined, false);
    }
    return;
  }

  if (signal.kind === 'invite') {
    onInvite(signal);
    return;
  }

  const s = engine.session;
  // A dropped signal leaves a call hanging without a trace; say why, it is the first thing to
  // look at when a call does not connect. Candidates of another call are expected, the rest not.
  const drop = (reason: string): void => {
    if (signal.kind !== 'ice') {
      console.warn('[Call] Dropping signal:', signal.kind, reason, {
        callId: signal.callId,
        currentCallId: s?.callId,
        phase: engine.state.phase,
        toDevice: signal.toDevice,
        thisDevice: getDeviceId(),
        fromDevice: signal.fromDevice,
        remoteDevice: s?.remoteDevice,
      });
    }
  };
  if (s?.callId !== signal.callId) {
    drop('not the current call');
    return;
  }
  if (signal.toDevice !== undefined && signal.toDevice !== getDeviceId()) {
    drop('meant for another device');
    return;
  }
  if (s.remoteDevice !== undefined && signal.fromDevice !== s.remoteDevice) {
    drop('from another device of the partner');
    return;
  }

  dispatch(s, signal).catch((error: unknown) => {
    console.warn('[Call] Handling a signal failed:', signal.kind, error);
    if (engine.session === s) end('connectionLost', true);
  });
};
