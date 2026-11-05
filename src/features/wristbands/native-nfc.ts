/*
The NFC bridge of the native app, `window.AppWebViewNativeNfc`, as cevi/conveniat27-app#31
describes it. Every call returns a request id at once, and its results come back as events on
`window`, named `app-webview-native-nfc-<type>`, whose detail carries that request id. The
global only exists inside the native app; a browser has no way to write a band.

Nothing here logs: the credentials of a band pass through this file.
*/

/** Why the page ends a session that asked for credentials without writing the band. */
export type NfcAbortReason = 'not-genuine' | 'assigned-to-other' | 'revoked' | 'network' | 'other';

/** What the native app reports when a session fails. */
export type NfcErrorCode =
  | 'unsupported'
  | 'disabled'
  | 'busy'
  | 'unsupported-tag'
  | 'tag-lost'
  | 'timeout'
  | 'credentials-timeout'
  | 'aborted'
  | 'invalid-credentials'
  | 'wrong-password'
  | 'tag-locked'
  | 'invalid-url'
  | 'tag-too-small'
  | 'write-failed'
  | 'verification-failed'
  | 'password-unusable'
  | 'tap-again'
  | 'unknown';

/** How a session ended without its result: an error of the app, or cancelled by someone. */
export type NfcFailureCode = NfcErrorCode | 'cancelled';

export interface NfcChip {
  product: 'NTAG213' | 'NTAG215' | 'NTAG216' | 'unknown';
  vendorByte: string;
  genuineNxp: boolean;
}

export interface NfcProtection {
  enabled: boolean;
  configLocked: boolean;
  staticLockBits: boolean;
}

export type NfcProgressStep = 'identify' | 'assess' | 'write' | 'read-back' | 'reselect' | 'verify';

/** The tag on the phone, while the app waits for the page to answer with its credentials. */
export interface NfcCredentialsNeeded {
  requestId: string;
  purpose: 'provision' | 'unprovision';
  uid: string;
  /** NXP's signature over the UID, or null for a chip that returns none */
  signature: string | null;
  chip: NfcChip;
  protection: NfcProtection;
  url: string | null;
}

export interface NfcProvisioned {
  requestId: string;
  uid: string;
  url: string;
  /** the band was already protected with this password and carried the URL: nothing written */
  alreadyProvisioned: boolean;
}

/** The page's answer to `credentials-needed`: the band's password, or why it is refused. */
export type NfcCredentialsAnswer = { password: string; pack: string } | { abort: NfcAbortReason };

/** The global the native app injects. Each method returns the id of the request it starts. */
export interface NativeNfcBridge {
  getStatus: () => string;
  identify: () => string;
  provision: (options: { urlTemplate: string }) => string;
  unprovision: () => string;
  submitCredentials: (requestId: string, credentials: { password: string; pack: string }) => string;
  abort: (requestId: string, reason: NfcAbortReason) => string;
  cancel: () => string;
}

declare global {
  var AppWebViewNativeNfc: NativeNfcBridge | undefined;
}

const EVENT_PREFIX = 'app-webview-native-nfc-';

/**
 * The URL every band carries; the tag fills in its own UID. One host of the app's universal
 * links, which the native app insists on, and the same on both deployments: the bands are
 * conveniat27's.
 */
export const WRISTBAND_URL_TEMPLATE = 'https://conveniat27.ch/tag/{uid}';

/**
 * Android shows no sheet of its own and never gives up waiting for a tag, so the page cancels
 * the session after this long. iOS ends its own after about as long.
 */
export const NFC_SESSION_TIMEOUT_MS = 60_000;

/** A session that ended without its result, with the app's code. */
export class NativeNfcError extends Error {
  readonly code: NfcFailureCode;
  /** for `aborted`: why the page refused the band */
  readonly reason: NfcAbortReason | undefined;

  constructor(code: NfcFailureCode, message?: string, reason?: NfcAbortReason) {
    super(message ?? code);
    this.name = 'NativeNfcError';
    this.code = code;
    this.reason = reason;
  }
}

/** Whether the page runs inside a native app that can read and write NFC tags. */
export const isNativeNfcAvailable = (): boolean =>
  typeof globalThis.AppWebViewNativeNfc?.provision === 'function';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const ERROR_CODES = new Set<string>([
  'unsupported',
  'disabled',
  'busy',
  'unsupported-tag',
  'tag-lost',
  'timeout',
  'credentials-timeout',
  'aborted',
  'invalid-credentials',
  'wrong-password',
  'tag-locked',
  'invalid-url',
  'tag-too-small',
  'write-failed',
  'verification-failed',
  'password-unusable',
  'tap-again',
  'unknown',
]);

/** A code of a newer app this page does not know yet reads as `unknown`. */
const errorCodeOf = (value: unknown): NfcErrorCode =>
  typeof value === 'string' && ERROR_CODES.has(value) ? (value as NfcErrorCode) : 'unknown';

interface SessionOptions {
  /** asked to answer `credentials-needed`; a rejection aborts the session as `network` */
  onCredentialsNeeded?: (detail: NfcCredentialsNeeded) => Promise<NfcCredentialsAnswer>;
  onCredentialsSent?: () => void;
  onProgress?: (step: NfcProgressStep) => void;
  /** aborting it cancels the session */
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Starts one session of the native app and settles with it: resolves with the detail of its
 * `done` event, rejects with a `NativeNfcError` on `error`, on `cancelled`, on the signal and
 * after `timeoutMs`. Events of other requests are ignored. While the tag lies on the phone,
 * `credentials-needed` of this request is answered through `onCredentialsNeeded`.
 */
const runSession = async <T>(
  bridge: NativeNfcBridge,
  start: (bridge: NativeNfcBridge) => string,
  done: string,
  options: SessionOptions = {},
): Promise<T> => {
  const { onCredentialsNeeded, onCredentialsSent, onProgress, signal, timeoutMs } = options;
  if (signal?.aborted === true) throw new NativeNfcError('cancelled');

  return await new Promise<T>((resolve, reject) => {
    let requestId: string | undefined;
    // an event the app sends before `start` returned its id waits here
    const early: { type: string; detail: Record<string, unknown> }[] = [];
    let abortReason: NfcAbortReason | undefined;
    let settled = false;
    const types = [done, 'error', 'cancelled', 'progress', 'credentials-needed'];
    const listeners = new Map<string, (event: Event) => void>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanUp = (): void => {
      settled = true;
      for (const [type, listener] of listeners) {
        globalThis.removeEventListener(EVENT_PREFIX + type, listener);
      }
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };

    const fail = (error: NativeNfcError): void => {
      if (settled) return;
      cleanUp();
      reject(error);
    };

    /** Ends the session from this side; its own `cancelled` event comes too late to wait for. */
    const cancel = (code: NfcFailureCode): void => {
      if (settled) return;
      fail(new NativeNfcError(code));
      bridge.cancel();
    };
    const onAbort = (): void => cancel('cancelled');

    const answerCredentials = async (detail: NfcCredentialsNeeded): Promise<void> => {
      if (onCredentialsNeeded === undefined) return;
      let answer: NfcCredentialsAnswer;
      try {
        answer = await onCredentialsNeeded(detail);
      } catch {
        answer = { abort: 'network' };
      }
      if (settled) return;
      if ('abort' in answer) {
        abortReason = answer.abort;
        bridge.abort(detail.requestId, answer.abort);
      } else {
        bridge.submitCredentials(detail.requestId, answer);
        onCredentialsSent?.();
      }
    };

    const handle = (type: string, detail: Record<string, unknown>): void => {
      if (settled) return;
      switch (type) {
        case done: {
          cleanUp();
          resolve(detail as T);
          break;
        }
        case 'error': {
          const code = errorCodeOf(detail['code']);
          const message = typeof detail['message'] === 'string' ? detail['message'] : undefined;
          fail(new NativeNfcError(code, message, code === 'aborted' ? abortReason : undefined));
          break;
        }
        case 'cancelled': {
          fail(new NativeNfcError('cancelled'));
          break;
        }
        case 'progress': {
          onProgress?.(detail['step'] as NfcProgressStep);
          break;
        }
        case 'credentials-needed': {
          void answerCredentials(detail as unknown as NfcCredentialsNeeded);
          break;
        }
      }
    };

    for (const type of types) {
      const listener = (event: Event): void => {
        const detail: unknown = (event as CustomEvent<unknown>).detail;
        if (!isRecord(detail)) return;
        if (requestId === undefined) early.push({ type, detail });
        else if (detail['requestId'] === requestId) handle(type, detail);
      };
      listeners.set(type, listener);
      globalThis.addEventListener(EVENT_PREFIX + type, listener);
    }
    signal?.addEventListener('abort', onAbort);
    if (timeoutMs !== undefined) timer = setTimeout(() => cancel('timeout'), timeoutMs);

    try {
      requestId = start(bridge);
    } catch {
      fail(new NativeNfcError('unknown'));
      return;
    }
    for (const event of early) {
      if (event.detail['requestId'] === requestId) handle(event.type, event.detail);
    }
  });
};

/**
 * Writes the URL and the password protection to the band on the phone. The password comes from
 * `onCredentialsNeeded`, which asks the server while the band lies on the phone.
 */
export const provisionBand = async (
  options: SessionOptions & { urlTemplate?: string },
): Promise<NfcProvisioned> => {
  const bridge = globalThis.AppWebViewNativeNfc;
  if (bridge === undefined) throw new NativeNfcError('unsupported');
  const { urlTemplate = WRISTBAND_URL_TEMPLATE, ...sessionOptions } = options;
  return await runSession<NfcProvisioned>(
    bridge,
    (nfc) => nfc.provision({ urlTemplate }),
    'provisioned',
    sessionOptions,
  );
};
