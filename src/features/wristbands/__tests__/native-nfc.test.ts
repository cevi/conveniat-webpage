/**
 * @jest-environment jsdom
 */

import type { NativeNfcBridge } from '@/features/wristbands/native-nfc';
import {
  identifyBand,
  isNativeNfcAvailable,
  NativeNfcError,
  provisionBand,
  WRISTBAND_URL_TEMPLATE,
} from '@/features/wristbands/native-nfc';

const UID = '04A1B2C3D4E5F6';
const SIGNATURE = 'AB'.repeat(32);

/** What the native app would send for a request. */
const emit = (type: string, detail: Record<string, unknown>): void => {
  globalThis.dispatchEvent(new CustomEvent(`app-webview-native-nfc-${type}`, { detail }));
};

const credentialsNeeded = (requestId: string): Record<string, unknown> => ({
  requestId,
  purpose: 'provision',
  uid: UID,
  signature: SIGNATURE,
  chip: { product: 'NTAG213', vendorByte: '04', genuineNxp: true },
  protection: { enabled: false, configLocked: false, staticLockBits: false },
  url: null,
});

/** Lets the answer to `credentials-needed`, a promise, reach the bridge. */
const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

let bridge: Record<keyof NativeNfcBridge, jest.Mock<string, unknown[]>>;

beforeEach(() => {
  let next = 0;
  // every method answers with the next request id, whatever it is given
  const id = (): string => `request-${++next}`;
  bridge = {
    getStatus: jest.fn(id),
    identify: jest.fn(id),
    provision: jest.fn(id),
    unprovision: jest.fn(id),
    submitCredentials: jest.fn(id),
    abort: jest.fn(id),
    cancel: jest.fn(id),
  };
  globalThis.AppWebViewNativeNfc = bridge;
});

afterEach(() => {
  globalThis.AppWebViewNativeNfc = undefined;
  jest.useRealTimers();
});

describe('the native NFC bridge', () => {
  it('is there only inside the native app', () => {
    expect(isNativeNfcAvailable()).toBe(true);
    globalThis.AppWebViewNativeNfc = undefined;
    expect(isNativeNfcAvailable()).toBe(false);
  });

  it('writes the band URL and resolves once the band is provisioned', async () => {
    const result = provisionBand({});
    expect(bridge.provision).toHaveBeenCalledWith({ urlTemplate: WRISTBAND_URL_TEMPLATE });

    emit('provisioned', { requestId: 'request-1', uid: UID, url: 'x', alreadyProvisioned: false });
    await expect(result).resolves.toMatchObject({ uid: UID, alreadyProvisioned: false });
  });

  it('rejects with the code of the error', async () => {
    const result = provisionBand({});
    emit('error', { requestId: 'request-1', code: 'tag-lost', message: 'transceive fail' });
    await expect(result).rejects.toMatchObject({ code: 'tag-lost', message: 'transceive fail' });
  });

  it('reads an unknown code of a newer app as unknown', async () => {
    const result = provisionBand({});
    emit('error', { requestId: 'request-1', code: 'something-new' });
    await expect(result).rejects.toMatchObject({ code: 'unknown' });
  });

  it('ignores the events of other requests', async () => {
    const onProgress = jest.fn();
    const result = provisionBand({ onProgress });
    emit('error', { requestId: 'request-9', code: 'busy' });
    emit('progress', { requestId: 'request-9', step: 'write' });
    emit('progress', { requestId: 'request-1', step: 'verify' });
    emit('provisioned', { requestId: 'request-1', uid: UID, url: 'x', alreadyProvisioned: true });

    await expect(result).resolves.toMatchObject({ alreadyProvisioned: true });
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith('verify');
  });

  it('submits the credentials the page fetched for its own request', async () => {
    const onCredentialsNeeded = jest.fn(() =>
      Promise.resolve({ password: 'A1B2C3D4', pack: 'E5F6' }),
    );
    const result = provisionBand({ onCredentialsNeeded });

    emit('credentials-needed', credentialsNeeded('request-9'));
    emit('credentials-needed', credentialsNeeded('request-1'));
    await flush();

    expect(onCredentialsNeeded).toHaveBeenCalledTimes(1);
    expect(onCredentialsNeeded).toHaveBeenCalledWith(
      expect.objectContaining({ uid: UID, signature: SIGNATURE }),
    );
    expect(bridge.submitCredentials).toHaveBeenCalledWith('request-1', {
      password: 'A1B2C3D4',
      pack: 'E5F6',
    });
    expect(bridge.abort).not.toHaveBeenCalled();

    emit('provisioned', { requestId: 'request-1', uid: UID, url: 'x', alreadyProvisioned: false });
    await expect(result).resolves.toMatchObject({ uid: UID });
  });

  it('aborts with the reason the server refused the band for, and rejects with it', async () => {
    const result = provisionBand({
      onCredentialsNeeded: () => Promise.resolve({ abort: 'not-genuine' as const }),
    });
    emit('credentials-needed', credentialsNeeded('request-1'));
    await flush();

    expect(bridge.abort).toHaveBeenCalledWith('request-1', 'not-genuine');
    expect(bridge.submitCredentials).not.toHaveBeenCalled();

    emit('error', { requestId: 'request-1', code: 'aborted', message: 'not-genuine' });
    await expect(result).rejects.toMatchObject({ code: 'aborted', reason: 'not-genuine' });
  });

  it('aborts as a network failure when the server cannot be asked', async () => {
    const result = provisionBand({
      onCredentialsNeeded: () => Promise.reject(new Error('Failed to fetch')),
    });
    emit('credentials-needed', credentialsNeeded('request-1'));
    await flush();

    expect(bridge.abort).toHaveBeenCalledWith('request-1', 'network');
    emit('error', { requestId: 'request-1', code: 'aborted' });
    await expect(result).rejects.toMatchObject({ code: 'aborted', reason: 'network' });
  });

  it('cancels the session when the page gives up on it', async () => {
    const controller = new AbortController();
    const result = provisionBand({ signal: controller.signal });
    controller.abort();

    await expect(result).rejects.toBeInstanceOf(NativeNfcError);
    await expect(result).rejects.toMatchObject({ code: 'cancelled' });
    expect(bridge.cancel).toHaveBeenCalledTimes(1);
  });

  it('starts the next session only once the app closed the one the page gave up on', async () => {
    const first = new AbortController();
    const cancelled = provisionBand({ signal: first.signal });
    first.abort();
    await expect(cancelled).rejects.toMatchObject({ code: 'cancelled' });

    // e.g. the sheet of the next person opens while the app still closes the last session
    const next = provisionBand({});
    await flush();
    expect(bridge.provision).toHaveBeenCalledTimes(1);

    emit('cancelled', { requestId: 'request-1' });
    await flush();
    expect(bridge.provision).toHaveBeenCalledTimes(2);
    emit('provisioned', { requestId: 'request-3', uid: UID });
    await expect(next).resolves.toMatchObject({ uid: UID });
  });

  it('starts the next session at once after a band was written', async () => {
    const written = provisionBand({});
    emit('provisioned', { requestId: 'request-1', uid: UID });
    await written;
    void provisionBand({});
    expect(bridge.provision).toHaveBeenCalledTimes(2);
  });

  it('does not wait for good for an app that never reports the end of a cancelled session', async () => {
    jest.useFakeTimers();
    const first = new AbortController();
    const cancelled = provisionBand({ signal: first.signal });
    first.abort();
    await expect(cancelled).rejects.toMatchObject({ code: 'cancelled' });

    void provisionBand({});
    await jest.advanceTimersByTimeAsync(4000);
    expect(bridge.provision).toHaveBeenCalledTimes(2);
  });

  it('cancels a session that waits for a band too long', async () => {
    jest.useFakeTimers();
    const result = provisionBand({ timeoutMs: 60_000 });
    jest.advanceTimersByTime(60_000);

    await expect(result).rejects.toMatchObject({ code: 'timeout' });
    expect(bridge.cancel).toHaveBeenCalledTimes(1);
  });

  it('rejects when the user cancels in the system sheet', async () => {
    const result = provisionBand({});
    emit('cancelled', { requestId: 'request-1' });
    await expect(result).rejects.toMatchObject({ code: 'cancelled' });
    expect(bridge.cancel).not.toHaveBeenCalled();
  });

  it('fails as unsupported outside the native app', async () => {
    globalThis.AppWebViewNativeNfc = undefined;
    await expect(provisionBand({})).rejects.toMatchObject({ code: 'unsupported' });
  });
});

describe('reading a band', () => {
  it('resolves with the UID and the signature, and writes nothing', async () => {
    const result = identifyBand({});
    emit('identified', { ...credentialsNeeded('request-1'), signatureValid: true });

    await expect(result).resolves.toMatchObject({ uid: UID, signature: SIGNATURE });
    expect(bridge.identify).toHaveBeenCalledTimes(1);
    expect(bridge.provision).not.toHaveBeenCalled();
    expect(bridge.submitCredentials).not.toHaveBeenCalled();
  });

  it('reads a chip without a signature as null', async () => {
    const result = identifyBand({});
    emit('identified', { ...credentialsNeeded('request-1'), signature: '' });
    await expect(result).resolves.toMatchObject({ uid: UID, signature: null });
  });

  it('rejects a lost tag, so the reader can tap again', async () => {
    const result = identifyBand({});
    emit('error', { requestId: 'request-1', code: 'tag-lost' });
    await expect(result).rejects.toMatchObject({ code: 'tag-lost' });
  });
});
