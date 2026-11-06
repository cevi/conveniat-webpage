'use client';

import type { RosterOnPhone } from '@/features/wristbands/hooks/use-wristband-roster';
import {
  identifyBand,
  NativeNfcError,
  NFC_SESSION_TIMEOUT_MS,
} from '@/features/wristbands/native-nfc';
import { identifyFromRoster } from '@/features/wristbands/offline-lookup';
import type { ReadFailureCode } from '@/features/wristbands/reader-texts';
import type { WristbandIdentity } from '@/features/wristbands/types';
import { trpc } from '@/trpc/client';
import { isTransportError } from '@/utils/user-error-message';
import { onlineManager } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Whose the band is, and whether the server said so or the list on the phone. */
export interface ReadResult {
  identity: WristbandIdentity;
  /** when the list on the phone answered: how old it is */
  fromRoster: { updatedAt: number } | null;
  /** NXP's signature as read, which lets the band's card start a chat, see `BandContacts` */
  signature: string | null;
}

/**
 * How long the server has to answer before the list on the phone does. Wifi that is up but has
 * no working uplink leaves a request open for minutes, with a child waiting in front of the
 * reader.
 */
export const SERVER_ANSWER_TIMEOUT_MS = 4000;

/** Where reading one band stands. */
export type ReadState =
  | { step: 'idle' }
  /** waiting for the band on the phone */
  | { step: 'waiting' }
  /** the band was read, the server is asked whose it is */
  | { step: 'checking' }
  | { step: 'read'; result: ReadResult }
  | { step: 'failed'; code: ReadFailureCode };

/**
 * Reads one band for security and first aid: the native session for its UID and NXP's
 * signature, then the server, which checks the signature and logs the read. Without a
 * connection, when the request does not get through, or when the server has not answered
 * within `SERVER_ANSWER_TIMEOUT_MS`, the list on the phone answers, checked against the same
 * signature, and says so. Without a list the read waits for the server. A session still open
 * when the page goes away is cancelled.
 *
 * The read goes through the plain tRPC client: a mutation hook holds its call while the app is
 * offline, which is exactly when the list has to answer at once.
 */
export const useReadWristband = (
  roster: RosterOnPhone,
): { state: ReadState; start: () => void; cancel: () => void } => {
  const utils = trpc.useUtils();
  const [state, setState] = useState<ReadState>({ step: 'idle' });
  const sessionReference = useRef<AbortController | undefined>(undefined);

  useEffect(() => (): void => sessionReference.current?.abort(), []);

  const start = useCallback((): void => {
    sessionReference.current?.abort();
    const session = new AbortController();
    sessionReference.current = session;
    setState({ step: 'waiting' });

    const fromRoster = async (band: {
      uid: string;
      signature: string | null;
    }): Promise<ReadState> => {
      if (roster.data === undefined) return { step: 'failed', code: 'no-roster' };
      const identity = await identifyFromRoster(roster.data, band);
      // the list names nobody without the band's signature
      if (identity === undefined) return { step: 'failed', code: 'no-signature' };
      return {
        step: 'read',
        result: {
          identity,
          fromRoster: { updatedAt: roster.updatedAt },
          signature: band.signature,
        },
      };
    };

    const identify = async (): Promise<ReadState> => {
      const { uid, signature } = await identifyBand({
        signal: session.signal,
        timeoutMs: NFC_SESSION_TIMEOUT_MS,
      });
      if (!onlineManager.isOnline()) return await fromRoster({ uid, signature });
      setState({ step: 'checking' });
      const request = new AbortController();
      const abortRequest = (): void => request.abort();
      session.signal.addEventListener('abort', abortRequest);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const askServer = async (): Promise<ReadState> => {
        try {
          const identity = await utils.client.wristband.identifyWristband.mutate(
            { uid, signature },
            { signal: request.signal },
          );
          return { step: 'read', result: { identity, fromRoster: null, signature } };
        } catch (error) {
          if (isTransportError(error)) return await fromRoster({ uid, signature });
          throw error;
        }
      };
      const listAnswersInstead = new Promise<ReadState>((resolve) => {
        if (roster.data === undefined) return;
        timer = setTimeout(() => {
          // the list answers before the request is aborted, or its abort would settle the race
          void fromRoster({ uid, signature }).then((answer) => {
            request.abort();
            resolve(answer);
          });
        }, SERVER_ANSWER_TIMEOUT_MS);
      });
      try {
        return await Promise.race([askServer(), listAnswersInstead]);
      } finally {
        clearTimeout(timer);
        session.signal.removeEventListener('abort', abortRequest);
      }
    };

    identify()
      .then((next) => {
        if (sessionReference.current === session) setState(next);
      })
      .catch((error: unknown) => {
        if (sessionReference.current !== session) return;
        const code = error instanceof NativeNfcError ? error.code : 'unknown';
        // a cancel is the reader's own choice and needs no screen
        setState(code === 'cancelled' ? { step: 'idle' } : { step: 'failed', code });
      });
  }, [roster.data, roster.updatedAt, utils]);

  const cancel = useCallback((): void => {
    sessionReference.current?.abort();
    sessionReference.current = undefined;
    setState({ step: 'idle' });
  }, []);

  return { state, start, cancel };
};
