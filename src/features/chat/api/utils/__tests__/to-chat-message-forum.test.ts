import { toChatMessage } from '@/features/chat/api/utils/to-chat-message';
import type { ForumRemovalInfo } from '@/lib/forum-shared';
import { MessageEventType } from '@/lib/prisma/enums';

const row = {
  uuid: 'comment',
  createdAt: new Date('2027-07-25T10:00:00Z'),
  senderId: 'jan',
  sender: { name: 'Jan Huber v/o Biber' },
  type: 'TEXT_MSG',
  parentId: 'post',
  deletedAt: null,
  contentVersions: [{ payload: { text: 'Ihr seid alle zu blöd zum Abschliessen.' } }],
  reactions: [{ emoji: '👍', userId: 'noah', user: { name: 'Noah' } }],
  replies: [],
};

const hidden: ForumRemovalInfo = {
  kind: 'HIDDEN',
  reason: 'INAPPROPRIATE',
  note: null,
  byCapacity: null,
  at: new Date('2027-07-25T10:05:00Z'),
  reviewRequested: false,
};

const context = {
  status: MessageEventType.STORED,
  deletedQuotedIds: new Set<string>(),
  threads: new Map(),
  forumRemovals: new Map([['comment', hidden]]),
};

describe('a forum comment the moderators hid', () => {
  it('reaches whoever may not read it as a removed message, without text or reactions', () => {
    const message = toChatMessage(row, { ...context, hiddenIds: new Set(['comment']) });
    expect(message.deletedAt).toEqual(hidden.at);
    expect(message.messagePayload).toEqual({});
    expect(message.reactions).toEqual([]);
    expect(message.forumRemoval?.kind).toBe('HIDDEN');
  });

  it('reaches its author and the moderators with its text and the reason', () => {
    const message = toChatMessage(row, { ...context, hiddenIds: new Set() });
    expect(message.deletedAt).toBeUndefined();
    expect(message.messagePayload).toMatchObject({
      text: 'Ihr seid alle zu blöd zum Abschliessen.',
    });
    expect(message.forumRemoval?.reason).toBe('INAPPROPRIATE');
  });
});
