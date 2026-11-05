/**
 * @jest-environment jsdom
 */

import type { BandScannerHandlers } from '@/features/wristbands/hooks/use-band-scanner';
import { useBandScanner } from '@/features/wristbands/hooks/use-band-scanner';
import { act, renderHook } from '@testing-library/react';

let mockVisible = true;
const mockRegister = jest.fn();
const mockProvision = jest.fn();

jest.mock('@/features/wristbands/hooks/use-page-visible', () => ({
  usePageVisible: (): boolean => mockVisible,
}));
jest.mock('@/trpc/client', () => {
  const utils = {
    client: {
      wristband: {
        programWristband: {
          mutate: (): Promise<unknown> => Promise.resolve({ ok: true, password: 'p', pack: 'k' }),
        },
        registerWristband: {
          mutate: (...arguments_: unknown[]): unknown => mockRegister(...arguments_),
        },
      },
    },
  };
  return { trpc: { useUtils: (): unknown => utils } };
});
jest.mock('@/features/wristbands/native-nfc', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@/features/wristbands/native-nfc');
  return {
    ...actual,
    provisionBand: (...arguments_: unknown[]): unknown => mockProvision(...arguments_),
  };
});

const BAND = '04A1B2C3D4E5F6';

const handlers: BandScannerHandlers = {
  onBandDetected: () => null,
  onRecorded: () => Promise.resolve(null),
  onFailed: jest.fn(),
};

const renderScanner = (): ReturnType<
  typeof renderHook<ReturnType<typeof useBandScanner>, unknown>
> => renderHook(() => useBandScanner({ hofId: 'uster', active: true, locale: 'de', handlers }));

beforeEach(() => {
  mockVisible = true;
  mockRegister.mockReset();
  mockProvision.mockReset();
});

describe('the band scanner when the app goes to the background', () => {
  it('shows a band that failed to save once the page is back, and scans again', async () => {
    const written = Promise.withResolvers<{ uid: string }>();
    const saved = Promise.withResolvers<{ ok: false; reason: 'revoked' }>();
    // the first session writes the band; every later one waits for the next band
    mockProvision
      .mockImplementationOnce(
        async ({
          onCredentialsNeeded,
        }: {
          onCredentialsNeeded: (band: { uid: string; signature: null }) => Promise<unknown>;
        }) => {
          await onCredentialsNeeded({ uid: BAND, signature: null });
          return await written.promise;
        },
      )
      .mockReturnValue(new Promise(() => {}));
    mockRegister.mockReturnValue(saved.promise);

    const { result, rerender } = renderScanner();
    await act(async () => {
      written.resolve({ uid: BAND });
      await written.promise;
    });
    expect(result.current.phase).toBe('saving');

    mockVisible = false;
    rerender();
    await act(async () => {
      saved.resolve({ ok: false, reason: 'revoked' });
      await saved.promise;
    });

    mockVisible = true;
    rerender();
    expect(result.current.phase).toBe('waiting');
    expect(result.current.notice).toMatchObject({ kind: 'refused' });
    expect(handlers.onFailed).toHaveBeenCalledWith(BAND, 'refused');
  });

  it('does not stay on a band that was still being written', () => {
    mockProvision.mockImplementation(({ onCredentialsSent }: { onCredentialsSent: () => void }) => {
      onCredentialsSent();
      return new Promise(() => {});
    });
    const { result, rerender } = renderScanner();
    expect(result.current.phase).toBe('writing');

    mockVisible = false;
    rerender();
    expect(result.current.phase).toBe('waiting');
  });
});
