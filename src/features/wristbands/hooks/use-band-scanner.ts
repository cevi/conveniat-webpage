'use client';
import { usePageVisible } from '@/features/wristbands/hooks/use-page-visible';
import type { NfcCredentialsAnswer } from '@/features/wristbands/native-nfc';
import {
  NativeNfcError,
  NFC_SESSION_TIMEOUT_MS,
  provisionBand,
} from '@/features/wristbands/native-nfc';
import type { ScanFailureKind } from '@/features/wristbands/scan-failure';
import { scanFailureKind } from '@/features/wristbands/scan-failure';
import { failureNotice, nfcFailureText } from '@/features/wristbands/texts';
import type { Locale } from '@/types/types';
import { isTransportError } from '@/utils/user-error-message';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useTRPCClient } from '@/trpc/client';

/** Where the scanner stands. */
export type ScanPhase =
  /** not scanning: nothing to scan for, or the page is not on the screen */
  | 'off'
  /** waiting for a band on the phone */
  | 'waiting'
  /** a band lies on the phone, the server is asked for its password */
  | 'checking'
  | 'writing'
  /** written; the page records it and hands it out */
  | 'saving'
  /** stopped by itself, until "Weiter scannen" */
  | 'paused';

/** What the scanner says about the last band, in the page's language. */
export interface ScanNotice {
  kind: Exclude<ScanFailureKind, 'quiet'>;
  title: string;
  description: string;
}

export interface BandScannerHandlers {
  /** A band lies on the phone. A notice refuses it before the server is asked, null lets it on. */
  onBandDetected: (uid: string) => ScanNotice | null;
  /** The band is written and recorded for the Hof; a notice says why it went no further. */
  onRecorded: (uid: string) => Promise<ScanNotice | null>;
  /** A band that lay on the phone, if the phone read it, could not be used. */
  onFailed?: (uid: string | undefined, kind: ScanNotice['kind']) => void;
}

/** A moment between a failed band and the next session, so a band left on the phone does not spin. */
const RESTART_AFTER_FAILURE_MS = 700;

/** Failures in a row before the scanner stops by itself, e.g. a refused band left on the phone. */
const MAX_FAILURES_IN_A_ROW = 12;

const vibrate = (): void => {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(80);
};

/**
 * The continuous scanner: one native session after the other, each one band, while `active`
 * and the page is on the screen. A band held to the phone is checked with the server, written,
 * recorded for the Hof and passed to `onRecorded`; then the next session starts by itself, which
 * the native app makes seamless by keeping Android's reader mode for 30 s after a session. A
 * band that slipped asks to be held again, a refused one says why; both keep the scanner going.
 * After a minute without a band, the scanner stops to save the battery and waits for `resume`.
 * Unmounting, `active` turning false or the app going to the background cancels the session;
 * a band already written is still recorded then, and a failure to do so is shown once the page
 * is back.
 *
 * The password goes through the plain tRPC client, not a mutation hook, so it never enters the
 * query client, whose caches the app persists to IndexedDB, and lives no longer than the call.
 */
export const useBandScanner = ({
  hofId,
  active,
  locale,
  handlers,
}: {
  hofId: string;
  active: boolean;
  locale: Locale;
  handlers: BandScannerHandlers;
}): {
  phase: ScanPhase;
  notice: ScanNotice | undefined;
  resume: () => void;
} => {
  const trpcClient = useTRPCClient();
  const visible = usePageVisible();
  const [phase, setPhase] = useState<Exclude<ScanPhase, 'off' | 'paused'>>('waiting');
  const [paused, setPaused] = useState(false);
  const [notice, setNotice] = useState<ScanNotice | undefined>();
  // every finished session bumps it, which starts the next one
  const [run, setRun] = useState(0);
  const failuresInARow = useRef(0);
  const handlersReference = useRef(handlers);
  const localeReference = useRef(locale);
  useEffect(() => {
    handlersReference.current = handlers;
    localeReference.current = locale;
  });

  const armed = active && visible && !paused;

  useEffect(() => {
    if (!armed) return;
    const session = new AbortController();
    let restartTimer: ReturnType<typeof setTimeout> | undefined;
    let band: { uid: string; signature: string | null } | undefined;
    let refusedHere: ScanNotice | null = null;
    // read through a function: the session may end while a call is on its way
    const stopped = (): boolean => session.signal.aborted;

    const next = (delay: number): void => {
      restartTimer = setTimeout(() => setRun((count) => count + 1), delay);
    };
    const fail = (problem: ScanNotice): void => {
      handlersReference.current.onFailed?.(band?.uid, problem.kind);
      // the session ended while the band was saved: the notice waits for the page to be seen
      // again, and the next session starts once it is
      if (stopped()) {
        setNotice(problem);
        return;
      }
      setPhase('waiting');
      failuresInARow.current += 1;
      if (problem.kind === 'stop' || failuresInARow.current >= MAX_FAILURES_IN_A_ROW) {
        setPaused(true);
        setNotice({ ...problem, kind: 'stop' });
        return;
      }
      setNotice(problem);
      next(RESTART_AFTER_FAILURE_MS);
    };
    const noticeOf = (failure: NativeNfcError, kind: ScanNotice['kind']): ScanNotice => ({
      kind,
      ...failureNotice(nfcFailureText(failure.code, failure.reason), localeReference.current),
    });

    const askForCredentials = async (detail: {
      uid: string;
      signature: string | null;
    }): Promise<NfcCredentialsAnswer> => {
      band = { uid: detail.uid, signature: detail.signature };
      setPhase('checking');
      setNotice(undefined);
      refusedHere = handlersReference.current.onBandDetected(detail.uid);
      if (refusedHere !== null) return { abort: 'other' };
      try {
        const result = await trpcClient.wristband.programWristband.mutate({ hofId, ...band });
        return result.ok
          ? { password: result.password, pack: result.pack }
          : { abort: result.reason };
      } catch (error) {
        // the session turns a rejection into `network`; anything the server refused is `other`
        if (isTransportError(error)) throw error;
        return { abort: 'other' };
      }
    };

    const record = async (uid: string): Promise<ScanNotice | null> => {
      try {
        const registered = await trpcClient.wristband.registerWristband.mutate({
          hofId,
          uid,
          signature: band?.signature ?? null,
        });
        if (!registered.ok) {
          return noticeOf(new NativeNfcError('aborted', undefined, registered.reason), 'refused');
        }
      } catch (error) {
        const reason = isTransportError(error) ? 'network' : 'other';
        return noticeOf(new NativeNfcError('aborted', undefined, reason), 'refused');
      }
      return await handlersReference.current.onRecorded(uid);
    };

    provisionBand({
      signal: session.signal,
      timeoutMs: NFC_SESSION_TIMEOUT_MS,
      onCredentialsNeeded: askForCredentials,
      onCredentialsSent: () => setPhase('writing'),
      onProgress: (step) => {
        if (step === 'write' || step === 'read-back' || step === 'verify') setPhase('writing');
      },
    })
      .then(async ({ uid }) => {
        // recorded even when the page stopped meanwhile: the band on the phone is written
        setPhase('saving');
        const problem = await record(uid);
        if (problem !== null) {
          fail(problem);
          return;
        }
        vibrate();
        if (stopped()) return;
        failuresInARow.current = 0;
        setNotice(undefined);
        setPhase('waiting');
        next(0);
      })
      .catch((error: unknown) => {
        if (stopped()) return;
        const failure =
          error instanceof NativeNfcError ? error : new NativeNfcError('unknown', String(error));
        // cancelled on the phone, by iOS's sheet: the AVP stopped it, so it stays stopped
        if (failure.code === 'cancelled') {
          setPhase('waiting');
          setPaused(true);
          return;
        }
        const kind = scanFailureKind(failure.code);
        fail(refusedHere ?? noticeOf(failure, kind === 'quiet' ? 'again' : kind));
      });

    return (): void => {
      session.abort();
      if (restartTimer !== undefined) clearTimeout(restartTimer);
      // a band still being checked, written or saved is no longer this scanner's to show
      setPhase('waiting');
    };
  }, [armed, run, hofId, trpcClient]);

  const resume = useCallback((): void => {
    failuresInARow.current = 0;
    setNotice(undefined);
    setPaused(false);
  }, []);

  let shownPhase: ScanPhase = phase;
  if (paused) shownPhase = 'paused';
  else if (!active) shownPhase = 'off';
  return { phase: shownPhase, notice, resume };
};
