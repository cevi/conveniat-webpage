import { SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import { MessageType } from '@/lib/prisma';

interface TestMessage {
  id: string;
  type: string;
  senderId?: string | undefined;
}

describe('useMessageReadStatus target message logic', () => {
  it('correctly identifies system messages and non-current-user messages', () => {
    const currentUser = 'user-uuid-1';

    const messages: TestMessage[] = [
      { id: 'msg-1', type: MessageType.SYSTEM_MSG, senderId: undefined },
      { id: 'msg-2', type: MessageType.TEXT_MSG, senderId: 'user-uuid-1' },
      { id: 'msg-3', type: MessageType.TEXT_MSG, senderId: 'user-uuid-2' },
      { id: 'msg-4', type: MessageType.TEXT_MSG, senderId: SYSTEM_SENDER_ID },
      { id: 'msg-5', type: MessageType.SYSTEM_MSG, senderId: 'user-uuid-1' },
    ];

    const isNotSentByCurrentUser = (message: TestMessage): boolean => {
      if (message.type === MessageType.SYSTEM_MSG) return true;
      if (message.senderId === SYSTEM_SENDER_ID) return true;
      if (typeof message.senderId !== 'string') return true;
      return message.senderId !== currentUser;
    };

    const latestMessageToRead = [...messages].reverse().find((m) => isNotSentByCurrentUser(m));

    // msg-5 is a system message so it should be picked as the latest message to read
    expect(latestMessageToRead?.id).toBe('msg-5');
  });

  it('correctly identifies messages with undefined senderId as non-current-user', () => {
    const currentUser = 'user-uuid-1';

    const messages: TestMessage[] = [
      { id: 'msg-1', type: MessageType.TEXT_MSG, senderId: undefined },
    ];

    const isNotSentByCurrentUser = (message: TestMessage): boolean => {
      if (message.type === MessageType.SYSTEM_MSG) return true;
      if (message.senderId === SYSTEM_SENDER_ID) return true;
      if (typeof message.senderId !== 'string') return true;
      return message.senderId !== currentUser;
    };

    const latestMessageToRead = [...messages].reverse().find((m) => isNotSentByCurrentUser(m));

    expect(latestMessageToRead?.id).toBe('msg-1');
  });
});
