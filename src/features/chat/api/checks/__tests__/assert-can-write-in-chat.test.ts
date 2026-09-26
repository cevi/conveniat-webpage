import { assertMembershipCanWrite } from '@/features/chat/api/checks/assert-can-write-in-chat';
import { ChatCapability } from '@/lib/chat-shared';
import { ChatMembershipPermission } from '@/lib/prisma/client';

jest.mock('@/utils/server-logger', () => ({
  createLogger: (): { warn: () => void } => ({ warn: jest.fn() }),
}));
jest.mock('@/lib/ability', () => ({ Ability: { can: jest.fn() } }));

const chatWith = (
  permission: ChatMembershipPermission,
  capabilities: string[] = [],
): Parameters<typeof assertMembershipCanWrite>[0] => ({
  capabilities,
  chatMemberships: [{ userId: 'user-1', chatPermission: permission }],
});

describe('assertMembershipCanWrite', () => {
  test('a member may write anywhere in the chat', () => {
    expect(() =>
      assertMembershipCanWrite(chatWith(ChatMembershipPermission.MEMBER), 'c', 'user-1'),
    ).not.toThrow();
  });

  test('a stranger may not', () => {
    expect(() =>
      assertMembershipCanWrite(chatWith(ChatMembershipPermission.MEMBER), 'c', 'user-2'),
    ).toThrow('You are not a member of this chat.');
    // prisma answers a missing chat with null
    // eslint-disable-next-line unicorn/no-null
    expect(() => assertMembershipCanWrite(null, 'c', 'user-1')).toThrow();
  });

  test('a guest writes only in threads, and only where thread replies are enabled', () => {
    const open = chatWith(ChatMembershipPermission.GUEST, [
      ChatCapability.THREADS,
      ChatCapability.THREAD_REPLIES,
    ]);
    expect(() => assertMembershipCanWrite(open, 'c', 'user-1', 'thread-1')).not.toThrow();
    expect(() => assertMembershipCanWrite(open, 'c', 'user-1')).toThrow();

    const noReplies = chatWith(ChatMembershipPermission.GUEST, [ChatCapability.THREADS]);
    expect(() => assertMembershipCanWrite(noReplies, 'c', 'user-1', 'thread-1')).toThrow();
  });
});
