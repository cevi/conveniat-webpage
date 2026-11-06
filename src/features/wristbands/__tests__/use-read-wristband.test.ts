/**
 * @jest-environment jsdom
 */

import {
  SERVER_ANSWER_TIMEOUT_MS,
  useReadWristband,
} from '@/features/wristbands/hooks/use-read-wristband';
import type { RosterOnPhone } from '@/features/wristbands/hooks/use-wristband-roster';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import { act, renderHook } from '@testing-library/react';

const mockIdentify = jest.fn();
let testTrpc: TestTrpc;

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);
jest.mock('@/features/wristbands/native-nfc', () => {
  const actual = jest.requireActual<Record<string, unknown>>('@/features/wristbands/native-nfc');
  return {
    ...actual,
    identifyBand: (): Promise<unknown> => Promise.resolve({ uid: LEA, signature: null }),
  };
});
// opening the sealed list has tests of its own, see offline-lookup.test.ts
const mockIdentifyFromRoster = jest.fn();
jest.mock('@/features/wristbands/offline-lookup', () => ({
  identifyFromRoster: (...arguments_: unknown[]): unknown => mockIdentifyFromRoster(...arguments_),
}));

const LEA = '04A1B2C3D4E5F6';

const roster: RosterOnPhone = {
  data: { entries: [{ index: 'lea', box: 'sealed' }], revokedUids: [] },
  updatedAt: 1_700_000_000_000,
  fetching: false,
};

/**
 * A server that never answers, like wifi without a working uplink. The client gives the call up
 * when the read aborts it.
 */
const hangingServer = (): Promise<never> => new Promise<never>(() => {});

/** Starts a read and lets the band session and the request get under way. */
const startRead = async (
  onPhone: RosterOnPhone,
): Promise<{ current: ReturnType<typeof useReadWristband> }> => {
  testTrpc = createTestTrpc({ 'wristband.identifyWristband': mockIdentify });
  const { result } = renderHook(() => useReadWristband(onPhone), { wrapper: testTrpc.wrapper });
  await act(async () => {
    result.current.start();
    await Promise.resolve();
  });
  return result;
};

const leaOnList = {
  state: 'assigned',
  uid: LEA,
  fullName: 'Lea Meier',
  nickname: 'Fuchs',
  hof: 'Cevi Uster',
  quartier: null,
  verified: false,
};

beforeEach(() => {
  jest.useFakeTimers();
  mockIdentify.mockReset();
  mockIdentifyFromRoster.mockReset();
  mockIdentifyFromRoster.mockResolvedValue(leaOnList);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('reading a band while the server does not answer', () => {
  it('answers from the list on the phone after a few seconds, and says so', async () => {
    mockIdentify.mockImplementation(hangingServer);
    const result = await startRead(roster);
    expect(result.current.state).toEqual({ step: 'checking' });
    expect(mockIdentify).toHaveBeenCalledWith({ uid: LEA, signature: null });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(SERVER_ANSWER_TIMEOUT_MS);
    });
    expect(result.current.state).toMatchObject({
      step: 'read',
      result: {
        identity: { state: 'assigned', fullName: 'Lea Meier', verified: false },
        fromRoster: { updatedAt: roster.updatedAt },
      },
    });
  });

  it('says the band cannot be read offline when the list cannot open it without a signature', async () => {
    mockIdentify.mockImplementation(hangingServer);
    // resolves to nothing: the list names nobody without the signature
    mockIdentifyFromRoster.mockImplementation(async () => {});
    const result = await startRead(roster);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(SERVER_ANSWER_TIMEOUT_MS);
    });
    expect(result.current.state).toEqual({ step: 'failed', code: 'no-signature' });
  });

  it('keeps waiting for the server without a list on the phone', async () => {
    mockIdentify.mockImplementation(hangingServer);
    const result = await startRead({ data: undefined, updatedAt: 0, fetching: false });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(SERVER_ANSWER_TIMEOUT_MS * 3);
    });
    expect(result.current.state).toEqual({ step: 'checking' });
  });

  it("takes the server's answer when it comes in time", async () => {
    mockIdentify.mockResolvedValue({ state: 'unknown', uid: LEA });
    const result = await startRead(roster);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(result.current.state).toEqual({
      step: 'read',
      result: { identity: { state: 'unknown', uid: LEA }, fromRoster: null, signature: null },
    });
  });
});
