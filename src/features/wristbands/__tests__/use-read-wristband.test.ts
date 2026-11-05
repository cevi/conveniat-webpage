/**
 * @jest-environment jsdom
 */

import {
  SERVER_ANSWER_TIMEOUT_MS,
  useReadWristband,
} from '@/features/wristbands/hooks/use-read-wristband';
import type { RosterOnPhone } from '@/features/wristbands/hooks/use-wristband-roster';
import { act, renderHook } from '@testing-library/react';

const mockIdentify = jest.fn();

jest.mock('@/trpc/client', () => {
  const utils = {
    client: {
      wristband: {
        identifyWristband: {
          mutate: (...arguments_: unknown[]): unknown => mockIdentify(...arguments_),
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
    identifyBand: (): Promise<unknown> => Promise.resolve({ uid: LEA, signature: null }),
  };
});
jest.mock('@tanstack/react-query', () => ({ onlineManager: { isOnline: (): boolean => true } }));

const LEA = '04A1B2C3D4E5F6';

const roster: RosterOnPhone = {
  data: {
    bands: [
      { uid: LEA, fullName: 'Lea Meier', nickname: 'Fuchs', hof: 'Cevi Uster', quartier: null },
    ],
    revokedUids: [],
  },
  updatedAt: 1_700_000_000_000,
  fetching: false,
};

/** A server that never answers, like wifi without a working uplink, until the call is aborted. */
const hangingServer = (_input: unknown, options: { signal: AbortSignal }): Promise<never> =>
  new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });

/** Starts a read and lets the band session and the request get under way. */
const startRead = async (
  onPhone: RosterOnPhone,
): Promise<{ current: ReturnType<typeof useReadWristband> }> => {
  const { result } = renderHook(() => useReadWristband(onPhone));
  await act(async () => {
    result.current.start();
    await Promise.resolve();
  });
  return result;
};

beforeEach(() => {
  jest.useFakeTimers();
  mockIdentify.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('reading a band while the server does not answer', () => {
  it('answers from the list on the phone after a few seconds, and says so', async () => {
    mockIdentify.mockImplementation(hangingServer);
    const result = await startRead(roster);
    expect(result.current.state).toEqual({ step: 'checking' });

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
