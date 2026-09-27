import { canUserArchiveChat } from '@/features/chat/api/checks/can-user-archive-chat';
import { ChatMembershipPermission, ChatType } from '@/lib/prisma/client';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';

const user = { uuid: 'user-1' } as HitobitoNextAuthUser;

const chatWith = (
  permission: ChatMembershipPermission,
  archivedAt: Date | null,
  type: ChatType = ChatType.GROUP,
): Parameters<typeof canUserArchiveChat>[1] => ({
  type,
  archivedAt,
  chatMemberships: [{ userId: 'user-1', chatPermission: permission }],
});

// eslint-disable-next-line unicorn/no-null
const open = null;
const archived = new Date(Date.now() - 1000);

describe('canUserArchiveChat', () => {
  test('only owners and admins may archive an open chat', () => {
    expect(canUserArchiveChat(user, chatWith(ChatMembershipPermission.OWNER, open))).toBe(true);
    expect(canUserArchiveChat(user, chatWith(ChatMembershipPermission.ADMIN, open))).toBe(true);
    expect(canUserArchiveChat(user, chatWith(ChatMembershipPermission.MEMBER, open))).toBe(false);
    expect(canUserArchiveChat(user, chatWith(ChatMembershipPermission.GUEST, open))).toBe(false);
  });

  test('every member may remove an archived chat from their view', () => {
    expect(canUserArchiveChat(user, chatWith(ChatMembershipPermission.MEMBER, archived))).toBe(
      true,
    );
    expect(canUserArchiveChat(user, chatWith(ChatMembershipPermission.GUEST, archived))).toBe(true);
  });

  test('a stranger may not, even once the chat is archived', () => {
    const stranger = { uuid: 'user-2' } as HitobitoNextAuthUser;
    expect(canUserArchiveChat(stranger, chatWith(ChatMembershipPermission.OWNER, archived))).toBe(
      false,
    );
  });

  test('announcements stay, archived or not', () => {
    expect(
      canUserArchiveChat(
        user,
        chatWith(ChatMembershipPermission.MEMBER, archived, ChatType.ANNOUNCEMENT),
      ),
    ).toBe(false);
  });
});
