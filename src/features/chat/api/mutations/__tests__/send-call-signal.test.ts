import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({}));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
// Only the wire transformer; a direct caller never serializes anything.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));
const mockRedis = new Map<string, string>();
jest.mock('@/lib/db/redis', () => ({
  getFeatureFlag: (): Promise<boolean> => Promise.resolve(true),
  redis: {
    // every rate limit counter at its first call
    eval: (): Promise<number> => Promise.resolve(1),
    set: (key: string, value: string): Promise<string> => {
      mockRedis.set(key, value);
      return Promise.resolve('OK');
    },
    get: (key: string): Promise<string | null> => Promise.resolve(mockRedis.get(key) ?? null),
    getdel: (key: string): Promise<string | null> => {
      const value = mockRedis.get(key) ?? null;
      mockRedis.delete(key);
      return Promise.resolve(value);
    },
    del: (key: string): Promise<number> => Promise.resolve(Number(mockRedis.delete(key))),
  },
}));
type Publish = (
  channel: string,
  event: { type: string; call?: { kind: string; fromUser: string } },
) => Promise<void>;
const mockPublish = jest.fn<ReturnType<Publish>, Parameters<Publish>>(() => Promise.resolve());
jest.mock('@/lib/db/chat-pubsub', () => ({
  chatPubSub: {
    publish: (...args: unknown[]): unknown =>
      mockPublish(...(args as Parameters<typeof mockPublish>)),
  },
}));
const mockSendNotification = jest.fn((): Promise<void> => Promise.resolve());
jest.mock('@/lib/push/send-notification', () => ({
  sendNotification: (...args: unknown[]): unknown => mockSendNotification(...(args as [])),
}));

import { sendCallSignal } from '@/features/chat/api/mutations/send-call-signal';
import { ChatCapability, ChatType } from '@/lib/prisma';

const CHAT_ID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const CALL_ID = '0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d';
const DEVICE = '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e';
const ANNA = 'user-anna';
const BEN = 'user-ben';

let chat: { type: ChatType; archivedAt: Date | null; capabilities: ChatCapability[] };

/** The system messages written into the chat, by their German text. */
let writtenMessages: string[];

const mockPrisma = {
  chat: {
    findUnique: (): Promise<unknown> =>
      Promise.resolve({ ...chat, chatMemberships: [{ userId: ANNA }, { userId: BEN }] }),
    update: (): Promise<unknown> => Promise.resolve({}),
  },
  message: {
    create: (arguments_: {
      data: { contentVersions: { create: { payload: { de: string } }[] } };
    }): Promise<unknown> => {
      writtenMessages.push(arguments_.data.contentVersions.create[0]?.payload.de ?? '');
      return Promise.resolve({ uuid: 'message-1', createdAt: new Date() });
    },
  },
  user: { findUnique: (): Promise<unknown> => Promise.resolve({ reminderLocale: 'fr' }) },
};

const createCaller = createCallerFactory(createTRPCRouter({ sendCallSignal }));

const as = (uuid: string, name: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name, email: `${uuid}@example.test` },
    prisma: mockPrisma,
    locale: 'de',
  } as unknown as Context);
const asAnna = (): ReturnType<typeof createCaller> => as(ANNA, 'Anna v/o Fuchs');
const asBen = (): ReturnType<typeof createCaller> => as(BEN, 'Ben v/o Dachs');

type Kind = 'invite' | 'accept' | 'decline' | 'hangup';
const signal = (
  kind: Kind,
): { chatId: string; callId: string; kind: Kind; fromDevice: string } => ({
  chatId: CHAT_ID,
  callId: CALL_ID,
  kind,
  fromDevice: DEVICE,
});

describe('sendCallSignal', () => {
  beforeEach(() => {
    mockPublish.mockClear();
    mockSendNotification.mockClear();
    mockRedis.clear();
    chat = { type: ChatType.ONE_TO_ONE, archivedAt: null, capabilities: [] };
    writtenMessages = [];
  });

  it('refuses to ring in a chat whose calls are not switched on, with a reason to show', async () => {
    await expect(asAnna().sendCallSignal(signal('invite'))).rejects.toMatchObject({
      code: 'FORBIDDEN',
      reason: 'callsNotInThisChat',
    });
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('rings the partner, keeps the call for a late device and pushes it, once switched on', async () => {
    chat.capabilities = [ChatCapability.CAN_SEND_MESSAGES, ChatCapability.VOICE_CALLS];

    await asAnna().sendCallSignal(signal('invite'));

    const [channel, event] = mockPublish.mock.calls[0] ?? [];
    expect(channel).toBe(BEN);
    expect(event?.type).toBe('call_signal');
    expect(event?.call).toMatchObject({ kind: 'invite', fromUser: ANNA });
    expect(mockRedis.get(`chat:pending-call:${BEN}`)).toContain(CALL_ID);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockSendNotification).toHaveBeenCalledWith(
      't’appelle',
      [BEN],
      CHAT_ID,
      undefined,
      expect.objectContaining({ title: 'Anna v/o Fuchs', path: `/app/chat/${CHAT_ID}` }),
    );
  });

  it('still lets a hangup through after calls were switched off, so nobody rings on', async () => {
    mockRedis.set(`chat:pending-call:${BEN}`, JSON.stringify({ callId: CALL_ID }));

    await asAnna().sendCallSignal(signal('hangup'));

    const [channel, event] = mockPublish.mock.calls[0] ?? [];
    expect(channel).toBe(BEN);
    expect(event?.call).toMatchObject({ kind: 'hangup' });
    expect(mockRedis.has(`chat:pending-call:${BEN}`)).toBe(false);
  });

  it('never rings in a group chat, whatever its capabilities say', async () => {
    chat = { type: ChatType.GROUP, archivedAt: null, capabilities: [ChatCapability.VOICE_CALLS] };

    await expect(asAnna().sendCallSignal(signal('invite'))).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockPublish).not.toHaveBeenCalled();
  });

  describe('the call in the chat history', () => {
    beforeEach(() => {
      chat.capabilities = [ChatCapability.VOICE_CALLS];
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('writes a taken call with its length, once, however many sides end it', async () => {
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      await asAnna().sendCallSignal(signal('invite'));
      await asBen().sendCallSignal(signal('accept'));
      now.mockReturnValue(1_000_000 + 134_000);
      await asAnna().sendCallSignal(signal('hangup'));
      await asBen().sendCallSignal(signal('hangup'));

      expect(writtenMessages).toEqual(['Anruf von Fuchs · 2:14']);
    });

    it('writes a call nobody took as missed', async () => {
      await asAnna().sendCallSignal(signal('invite'));
      await asAnna().sendCallSignal(signal('hangup'));

      expect(writtenMessages).toEqual(['Verpasster Anruf von Fuchs']);
    });

    it('writes a declined call as declined', async () => {
      await asAnna().sendCallSignal(signal('invite'));
      await asBen().sendCallSignal(signal('decline'));

      expect(writtenMessages).toEqual(['Abgelehnter Anruf von Fuchs']);
    });

    it('writes nothing for a call that never rang', async () => {
      await asAnna().sendCallSignal(signal('hangup'));

      expect(writtenMessages).toEqual([]);
    });
  });
});
