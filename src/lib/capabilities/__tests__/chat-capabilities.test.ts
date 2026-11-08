import { checkCapability } from '@/lib/capabilities';
import type { CapabilityChat } from '@/lib/capabilities/types';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { ChatCapability, ChatStatus } from '@/lib/prisma/enums';

import type { PrismaClientOrTransaction } from '@/types/types';

jest.mock('@/lib/db/redis', () => ({
  getFeatureFlag: (): Promise<boolean> => Promise.resolve(true),
}));

const CHAT_ID = 'chat-1';

const openChat = (capabilities: ChatCapability[]): CapabilityChat => ({
  capabilities,
  status: ChatStatus.OPEN,
  archivedAt: null,
});

/** A client whose only table is the chat, counting how often it is read. */
const clientWith = (
  chat?: CapabilityChat,
): { prisma: PrismaClientOrTransaction; reads: () => number } => {
  const findUnique = jest.fn((): Promise<CapabilityChat | null> => Promise.resolve(chat ?? null));
  return {
    prisma: { chat: { findUnique } } as unknown as PrismaClientOrTransaction,
    reads: (): number => findUnique.mock.calls.length,
  };
};

describe('chat capabilities', () => {
  test('a check given the chat decides on it without reading it again', async () => {
    const chat = openChat([ChatCapability.CAN_SEND_MESSAGES, ChatCapability.PICTURE_UPLOAD]);
    const { prisma, reads } = clientWith(chat);

    await expect(
      checkCapability(prisma, CapabilityAction.Send, CapabilitySubject.Messages, CHAT_ID, chat),
    ).resolves.toBe(true);
    await expect(
      checkCapability(prisma, CapabilityAction.Upload, CapabilitySubject.Images, CHAT_ID, chat),
    ).resolves.toBe(true);
    await expect(
      checkCapability(prisma, CapabilityAction.Create, CapabilitySubject.Threads, CHAT_ID, chat),
    ).resolves.toBe(false);
    expect(reads()).toBe(0);
  });

  test('a check without the chat reads it', async () => {
    const { prisma, reads } = clientWith(openChat([ChatCapability.PICTURE_UPLOAD]));

    await expect(
      checkCapability(prisma, CapabilityAction.Upload, CapabilitySubject.Images, CHAT_ID),
    ).resolves.toBe(true);
    expect(reads()).toBe(1);
  });

  test('a chat the caller found missing is not read again', async () => {
    const { prisma, reads } = clientWith(openChat([ChatCapability.PICTURE_UPLOAD]));

    await expect(
      checkCapability(prisma, CapabilityAction.Upload, CapabilitySubject.Images, CHAT_ID, null),
    ).resolves.toBe(false);
    expect(reads()).toBe(0);
  });

  test('a handed-in closed or archived chat is refused like a read one', async () => {
    const { prisma } = clientWith();
    const closed = { ...openChat([ChatCapability.CAN_SEND_MESSAGES]), status: ChatStatus.CLOSED };
    const archived = {
      ...openChat([ChatCapability.CAN_SEND_MESSAGES]),
      archivedAt: new Date(0),
    };

    for (const chat of [closed, archived] as CapabilityChat[]) {
      await expect(
        checkCapability(prisma, CapabilityAction.Send, CapabilitySubject.Messages, CHAT_ID, chat),
      ).resolves.toBe(false);
    }
  });
});
