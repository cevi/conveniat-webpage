/* eslint-disable @typescript-eslint/unbound-method */
import {
  notificationClickHandler,
  pushNotificationHandler,
  pushSubscriptionChangeHandler,
} from '@/features/service-worker/push-notifications';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';

describe('notificationClickHandler', () => {
  let mockServiceWorkerScope: Partial<ServiceWorkerGlobalScope>;
  let mockNotification: Partial<Notification>;
  let mockEvent: Partial<NotificationEvent>;
  let mockNotificationClose: jest.Mock;
  let mockWaitUntil: jest.Mock;
  let mockFetch: jest.Mock;

  /** Clicks a push that links to the short domain, from a worker on conveniat27.ch. */
  const clickShortLink = async (client?: WindowClient): Promise<void> => {
    mockServiceWorkerScope = {
      ...mockServiceWorkerScope,
      location: { origin: 'https://conveniat27.ch' } as Location,
    };
    mockEvent = {
      ...mockEvent,
      notification: {
        ...mockNotification,
        data: { url: 'https://con27.ch/agbs', notificationId: 'notif-123' },
      } as Notification,
    };
    (mockServiceWorkerScope.clients?.matchAll as jest.Mock).mockResolvedValue(
      client === undefined ? [] : [client],
    );

    const handler = notificationClickHandler(
      mockServiceWorkerScope as unknown as ServiceWorkerGlobalScope,
    );
    handler(mockEvent as NotificationEvent);

    const calls = mockWaitUntil.mock.calls as Promise<unknown>[][];
    await calls[0]?.[0];
  };

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
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: ServiceWorkerMessages.CAPTURE_POSTHOG_EVENT,
      payload: { event: 'push_notification_opened', properties: { channel: 'web' } },
    });
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

  describe('with a link to another origin', () => {
    it('navigates the open window to the full URL instead of routing its path in-page', async () => {
      const mockNavigate = jest.fn().mockResolvedValue(true);
      const mockPostMessage = jest.fn();
      await clickShortLink({
        visibilityState: 'visible',
        focus: jest.fn().mockResolvedValue(true),
        navigate: mockNavigate,
        postMessage: mockPostMessage,
      } as unknown as WindowClient);

      expect(mockNavigate).toHaveBeenCalledWith('https://con27.ch/agbs');
      expect(mockPostMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: ServiceWorkerMessages.PUSH_NAVIGATE }),
      );
      expect(mockServiceWorkerScope.clients?.openWindow).not.toHaveBeenCalled();
    });

    it('opens a new window when the open window cannot be navigated', async () => {
      await clickShortLink({
        visibilityState: 'visible',
        focus: jest.fn().mockResolvedValue(true),
        navigate: jest.fn().mockRejectedValue(new TypeError('not controlled')),
        postMessage: jest.fn(),
      } as unknown as WindowClient);

      expect(mockServiceWorkerScope.clients?.openWindow).toHaveBeenCalledWith(
        'https://con27.ch/agbs',
      );
    });

    it('opens a new window with the full URL when no window is open', async () => {
      await clickShortLink();

      expect(mockServiceWorkerScope.clients?.openWindow).toHaveBeenCalledWith(
        'https://con27.ch/agbs',
      );
    });
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

/** The body of the delivery report the worker posted, if any. */
const deliveryReport = (): unknown => {
  const calls = (globalThis.fetch as jest.Mock).mock.calls as [string, { body: string }][];
  const call = calls.find(([url]) => url.includes('pushTracking.markDelivered'));
  return call === undefined
    ? undefined
    : (JSON.parse(call[1].body) as Record<string, { json: unknown }>)['0']?.json;
};

describe('pushNotificationHandler', () => {
  const chatId = '550e8400-e29b-41d4-a716-446655440000';
  const chatUrl = `https://konekta.ch/app/chat/${chatId}`;

  let mockShowNotification: jest.Mock;
  let mockGetNotifications: jest.Mock;
  let mockCloseNotification: jest.Mock;
  let mockMatchAll: jest.Mock;
  let mockWaitUntil: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowNotification = jest.fn().mockResolvedValue(true);
    mockCloseNotification = jest.fn();
    mockGetNotifications = jest.fn().mockResolvedValue([{ close: mockCloseNotification }]);
    mockMatchAll = jest.fn();
    mockWaitUntil = jest.fn((promise: Promise<unknown>) => promise);
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    for (const port of transferredPorts) port.close();
    transferredPorts.length = 0;
  });

  const chromeUserAgent =
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
  /** An installed web app on an iPhone, where WebKit's silent push rule applies. */
  const iosWebAppUserAgent =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

  const makeScope = (
    clients: WindowClient[],
    userAgent: string = chromeUserAgent,
  ): ServiceWorkerGlobalScope =>
    ({
      location: { origin: 'https://konekta.ch' },
      navigator: { userAgent },
      clients: { matchAll: mockMatchAll.mockResolvedValue(clients) },
      registration: {
        showNotification: mockShowNotification,
        getNotifications: mockGetNotifications,
      },
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

  it('shows and closes a suppressed notification at once on WebKit, which revokes on silent pushes', async () => {
    const client = makeClient('https://konekta.ch/app/chat', chatUrl);
    await dispatchPush(makeScope([client], iosWebAppUserAgent));

    expect(mockShowNotification).toHaveBeenCalledTimes(1);
    expect(mockShowNotification).toHaveBeenCalledWith(
      'Chat',
      expect.objectContaining({ tag: 'conveniat27-suppressed', silent: true }),
    );
    expect(mockGetNotifications).toHaveBeenCalledWith({ tag: 'conveniat27-suppressed' });
    expect(mockCloseNotification).toHaveBeenCalled();
    // It reached the device, so it is reported, but as suppressed: nobody saw it.
    expect(deliveryReport()).toEqual({ id: 'notif-1', presentation: 'SUPPRESSED' });
  });

  it('shows a notification the user should see on WebKit as usual', async () => {
    const client = makeClient(chatUrl, 'https://konekta.ch/app/chat');
    await dispatchPush(makeScope([client], iosWebAppUserAgent));

    expect(mockShowNotification).toHaveBeenCalledWith(
      'Chat',
      expect.objectContaining({ tag: 'conveniat27' }),
    );
    expect(mockCloseNotification).not.toHaveBeenCalled();
  });

  it('suppresses the notification for a locale-prefixed variant of the target chat URL', async () => {
    const client = makeClient(
      'https://konekta.ch/app/chat',
      `https://konekta.ch/de/app/chat/${chatId}`,
    );
    await dispatchPush(makeScope([client]));

    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  it('suppresses the notification when the chat is open in the admin management view', async () => {
    const client = makeClient(
      'https://konekta.ch/admin/globals/alert-management',
      `https://konekta.ch/admin/globals/alert-management?selectedChatId=${chatId}`,
    );
    await dispatchPush(makeScope([client]));

    expect(mockShowNotification).not.toHaveBeenCalled();
    expect(client.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'notification' }),
    );
  });

  it('shows the notification when the admin management view has a different chat selected', async () => {
    const client = makeClient(
      'https://konekta.ch/admin/globals/alert-management',
      'https://konekta.ch/admin/globals/alert-management?selectedChatId=00000000-0000-0000-0000-000000000000',
    );
    await dispatchPush(makeScope([client]));

    expect(mockShowNotification).toHaveBeenCalledTimes(1);
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

  it('reports a shown notification as delivered', async () => {
    const client = makeClient(chatUrl, 'https://konekta.ch/app/chat');
    await dispatchPush(makeScope([client]));

    expect(deliveryReport()).toEqual({ id: 'notif-1', presentation: 'SHOWN' });
  });

  /**
   * The push reached the device even though the user never saw it in the shade. Without
   * the report, a push to someone reading the chat looks exactly like one that was lost.
   */
  it('reports a suppressed notification as delivered and suppressed', async () => {
    const client = makeClient('https://konekta.ch/app/chat', chatUrl);
    await dispatchPush(makeScope([client]));

    expect(mockShowNotification).not.toHaveBeenCalled();
    expect(deliveryReport()).toEqual({ id: 'notif-1', presentation: 'SUPPRESSED' });
  });
});

const subscriptionOf = (name: string): PushSubscription =>
  ({
    options: { userVisibleOnly: true, applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
    toJSON: (): PushSubscriptionJSON => ({
      endpoint: `https://updates.push.services.mozilla.com/wpush/v2/${name}`,
      keys: { p256dh: `${name}-p256dh`, auth: `${name}-auth` },
    }),
  }) as unknown as PushSubscription;

describe('pushSubscriptionChangeHandler', () => {
  let mockSubscribe: jest.Mock;
  let mockFetch: jest.Mock;
  let mockWaitUntil: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe = jest.fn().mockResolvedValue(subscriptionOf('resubscribed'));
    mockFetch = jest.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;
    mockWaitUntil = jest.fn((promise: Promise<unknown>) => promise);
  });

  const dispatchChange = async (change: {
    oldSubscription?: PushSubscription | null;
    newSubscription?: PushSubscription | null;
  }): Promise<void> => {
    const scope = {
      registration: { pushManager: { subscribe: mockSubscribe } },
    } as unknown as ServiceWorkerGlobalScope;
    pushSubscriptionChangeHandler(scope)({
      ...change,
      waitUntil: mockWaitUntil,
    } as unknown as Event);
    const calls = mockWaitUntil.mock.calls as Promise<unknown>[][];
    await calls[0]?.[0];
  };

  const reportedBody = (): unknown => {
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    return JSON.parse(init.body as string) as unknown;
  };

  it('subscribes again with the old options when the browser only dropped the subscription', async () => {
    const oldSubscription = subscriptionOf('old');

    // eslint-disable-next-line unicorn/no-null -- what Firefox sends when it only dropped the subscription
    await dispatchChange({ oldSubscription, newSubscription: null });

    expect(mockSubscribe).toHaveBeenCalledWith(oldSubscription.options);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/trpc/pushTracking.renewWebPushSubscription?batch=1',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(reportedBody()).toEqual({
      0: {
        json: {
          oldSubscription: subscriptionOf('old').toJSON(),
          newSubscription: subscriptionOf('resubscribed').toJSON(),
        },
      },
    });
  });

  it('reports the new subscription the browser already created', async () => {
    await dispatchChange({
      oldSubscription: subscriptionOf('old'),
      newSubscription: subscriptionOf('new'),
    });

    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(reportedBody()).toEqual({
      0: {
        json: {
          oldSubscription: subscriptionOf('old').toJSON(),
          newSubscription: subscriptionOf('new').toJSON(),
        },
      },
    });
  });

  it('reports nothing when the browser does not say which subscription changed', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // eslint-disable-next-line unicorn/no-null -- what the browser sends when it does not know
    await dispatchChange({ oldSubscription: null, newSubscription: subscriptionOf('new') });

    expect(mockWaitUntil).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
