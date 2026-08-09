/**
 * Client-side notification sounds, synthesized with the Web Audio API so no
 * audio assets need to be shipped.
 *
 * Browsers only allow audio after a user gesture; {@link unlockNotificationSounds}
 * installs a one-time listener that resumes the shared AudioContext on the first
 * interaction, so tones triggered later by realtime events can actually play.
 */

let sharedContext: AudioContext | undefined;

const getAudioContext = (): AudioContext | undefined => {
  if (typeof globalThis === 'undefined' || typeof document === 'undefined') return undefined;
  if (sharedContext !== undefined) return sharedContext;

  try {
    // Throws when the browser does not support the Web Audio API
    sharedContext = new globalThis.AudioContext();
  } catch {
    return undefined;
  }
  return sharedContext;
};

const resumeContext = (context: AudioContext): void => {
  if (context.state === 'suspended') {
    context.resume().catch(() => {
      // Autoplay policy blocked the resume; the tone is skipped silently.
    });
  }
};

interface ToneOptions {
  frequency: number;
  /** Offset in seconds relative to now. */
  startAt: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
}

const scheduleTone = (context: AudioContext, options: ToneOptions): void => {
  const { frequency, startAt, duration, volume, type = 'sine' } = options;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  const start = context.currentTime + startAt;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);

  // Quick attack and exponential release to avoid clicks
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
};

/**
 * Installs a one-time listener that unlocks the AudioContext on the first user
 * interaction. Returns a cleanup function.
 */
export const unlockNotificationSounds = (): (() => void) => {
  const unlock = (): void => {
    const context = getAudioContext();
    if (context !== undefined) resumeContext(context);
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  };

  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);

  return (): void => {
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('keydown', unlock);
  };
};

/**
 * Soft two-note "ding" used when a new message arrives in the chat that is
 * currently open (instead of a push notification).
 */
export const playMessageTone = (): void => {
  const context = getAudioContext();
  if (context === undefined) return;
  resumeContext(context);
  if (context.state !== 'running') return;

  scheduleTone(context, { frequency: 880, startAt: 0, duration: 0.15, volume: 0.12 });
  scheduleTone(context, { frequency: 1174.66, startAt: 0.12, duration: 0.25, volume: 0.12 });
};

/**
 * Urgent, repeating ring used in the admin panel when a new emergency alert
 * chat is created.
 */
export const playAlertRingTone = (): void => {
  const context = getAudioContext();
  if (context === undefined) return;
  resumeContext(context);
  if (context.state !== 'running') return;

  // Three "dee-doo" siren bursts
  for (let burst = 0; burst < 3; burst++) {
    const offset = burst * 0.55;
    scheduleTone(context, {
      frequency: 988,
      startAt: offset,
      duration: 0.22,
      volume: 0.25,
      type: 'square',
    });
    scheduleTone(context, {
      frequency: 659,
      startAt: offset + 0.24,
      duration: 0.22,
      volume: 0.25,
      type: 'square',
    });
  }
};
