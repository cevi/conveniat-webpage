'use client';

import type {
  NfcAbortReason,
  NfcCredentialsAnswer,
  NfcFailureCode,
} from '@/features/wristbands/native-nfc';
import {
  NativeNfcError,
  NFC_SESSION_TIMEOUT_MS,
  provisionBand,
} from '@/features/wristbands/native-nfc';
import { trpc } from '@/trpc/client';
import { isTransportError } from '@/utils/user-error-message';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Where programming one band stands. */
export type ProgramState =
  | { step: 'idle' }
  /** waiting for the band on the phone */
  | { step: 'waiting' }
  /** the band lies on the phone, the server is asked for its password */
  | { step: 'checking' }
  | { step: 'writing' }
  | { step: 'failed'; code: NfcFailureCode; reason: NfcAbortReason | undefined };

/**
 * Programs one band for a Hof: opens the native session, asks the server for the band's
 * password while it lies on the phone, and reports the programmed band to `onProgrammed` once
 * the Hof's list knows it. A session still open when the page goes away is cancelled.
 *
 * The password goes through the plain tRPC client, not a mutation hook, so it never enters the
 * query client, whose caches the app persists to IndexedDB, and lives no longer than the call.
 */
export const useProgramWristband = (
  hofId: string | undefined,
  onProgrammed: (uid: string) => void,
): {
  state: ProgramState;
  start: () => void;
  cancel: () => void;
  reset: () => void;
} => {
  const utils = trpc.useUtils();
  const [state, setState] = useState<ProgramState>({ step: 'idle' });
  const sessionReference = useRef<AbortController | undefined>(undefined);

  useEffect(() => (): void => sessionReference.current?.abort(), []);

  const start = useCallback((): void => {
    if (hofId === undefined) return;
    sessionReference.current?.abort();
    const session = new AbortController();
    sessionReference.current = session;
    setState({ step: 'waiting' });

    const askForCredentials = async ({
      uid,
      signature,
    }: {
      uid: string;
      signature: string | null;
    }): Promise<NfcCredentialsAnswer> => {
      setState({ step: 'checking' });
      try {
        const result = await utils.client.wristband.programWristband.mutate({
          hofId,
          uid,
          signature,
        });
        return result.ok
          ? { password: result.password, pack: result.pack }
          : { abort: result.reason };
      } catch (error) {
        // the session turns a rejection into `network`; anything the server refused is `other`
        if (isTransportError(error)) throw error;
        return { abort: 'other' };
      }
    };

    provisionBand({
      signal: session.signal,
      timeoutMs: NFC_SESSION_TIMEOUT_MS,
      onCredentialsNeeded: askForCredentials,
      onCredentialsSent: () => setState({ step: 'writing' }),
      onProgress: (step) => {
        if (step === 'write' || step === 'read-back' || step === 'verify') {
          setState({ step: 'writing' });
        }
      },
    })
      .then(async ({ uid }) => {
        await utils.wristband.getHofWristbandList.invalidate({ hofId });
        if (session.signal.aborted) return;
        setState({ step: 'idle' });
        onProgrammed(uid);
      })
      .catch((error: unknown) => {
        if (sessionReference.current !== session) return;
        const failure =
          error instanceof NativeNfcError ? error : new NativeNfcError('unknown', String(error));
        // a cancel is the AVP's own choice and needs no screen
        if (failure.code === 'cancelled') setState({ step: 'idle' });
        else setState({ step: 'failed', code: failure.code, reason: failure.reason });
      });
  }, [hofId, onProgrammed, utils]);

  const cancel = useCallback((): void => {
    sessionReference.current?.abort();
    setState({ step: 'idle' });
  }, []);

  const reset = useCallback((): void => setState({ step: 'idle' }), []);

  return { state, start, cancel, reset };
};
