'use client';

import type { NfcFailureCode } from '@/features/wristbands/native-nfc';
import {
  identifyBand,
  NativeNfcError,
  NFC_SESSION_TIMEOUT_MS,
} from '@/features/wristbands/native-nfc';
import { useCallback, useEffect, useRef, useState } from 'react';

const SIGNATURE = /^[0-9A-Fa-f]{64}$/;

/**
 * The signature the native app read during the tap and appended to the band's link as
 * `#sig=…`, taken out of the address at once, so a shared or reloaded link carries none. The
 * router's state stays, only the fragment goes. Anything that is no signature counts as none.
 */
const takeSignatureFromFragment = (): string | undefined => {
  const { hash, pathname, search } = globalThis.location;
  const signature = new URLSearchParams(hash.slice(1)).get('sig');
  if (signature === null) return undefined;
  globalThis.history.replaceState(globalThis.history.state, '', pathname + search);
  return SIGNATURE.test(signature) ? signature.toUpperCase() : undefined;
};

/** Where checking the band on the page stands. */
export type BandCheckState =
  | { step: 'idle' }
  /** waiting for the band on the phone */
  | { step: 'waiting' }
  /** the band on the phone is another one than the page's */
  | { step: 'other-band'; uid: string }
  | { step: 'failed'; code: NfcFailureCode };

export interface BandCheck {
  /** whether the address was looked at for a signature; the card waits for it */
  ready: boolean;
  /**
   * NXP's signature of the page's band, from the tap or a scan here; null for a scan that read
   * none, undefined before the band was checked. The server decides whether it holds.
   */
  signature: string | null | undefined;
  state: BandCheckState;
  start: () => void;
  cancel: () => void;
}

/**
 * Proves the band of the page lies at hand: the signature the native app read during the tap,
 * or, without one, a scan on the page through the native app. iOS cannot read a signature
 * outside its own scan session, and a link from outside carries none. A scan of another band
 * says so instead of checking it. A session still open when the page goes away is cancelled.
 */
export const useCheckBand = (uid: string): BandCheck => {
  // undefined until the address was looked at; a signature read by a scan replaces the tap's
  const [checked, setChecked] = useState<{ signature: string | null | undefined } | undefined>();
  const [state, setState] = useState<BandCheckState>({ step: 'idle' });
  const sessionReference = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    // Not while rendering: a band tapped in the open app arrives by a soft navigation, whose
    // address the router writes only when it commits. Read once, and in Strict Mode's second
    // run the fragment is already gone, so a signature it found stays.
    const fromFragment = takeSignatureFromFragment();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of the address
    setChecked((current) => current ?? { signature: fromFragment });
  }, []);

  useEffect(() => (): void => sessionReference.current?.abort(), []);

  const start = useCallback((): void => {
    sessionReference.current?.abort();
    const session = new AbortController();
    sessionReference.current = session;
    setState({ step: 'waiting' });

    identifyBand({ signal: session.signal, timeoutMs: NFC_SESSION_TIMEOUT_MS })
      .then((band) => {
        if (sessionReference.current !== session) return;
        const readUid = band.uid.toUpperCase();
        if (readUid === uid) {
          setChecked({ signature: band.signature?.toUpperCase() ?? null });
          setState({ step: 'idle' });
        } else {
          setState({ step: 'other-band', uid: readUid });
        }
      })
      .catch((error: unknown) => {
        if (sessionReference.current !== session) return;
        const code = error instanceof NativeNfcError ? error.code : 'unknown';
        // a cancel is the user's own choice and needs no screen
        setState(code === 'cancelled' ? { step: 'idle' } : { step: 'failed', code });
      });
  }, [uid]);

  const cancel = useCallback((): void => {
    sessionReference.current?.abort();
    sessionReference.current = undefined;
    setState({ step: 'idle' });
  }, []);

  return { ready: checked !== undefined, signature: checked?.signature, state, start, cancel };
};
