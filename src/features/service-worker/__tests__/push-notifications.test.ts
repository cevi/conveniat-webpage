/* eslint-disable @typescript-eslint/unbound-method */
import {
  notificationClickHandler,
  pushNotificationHandler,
} from '@/features/service-worker/push-notifications';
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
        openWindow: jest.fn().mockResolvedValue(true),
      } as unknown as Clients,
    };
  });

  it('focuses visible client and uses navigate when supported', async () => {
    const mockFocus = jest.fn().mockResolvedValue(true);
    const mockNavigate = jest.fn().mockResolvedValue(true);
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
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: ServiceWorkerMessages.PUSH_NAVIGATE,
      payload: {
        url: 'https://konekta.ch/app/chat/550e8400-e29b-41d4-a716-446655440000?app-mode=true',
      },
    });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/trpc/pushTracking.markInteracted?batch=1',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('falls back to postMessage when client navigate throws', async () => {
    const mockFocus = jest.fn().mockResolvedValue(true);
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
    const expectedUrl = expect.stringContaining(
      '/app/chat/550e8400-e29b-41d4-a716-446655440000',
    ) as unknown as string;
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: ServiceWorkerMessages.PUSH_NAVIGATE,
      payload: {
        url: expectedUrl,
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

/** Ports handed to mock clients, closed after each test so jest can exit cleanly. */
const transferredPorts: MessagePort[] = [];

/**
 * A visible window client whose page answers the GET_CLIENT_URL round-trip
 * with `liveUrl`. When `liveUrl` is undefined the page never answers and the
 * service worker must fall back to the (stale) creation URL.
 */
const makeClient = (creationUrl: string, liveUrl?: string): WindowClient =>
  ({
    visibilityState: 'visible',
    url: creationUrl,
    postMessage: jest.fn((message: unknown, transfer?: readonly MessagePort[]) => {
      const port = transfer?.[0];
      if (port) transferredPorts.push(port);
      const messageType = (message as { type?: string }).type;
      if (messageType === ServiceWorkerMessages.GET_CLIENT_URL && liveUrl !== undefined) {
        port?.postMessage({ url: liveUrl });
      }
    }),
  }) as unknown as WindowClient;

describe('pushNotificationHandler', () => {
  const chatId = '550e8400-e29b-41d4-a716-446655440000';
  const chatUrl = `https://konekta.ch/app/chat/${chatId}`;

  let mockShowNotification: jest.Mock;
  let mockMatchAll: jest.Mock;
  let mockWaitUntil: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowNotification = jest.fn().mockResolvedValue(true);
    mockMatchAll = jest.fn();
    mockWaitUntil = jest.fn((promise: Promise<unknown>) => promise);
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    for (const port of transferredPorts) port.close();
    transferredPorts.length = 0;
  });

  const makeScope = (clients: WindowClient[]): ServiceWorkerGlobalScope =>
    ({
      location: { origin: 'https://konekta.ch' },
      clients: { matchAll: mockMatchAll.mockResolvedValue(clients) },
      registration: { showNotification: mockShowNotification },
    }) as unknown as ServiceWorkerGlobalScope;

  const dispatchPush = async (scope: ServiceWorkerGlobalScope): Promise<void> => {
    const pushEvent = {
      data: {
        json: (): unknown => ({
          title: 'Chat',
          body: 'New message',
          data: { url: chatUrl, notificationId: 'notif-1', ignoreIfUrlMatches: 'true' },
        }),
      },
      waitUntil: mockWaitUntil,
    } as unknown as PushEvent;

    pushNotificationHandler(scope)(pushEvent);
    const calls = mockWaitUntil.mock.calls as Promise<unknown>[][];
    await calls[0]?.[0];
  };

  it('shows the notification when the user is on the chat overview, even if the client creation URL is the target chat', async () => {
    // Reproduces the stale WindowClient.url case: the document was loaded on the
    // chat thread, but the user has since SPA-navigated to the overview.
    const client = makeClient(chatUrl, 'https://konekta.ch/app/chat');
    await dispatchPush(makeScope([client]));

    expect(mockShowNotification).toHaveBeenCalledTimes(1);
    // The open page is still informed so it can refresh the chat list.
    expect(client.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'notification' }),
    );
  });

  it('suppresses the notification when the user has the target chat open', async () => {
    const client = makeClient('https://konekta.ch/app/chat', chatUrl);
    await dispatchPush(makeScope([client]));

    expect(mockShowNotification).not.toHaveBeenCalled();
    expect(client.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'notification' }),
    );
  });

  it('suppresses the notification for a locale-prefixed variant of the target chat URL', async () => {
    const client = makeClient(
      'https://konekta.ch/app/chat',
      `https://konekta.ch/de/app/chat/${chatId}`,
    );
    await dispatchPush(makeScope([client]));

    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('falls back to the creation URL when the page does not answer the URL round-trip', async () => {
    const client = makeClient(chatUrl);
    await dispatchPush(makeScope([client]));

    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('shows the notification without querying clients when the app is not focused', async () => {
    const client = makeClient(chatUrl, chatUrl);
    (client as unknown as { visibilityState: string }).visibilityState = 'hidden';
    await dispatchPush(makeScope([client]));

    expect(mockShowNotification).toHaveBeenCalledTimes(1);
  });
});
