import { assertWriteAbilities } from '@/features/chat/api/checks/assert-can-write-in-chat';
import type { CapabilityChat } from '@/lib/capabilities/types';
import { ChatCapability, ChatStatus } from '@/lib/chat-shared';
import type { PrismaClientOrTransaction } from '@/types/types';

jest.mock('@/utils/server-logger', () => ({
  createLogger: (): { warn: () => void } => ({ warn: jest.fn() }),
}));
jest.mock('@/lib/db/redis', () => ({
  getFeatureFlag: (): Promise<boolean> => Promise.resolve(true),
}));

const CHAT_ID = 'chat-1';

const openChat = (capabilities: ChatCapability[]): CapabilityChat => ({
  capabilities,
  status: ChatStatus.OPEN,
  // eslint-disable-next-line unicorn/no-null
  archivedAt: null,
});

describe('assertWriteAbilities', () => {
  test('a thread reply checks sending and threads on the chat it was given', async () => {
    const findUnique = jest.fn();
    const prisma = { chat: { findUnique } } as unknown as PrismaClientOrTransaction;

    await expect(
      assertWriteAbilities(
        prisma,
        CHAT_ID,
        'thread-1',
        openChat([ChatCapability.CAN_SEND_MESSAGES, ChatCapability.THREADS]),
      ),
    ).resolves.toBeUndefined();
    await expect(
      assertWriteAbilities(
        prisma,
        CHAT_ID,
        'thread-1',
        openChat([ChatCapability.CAN_SEND_MESSAGES]),
      ),
    ).rejects.toThrow('Threading is not enabled in this chat.');
    await expect(
      assertWriteAbilities(prisma, CHAT_ID, 'thread-1', openChat([ChatCapability.THREADS])),
    ).rejects.toThrow('Messaging is disabled in this chat or globally.');

    expect(findUnique).not.toHaveBeenCalled();
  });
});
