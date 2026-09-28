import { syncAllOfflineData, syncEmergencyOffline } from '@/lib/chat-sync';
import type { trpc } from '@/trpc/client';
import { makeQueryClient } from '@/trpc/query-client';
import type { AppRouter } from '@/trpc/routers/_app';
import { onlineManager } from '@tanstack/react-query';
import type { OperationLink, TRPCLink } from '@trpc/client';
import { createTRPCClient } from '@trpc/client';
import { createTRPCQueryUtils } from '@trpc/react-query';
import { observable } from '@trpc/server/observable';

interface TrpcUtilsMock {
  invalidate: jest.Mock;
  chat: {
    user: { fetch: jest.Mock };
    contacts: { fetch: jest.Mock };
    checkCapability: { fetch: jest.Mock };
    chats: { fetch: jest.Mock };
    chatDetails: { fetch: jest.Mock };
    infiniteMessages: { prefetchInfinite: jest.Mock };
    getFeatureFlags: { fetch: jest.Mock };
  };
  emergency: {
    getAlertSettings: { fetch: jest.Mock };
    getEmergencyCards: { fetch: jest.Mock };
  };
  schedule: {
    getScheduleEntries: { fetch: jest.Mock };
    getById: { fetch: jest.Mock; setData: jest.Mock };
    getCourseStatus: { fetch: jest.Mock };
    getMyEnrollments: { fetch: jest.Mock };
    getHelperShifts: { fetch: jest.Mock };
    getCourseStatuses: { fetch: jest.Mock };
  };
  map: {
    getMapAnnotations: { fetch: jest.Mock };
    getAnnotations: { fetch: jest.Mock };
  };
  presence: {
    getPresence: { fetch: jest.Mock };
  };
  photoContest: {
    getContests: { fetch: jest.Mock };
  };
  shifts: {
    getMyShiftEnrollments: { fetch: jest.Mock };
    getMyOrganisedShifts: { fetch: jest.Mock };
    getShiftStatus: { fetch: jest.Mock };
  };
}

describe('Offline Sync Helpers', () => {
  let mockTrpcUtils: TrpcUtilsMock;
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = jest.fn().mockResolvedValue(new Response());
    globalThis.fetch = mockFetch;

    mockTrpcUtils = {
      invalidate: jest.fn(() => Promise.resolve()),
      chat: {
        user: { fetch: jest.fn().mockResolvedValue({}) },
        contacts: { fetch: jest.fn().mockResolvedValue([]) },
        checkCapability: { fetch: jest.fn().mockResolvedValue(true) },
        chats: { fetch: jest.fn().mockResolvedValue([{ id: 'chat-1' }]) },
        chatDetails: { fetch: jest.fn().mockResolvedValue({}) },
        infiniteMessages: { prefetchInfinite: jest.fn().mockResolvedValue({}) },
        getFeatureFlags: { fetch: jest.fn().mockResolvedValue({}) },
      },
      emergency: {
        getAlertSettings: { fetch: jest.fn().mockResolvedValue({}) },
        getEmergencyCards: {
          fetch: jest.fn().mockResolvedValue([
            {
              id: 'card-1',
              title: 'Erste Hilfe',
              documents: [{ id: 'doc-1', url: 'https://example.com/doc1.pdf' }],
              images: [{ id: 'img-1', url: 'https://example.com/img1.jpg' }],
            },
          ]),
        },
      },
      schedule: {
        getScheduleEntries: { fetch: jest.fn().mockResolvedValue([]) },
        getById: { fetch: jest.fn().mockResolvedValue({}), setData: jest.fn() },
        getCourseStatus: { fetch: jest.fn().mockResolvedValue({}) },
        getMyEnrollments: { fetch: jest.fn().mockResolvedValue([]) },
        getHelperShifts: { fetch: jest.fn().mockResolvedValue([]) },
        getCourseStatuses: { fetch: jest.fn().mockResolvedValue({}) },
      },
      map: {
        getMapAnnotations: { fetch: jest.fn().mockResolvedValue({}) },
        getAnnotations: { fetch: jest.fn().mockResolvedValue([]) },
      },
      presence: {
        getPresence: { fetch: jest.fn().mockResolvedValue({}) },
      },
      photoContest: {
        getContests: { fetch: jest.fn().mockResolvedValue([]) },
      },
      shifts: {
        getMyShiftEnrollments: { fetch: jest.fn().mockResolvedValue([]) },
        getMyOrganisedShifts: { fetch: jest.fn().mockResolvedValue([]) },
        getShiftStatus: { fetch: jest.fn().mockResolvedValue({}) },
      },
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('syncEmergencyOffline prefetches alert settings, emergency cards, and media assets', async () => {
    await syncEmergencyOffline(mockTrpcUtils as unknown as ReturnType<typeof trpc.useUtils>);

    expect(mockTrpcUtils.emergency.getAlertSettings.fetch).toHaveBeenCalled();
    expect(mockTrpcUtils.emergency.getEmergencyCards.fetch).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/doc1.pdf', {
      mode: 'cors',
    });
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/img1.jpg', {
      mode: 'cors',
    });
  });

  test('syncAllOfflineData calls syncChatsOffline, syncEmergencyOffline, schedule, map, presence, and photoContest prefetching', async () => {
    await syncAllOfflineData(mockTrpcUtils as unknown as ReturnType<typeof trpc.useUtils>);

    expect(mockTrpcUtils.chat.chats.fetch).toHaveBeenCalled();
    expect(mockTrpcUtils.emergency.getAlertSettings.fetch).toHaveBeenCalled();
    expect(mockTrpcUtils.schedule.getScheduleEntries.fetch).toHaveBeenCalled();
    expect(mockTrpcUtils.map.getMapAnnotations.fetch).toHaveBeenCalledWith({ locale: 'de' });
    expect(mockTrpcUtils.presence.getPresence.fetch).toHaveBeenCalled();
    expect(mockTrpcUtils.photoContest.getContests.fetch).toHaveBeenCalled();
  });
});

/**
 * Stands in for the server: every list is empty, and the map answers with whatever
 * `mapVersion` currently is, like an annotation an editor has changed since.
 */
const createUtils = (): {
  utils: ReturnType<typeof trpc.useUtils>;
  serverCalls: string[];
  setMapVersion: (version: string) => void;
} => {
  let mapVersion = 'v1';
  const serverCalls: string[] = [];
  const answer: OperationLink<AppRouter> = ({ op }) =>
    observable((observer) => {
      serverCalls.push(op.path);
      const data = op.path === 'map.getMapAnnotations' ? { mapVersion } : [];
      observer.next({ result: { type: 'data', data } });
      observer.complete();
    });
  const fakeServer: TRPCLink<AppRouter> = () => answer;

  const utils = createTRPCQueryUtils<AppRouter>({
    queryClient: makeQueryClient(),
    client: createTRPCClient<AppRouter>({ links: [fakeServer] }),
  });

  return {
    utils: utils as unknown as ReturnType<typeof trpc.useUtils>,
    serverCalls,
    setMapVersion: (version): void => {
      mapVersion = version;
    },
  };
};

const cachedMap = (utils: ReturnType<typeof trpc.useUtils>): unknown =>
  utils.map.getMapAnnotations.getData({ locale: 'de' });

describe('syncAllOfflineData against a real query cache', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  test('a second download picks up what changed on the server since the first', async () => {
    const { utils, setMapVersion } = createUtils();

    await syncAllOfflineData(utils);
    expect(cachedMap(utils)).toEqual({ mapVersion: 'v1' });

    setMapVersion('v2');
    await syncAllOfflineData(utils);

    expect(cachedMap(utils)).toEqual({ mapVersion: 'v2' });
  });

  test('offline, finishes at once and keeps what was downloaded before', async () => {
    const { utils, serverCalls, setMapVersion } = createUtils();
    await syncAllOfflineData(utils);
    const callsWhileOnline = serverCalls.length;

    setMapVersion('v2');
    onlineManager.setOnline(false);
    await syncAllOfflineData(utils);

    expect(serverCalls).toHaveLength(callsWhileOnline);
    expect(cachedMap(utils)).toEqual({ mapVersion: 'v1' });
  });
});
