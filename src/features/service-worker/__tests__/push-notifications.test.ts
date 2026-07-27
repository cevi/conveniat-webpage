/* eslint-disable @typescript-eslint/unbound-method */
import { notificationClickHandler } from '@/features/service-worker/push-notifications';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';

describe('notificationClickHandler', () => {
  let mockServiceWorkerScope: Partial<ServiceWorkerGlobalScope>;
  let mockNotification: Partial<Notification>;
  let mockEvent: Partial<NotificationEvent>;
  let mockNotificationClose: jest.Mock;
  let mockWaitUntil: jest.Mock;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationClose = jest.fn();
    mockWaitUntil = jest.fn((promise: Promise<unknown>) => promise);
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    mockNotification = {
      close: mockNotificationClose,
      data: {
        url: '/app/chat/550e8400-e29b-41d4-a716-446655440000',
        notificationId: 'notif-123',
      },
    };

    mockEvent = {
      notification: mockNotification as Notification,
      waitUntil: mockWaitUntil,
    };

    mockServiceWorkerScope = {
      location: { origin: 'https://konekta.ch' } as Location,
      clients: {
        matchAll: jest.fn(),
        openWindow: jest.fn().mockResolvedValue(undefined),
      } as unknown as Clients,
    };
  });

  it('focuses visible client and uses navigate when supported', async () => {
    const mockFocus = jest.fn().mockResolvedValue(undefined);
    const mockNavigate = jest.fn().mockResolvedValue(undefined);
    const mockPostMessage = jest.fn();

    const mockClient = {
      visibilityState: 'visible',
      focus: mockFocus,
      navigate: mockNavigate,
      postMessage: mockPostMessage,
    } as unknown as WindowClient;

    (mockServiceWorkerScope.clients?.matchAll as jest.Mock).mockResolvedValue([mockClient]);

    const handler = notificationClickHandler(
      mockServiceWorkerScope as unknown as ServiceWorkerGlobalScope,
    );
    handler(mockEvent as NotificationEvent);

    expect(mockNotificationClose).toHaveBeenCalledTimes(1);

    const calls = mockWaitUntil.mock.calls as Promise<unknown>[][];
    const waitUntilPromise = calls[0]?.[0];
    await waitUntilPromise;

    expect(mockFocus).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/app/chat/550e8400-e29b-41d4-a716-446655440000'),
    );
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/trpc/pushTracking.markInteracted?batch=1',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('falls back to postMessage when client navigate throws', async () => {
    const mockFocus = jest.fn().mockResolvedValue(undefined);
    const mockNavigate = jest.fn().mockRejectedValue(new Error('Navigation blocked'));
    const mockPostMessage = jest.fn();

    const mockClient = {
      visibilityState: 'visible',
      focus: mockFocus,
      navigate: mockNavigate,
      postMessage: mockPostMessage,
    } as unknown as WindowClient;

    (mockServiceWorkerScope.clients?.matchAll as jest.Mock).mockResolvedValue([mockClient]);

    const handler = notificationClickHandler(
      mockServiceWorkerScope as unknown as ServiceWorkerGlobalScope,
    );
    handler(mockEvent as NotificationEvent);

    const calls = mockWaitUntil.mock.calls as Promise<unknown>[][];
    const waitUntilPromise = calls[0]?.[0];
    await waitUntilPromise;

    expect(mockFocus).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: ServiceWorkerMessages.PUSH_NAVIGATE,
      payload: {
        url: expect.stringContaining('/app/chat/550e8400-e29b-41d4-a716-446655440000'),
      },
    });
  });

  it('opens a new window when no existing window client is found', async () => {
    (mockServiceWorkerScope.clients?.matchAll as jest.Mock).mockResolvedValue([]);

    const handler = notificationClickHandler(
      mockServiceWorkerScope as unknown as ServiceWorkerGlobalScope,
    );
    handler(mockEvent as NotificationEvent);

    const calls = mockWaitUntil.mock.calls as Promise<unknown>[][];
    const waitUntilPromise = calls[0]?.[0];
    await waitUntilPromise;

    const openWindowSpy = mockServiceWorkerScope.clients?.openWindow;
    expect(openWindowSpy).toHaveBeenCalledWith(
      expect.stringContaining('/app/chat/550e8400-e29b-41d4-a716-446655440000'),
    );
  });
});
