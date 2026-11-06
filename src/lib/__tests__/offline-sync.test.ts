import { syncAllOfflineData, syncEmergencyOffline } from '@/lib/chat-sync';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import { onlineManager } from '@tanstack/react-query';

/**
 * Stands in for the server: answers every procedure the offline download asks for, and the map
 * with whatever `mapVersion` currently is, like an annotation an editor has changed since.
 */
/** every query client of this file, cleared after each test so no garbage collection timer keeps Jest alive */
const servers: TestTrpc[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.queryClient.clear();
});

const createServer = (): {
  server: TestTrpc;
  handlers: Record<string, jest.Mock>;
  setMapVersion: (version: string) => void;
} => {
  let mapVersion = 'v1';
  const handlers: Record<string, jest.Mock> = {
    'chat.user': jest.fn().mockResolvedValue({}),
    'chat.contacts': jest.fn().mockResolvedValue([]),
    'chat.checkCapability': jest.fn().mockResolvedValue(true),
    'chat.chats': jest.fn().mockResolvedValue([{ id: 'chat-1' }]),
    'chat.chatDetails': jest.fn().mockResolvedValue({}),
    'chat.infiniteMessages': jest.fn().mockResolvedValue({ items: [], nextCursor: undefined }),
    'chat.getFeatureFlags': jest.fn().mockResolvedValue({}),
    'emergency.getAlertSettings': jest.fn().mockResolvedValue({}),
    'emergency.getEmergencyCards': jest.fn().mockResolvedValue([
      {
        id: 'card-1',
        title: 'Erste Hilfe',
        documents: [{ id: 'doc-1', url: 'https://example.com/doc1.pdf' }],
        images: [{ id: 'img-1', url: 'https://example.com/img1.jpg' }],
      },
    ]),
    'schedule.getScheduleEntries': jest.fn().mockResolvedValue([]),
    'schedule.getMyEnrollments': jest.fn().mockResolvedValue([]),
    'schedule.getMyQuartiere': jest.fn().mockResolvedValue([]),
    'schedule.getLeaderAccess': jest.fn().mockResolvedValue(false),
    'schedule.reminders.getReminders': jest.fn().mockResolvedValue([]),
    'schedule.reminders.getReminderSettings': jest.fn().mockResolvedValue({}),
    'schedule.getHelperShifts': jest.fn().mockResolvedValue([]),
    'shifts.getMyShiftEnrollments': jest.fn().mockResolvedValue([]),
    'shifts.getMyOrganisedShifts': jest.fn().mockResolvedValue([]),
    'map.getMapAnnotations': jest.fn(() => Promise.resolve({ mapVersion })),
    'map.getAnnotations': jest.fn().mockResolvedValue([]),
    'presence.getPresence': jest.fn().mockResolvedValue({}),
    'photoContest.getContests': jest.fn().mockResolvedValue([]),
  };

  const server = createTestTrpc(handlers);
  servers.push(server);
  return {
    server,
    handlers,
    setMapVersion: (version): void => {
      mapVersion = version;
    },
  };
};

describe('Offline Sync Helpers', () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = jest.fn().mockResolvedValue(new Response());
    globalThis.fetch = mockFetch;
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('syncEmergencyOffline prefetches alert settings, emergency cards, and media assets', async () => {
    const { server, handlers } = createServer();

    await syncEmergencyOffline(server);

    expect(handlers['emergency.getAlertSettings']).toHaveBeenCalled();
    expect(handlers['emergency.getEmergencyCards']).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/doc1.pdf', {
      mode: 'cors',
    });
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/img1.jpg', {
      mode: 'cors',
    });
  });

  test('syncAllOfflineData calls syncChatsOffline, syncEmergencyOffline, schedule, map, presence, and photoContest prefetching', async () => {
    const { server, handlers } = createServer();

    await syncAllOfflineData(server);

    expect(handlers['chat.chats']).toHaveBeenCalled();
    expect(handlers['emergency.getAlertSettings']).toHaveBeenCalled();
    expect(handlers['schedule.getScheduleEntries']).toHaveBeenCalled();
    expect(handlers['map.getMapAnnotations']).toHaveBeenCalledWith({ locale: 'de' });
    expect(handlers['presence.getPresence']).toHaveBeenCalled();
    expect(handlers['photoContest.getContests']).toHaveBeenCalled();
  });

  test('downloads what the Programm and a block need offline: own Quartier, leader access, reminders', async () => {
    const { server, handlers } = createServer();

    await syncAllOfflineData(server);

    expect(handlers['schedule.getMyQuartiere']).toHaveBeenCalled();
    expect(handlers['schedule.getLeaderAccess']).toHaveBeenCalled();
    expect(handlers['schedule.reminders.getReminders']).toHaveBeenCalled();
    expect(handlers['schedule.reminders.getReminderSettings']).toHaveBeenCalled();
  });
});

const cachedMap = ({ trpc, queryClient }: TestTrpc): unknown =>
  queryClient.getQueryData(trpc.map.getMapAnnotations.queryKey({ locale: 'de' }));

describe('syncAllOfflineData against a real query cache', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    onlineManager.setOnline(true);
    jest.restoreAllMocks();
  });

  test('a second download picks up what changed on the server since the first', async () => {
    const { server, setMapVersion } = createServer();

    await syncAllOfflineData(server);
    expect(cachedMap(server)).toEqual({ mapVersion: 'v1' });

    setMapVersion('v2');
    await syncAllOfflineData(server);

    expect(cachedMap(server)).toEqual({ mapVersion: 'v2' });
  });

  test('offline, finishes at once and keeps what was downloaded before', async () => {
    const { server, setMapVersion } = createServer();
    await syncAllOfflineData(server);
    const callsWhileOnline = server.calls.length;

    setMapVersion('v2');
    onlineManager.setOnline(false);
    await syncAllOfflineData(server);

    expect(server.calls).toHaveLength(callsWhileOnline);
    expect(cachedMap(server)).toEqual({ mapVersion: 'v1' });
  });
});
