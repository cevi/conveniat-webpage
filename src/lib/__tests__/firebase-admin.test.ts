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
import {
  fitPushText,
  PUSH_BODY_MAX_BYTES,
  PUSH_TITLE_MAX_BYTES,
} from '@/utils/push-notifications/fit-push-text';

interface SentMessage {
  data?: Record<string, string>;
  android?: {
    notification?: { channelId?: string; sound?: string; priority?: string };
    priority?: string;
    data?: Record<string, string>;
  };
  apns?: {
    payload?: {
      aps?: { sound?: string; 'interruption-level'?: string };
      notificationType?: string;
      data?: Record<string, string>;
    };
  };
}

const lastSentMessage = (): SentMessage => {
  const calls = mockSend.mock.calls as unknown[][];
  return calls.at(-1)?.[0] as SentMessage;
};

/** Size of `value` on the wire, which is what FCM and APNs hold against their limit. */
const jsonBytes = (value: unknown): number =>
  new TextEncoder().encode(JSON.stringify(value)).length;

const sendEmergency = (): Promise<unknown> =>
  sendFcmNotification('token-1', {
    title: 'Notfall',
    body: 'Einsatz',
    data: { notificationType: 'emergency' },
  });

describe('sendFcmNotification', () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  /**
   * `conveniat27-push` is what the shell creates at startup. This constant used to
   * name `konekta-push`, copied from cevi/konekta-app without updating for this app's
   * real channel id (#1583) - leaving every push to be placed by FCM's fallback chain
   * rather than by this field.
   */
  it('addresses the Android channel the native app actually creates', async () => {
    await sendFcmNotification('token-1', { title: 'Alarm', body: 'Einsatz', data: {} });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(lastSentMessage().android?.notification?.channelId).toBe('conveniat27-push');
  });

  it('leaves a regular push undeclared, so the shell renders it on the chat channel', async () => {
    await sendFcmNotification('token-1', { title: 'Alarm', body: 'Einsatz', data: {} });

    const message = lastSentMessage();
    expect(message.data?.['notificationType']).toBeUndefined();
    expect(message.android?.data?.['notificationType']).toBeUndefined();
    expect(message.apns?.payload?.aps?.['interruption-level']).toBeUndefined();
  });

  describe('emergency notifications', () => {
    it('routes the backgrounded Android push to the siren channel', async () => {
      await sendEmergency();

      const message = lastSentMessage();
      expect(message.android?.notification?.channelId).toBe('conveniat27-emergency');
      // Below API 26 there is no channel to carry the siren, so name the raw resource.
      expect(message.android?.notification?.sound).toBe('emergency_siren');
    });

    it('names the bundled siren and a time-sensitive level for backgrounded iOS', async () => {
      await sendEmergency();

      const aps = lastSentMessage().apns?.payload?.aps;
      expect(aps?.sound).toBe('emergency_siren.caf');
      expect(aps?.['interruption-level']).toBe('time-sensitive');
    });

    /**
     * Firebase hands a foreground message to the shell instead of rendering it, so the
     * channel named above is never consulted; the shell picks the channel from this data
     * field instead. Two of these placements are the ones it actually reads - `android.data`
     * (which *replaces* the top-level `data` on Android rather than merging with it) and
     * `apns.payload` top level (which merges into the iOS `userInfo`). The remaining two
     * mirror the field alongside its siblings in the same blocks, so the whole payload
     * stays uniform; asserted here to keep a future edit from splitting them apart.
     */
    it('carries the type in every data payload alongside its siblings', async () => {
      await sendEmergency();

      const message = lastSentMessage();
      expect(message.data?.['notificationType']).toBe('emergency');
      expect(message.android?.data?.['notificationType']).toBe('emergency');
      expect(message.apns?.payload?.notificationType).toBe('emergency');
      expect(message.apns?.payload?.data?.['notificationType']).toBe('emergency');
    });
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

  /**
   * FCM and APNs reject anything above 4096 bytes. What APNs receives is `apns.payload` with
   * the FCM data keys merged into its root, and FCM adds keys of its own (`gcm.message_id`,
   * `google.c.*`) on top, which is what the reserve is for.
   */
  it('stays under the 4096 byte limit with a title and body at their caps', async () => {
    const worstCaseText = '"Grüezi" 😀\n'.repeat(500);
    await sendFcmNotification('token-1', {
      title: fitPushText(worstCaseText, PUSH_TITLE_MAX_BYTES),
      body: fitPushText(worstCaseText, PUSH_BODY_MAX_BYTES),
      data: {
        url: '/app/chat/0b6e1c52-9a57-4bbf-9f8e-2d1c4a7e3f10',
        chatId: '0b6e1c52-9a57-4bbf-9f8e-2d1c4a7e3f10',
        messageId: '5f2d8a41-7c3e-4b9a-8e16-9d0f2c7b4a63',
        notificationId: 'cmg4x9k2p0001qz8h3v7w5t1e',
        ignoreIfAppOpen: 'false',
        ignoreIfUrlMatches: 'true',
        notificationType: 'emergency',
      },
    });

    const message = lastSentMessage();
    const fcmReserve = 300;
    const apnsPayload = { ...message.apns?.payload, ...message.data };
    const androidMessage = {
      notification: message.android?.notification,
      data: { ...message.data, ...message.android?.data },
    };
    expect(jsonBytes(apnsPayload) + fcmReserve).toBeLessThanOrEqual(4096);
    expect(jsonBytes(androidMessage) + fcmReserve).toBeLessThanOrEqual(4096);
  });
});
