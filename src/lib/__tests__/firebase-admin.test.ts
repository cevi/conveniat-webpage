// The module under test is server-only; the guard throws outside a Server Component.
jest.mock('server-only', () => ({}));

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FIREBASE_SERVICE_ACCOUNT_KEY_PATH: '/tmp/service-account.json' },
}));

jest.mock('node:fs', () => ({
  readFileSync: (): string => JSON.stringify({ project_id: 'test' }),
}));

const mockSend = jest.fn().mockResolvedValue('projects/test/messages/1');

jest.mock('firebase-admin', () => ({
  apps: [{}],
  credential: { cert: jest.fn() },
  initializeApp: jest.fn(),
  messaging: (): { send: jest.Mock } => ({ send: mockSend }),
}));

import { sendFcmNotification } from '@/lib/firebase-admin';

interface SentMessage {
  android?: {
    notification?: { channelId?: string; sound?: string; priority?: string };
    priority?: string;
  };
  apns?: { payload?: { aps?: { sound?: string } } };
}

const lastSentMessage = (): SentMessage => {
  const calls = mockSend.mock.calls as unknown[][];
  return calls.at(-1)?.[0] as SentMessage;
};

describe('sendFcmNotification', () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  /**
   * The native app's manifest names a default channel (`konekta-push`) that nothing
   * creates, so a message without a channel id lands on FCM's fallback channel at
   * default importance and Android shows no heads-up banner. Addressing the channel
   * the shell really creates is the whole point of this field.
   */
  it('addresses the Android channel the native app actually creates', async () => {
    await sendFcmNotification('token-1', { title: 'Alarm', body: 'Einsatz', data: {} });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(lastSentMessage().android?.notification?.channelId).toBe('konekta-default');
  });

  it('keeps the high priority and legacy sound fields alongside the channel', async () => {
    await sendFcmNotification('token-1', { title: 'Alarm', body: 'Einsatz', data: {} });

    const message = lastSentMessage();
    // Below API 26 there is no channel, so sound and display priority carry the banner.
    expect(message.android?.notification?.sound).toBe('default');
    expect(message.android?.notification?.priority).toBe('high');
    // Delivery priority is a different field at a different nesting level.
    expect(message.android?.priority).toBe('high');
    // iOS has no channels; its sound must keep coming from the APNs payload.
    expect(message.apns?.payload?.aps?.sound).toBe('default');
  });

  it('reports success when the send resolves', async () => {
    const result = await sendFcmNotification('token-1', {
      title: 'Alarm',
      body: 'Einsatz',
      data: {},
    });

    expect(result.success).toBe(true);
  });
});
