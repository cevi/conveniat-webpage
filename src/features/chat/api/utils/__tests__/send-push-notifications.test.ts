const mockFind = jest.fn();
const mockCount = jest.fn();

jest.mock('@payload-config', () => ({}), { virtual: true });

jest.mock('payload', () => ({
  getPayload: (): { find: jest.Mock; count: jest.Mock } => ({ find: mockFind, count: mockCount }),
}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://example.test' },
}));

const mockSendToSubscription = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/utils/push-notification-api', () => ({
  sendNotificationToSubscription: (...args: unknown[]): unknown => mockSendToSubscription(...args),
}));

import { sendNotification } from '@/features/chat/api/utils/send-push-notifications';

interface FindArguments {
  limit?: number;
  pagination?: boolean;
}

describe('sendNotification recipient lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The collection is non-empty; the early return on an empty collection is a
    // separate short-circuit that would hide the lookup under test.
    mockCount.mockResolvedValue({ totalDocs: 3 });
  });

  /**
   * Payload applies an explicit `limit` even when `pagination` is false
   * (`sanitizedLimit = limit ?? (usePagination ? 10 : 0)`), so a hardcoded limit here
   * silently drops every recipient past it — no error, no log. A few hundred people
   * with two devices each is enough to reach the old cap of 1000.
   */
  it('does not cap the recipient lookup', async () => {
    mockFind.mockResolvedValue({ docs: [] });

    await sendNotification('hi', ['user-1'], 'chat-1');

    const findArguments = (mockFind.mock.calls as unknown[][])[0]?.[0] as FindArguments;
    expect(findArguments.pagination).toBe(false);
    expect(findArguments.limit).toBeUndefined();
  });

  it('sends to every returned subscription', async () => {
    mockFind.mockResolvedValue({
      docs: [
        { id: 's1', user: 'user-1' },
        { id: 's2', user: 'user-2' },
        { id: 's3', user: 'user-2' },
      ],
    });

    await sendNotification('hi', ['user-1', 'user-2'], 'chat-1');

    expect(mockSendToSubscription).toHaveBeenCalledTimes(3);
  });

  it('reports success without querying when nobody is subscribed', async () => {
    mockFind.mockResolvedValue({ docs: [] });

    const result = await sendNotification('hi', ['user-1'], 'chat-1');

    expect(result.success).toBe(true);
    expect(mockSendToSubscription).not.toHaveBeenCalled();
  });
});
