import { syncAllOfflineData, syncEmergencyOffline } from '@/lib/chat-sync';
import type { trpc } from '@/trpc/client';

interface TrpcUtilsMock {
  chat: {
    user: { ensureData: jest.Mock };
    contacts: { ensureData: jest.Mock };
    checkCapability: { ensureData: jest.Mock };
    chats: { fetch: jest.Mock };
    chatDetails: { ensureData: jest.Mock };
    infiniteMessages: { prefetchInfinite: jest.Mock };
    getFeatureFlags: { ensureData: jest.Mock };
  };
  emergency: {
    getAlertSettings: { ensureData: jest.Mock };
    getEmergencyCards: { ensureData: jest.Mock };
  };
  schedule: {
    getScheduleEntries: { ensureData: jest.Mock };
    getById: { ensureData: jest.Mock; setData: jest.Mock };
    getCourseStatus: { ensureData: jest.Mock };
    getMyEnrollments: { ensureData: jest.Mock };
    getHelperShifts: { ensureData: jest.Mock };
    getCourseStatuses: { ensureData: jest.Mock };
  };
  map: {
    getMapAnnotations: { ensureData: jest.Mock };
    getAnnotations: { ensureData: jest.Mock };
  };
  presence: {
    getPresence: { ensureData: jest.Mock };
  };
  photoContest: {
    getContests: { ensureData: jest.Mock };
  };
  shifts: {
    getMyShiftEnrollments: { ensureData: jest.Mock };
    getMyOrganisedShifts: { ensureData: jest.Mock };
    getShiftStatus: { ensureData: jest.Mock };
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
      chat: {
        user: { ensureData: jest.fn().mockResolvedValue({}) },
        contacts: { ensureData: jest.fn().mockResolvedValue([]) },
        checkCapability: { ensureData: jest.fn().mockResolvedValue(true) },
        chats: { fetch: jest.fn().mockResolvedValue([{ id: 'chat-1' }]) },
        chatDetails: { ensureData: jest.fn().mockResolvedValue({}) },
        infiniteMessages: { prefetchInfinite: jest.fn().mockResolvedValue({}) },
        getFeatureFlags: { ensureData: jest.fn().mockResolvedValue({}) },
      },
      emergency: {
        getAlertSettings: { ensureData: jest.fn().mockResolvedValue({}) },
        getEmergencyCards: {
          ensureData: jest.fn().mockResolvedValue([
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
        getScheduleEntries: { ensureData: jest.fn().mockResolvedValue([]) },
        getById: { ensureData: jest.fn().mockResolvedValue({}), setData: jest.fn() },
        getCourseStatus: { ensureData: jest.fn().mockResolvedValue({}) },
        getMyEnrollments: { ensureData: jest.fn().mockResolvedValue([]) },
        getHelperShifts: { ensureData: jest.fn().mockResolvedValue([]) },
        getCourseStatuses: { ensureData: jest.fn().mockResolvedValue({}) },
      },
      map: {
        getMapAnnotations: { ensureData: jest.fn().mockResolvedValue({}) },
        getAnnotations: { ensureData: jest.fn().mockResolvedValue([]) },
      },
      presence: {
        getPresence: { ensureData: jest.fn().mockResolvedValue({}) },
      },
      photoContest: {
        getContests: { ensureData: jest.fn().mockResolvedValue([]) },
      },
      shifts: {
        getMyShiftEnrollments: { ensureData: jest.fn().mockResolvedValue([]) },
        getMyOrganisedShifts: { ensureData: jest.fn().mockResolvedValue([]) },
        getShiftStatus: { ensureData: jest.fn().mockResolvedValue({}) },
      },
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('syncEmergencyOffline prefetches alert settings, emergency cards, and media assets', async () => {
    await syncEmergencyOffline(mockTrpcUtils as unknown as ReturnType<typeof trpc.useUtils>);

    expect(mockTrpcUtils.emergency.getAlertSettings.ensureData).toHaveBeenCalled();
    expect(mockTrpcUtils.emergency.getEmergencyCards.ensureData).toHaveBeenCalled();
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
    expect(mockTrpcUtils.emergency.getAlertSettings.ensureData).toHaveBeenCalled();
    expect(mockTrpcUtils.schedule.getScheduleEntries.ensureData).toHaveBeenCalled();
    expect(mockTrpcUtils.map.getMapAnnotations.ensureData).toHaveBeenCalledWith({ locale: 'de' });
    expect(mockTrpcUtils.presence.getPresence.ensureData).toHaveBeenCalled();
    expect(mockTrpcUtils.photoContest.getContests.ensureData).toHaveBeenCalled();
  });
});
