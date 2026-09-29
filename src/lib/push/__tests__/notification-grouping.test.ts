import { notificationGroupingOf } from '@/lib/push/notification-grouping';

describe('notification grouping', () => {
  it('stacks the messages of a chat under the chat', () => {
    expect(notificationGroupingOf('CHAT', 'chat-1', 'message-1')).toEqual({
      tag: 'chat:chat-1',
      stack: true,
    });
  });

  it('stacks the messages of an emergency chat too, so each one alerts again', () => {
    expect(notificationGroupingOf('EMERGENCY', 'chat-9', 'message-2')).toEqual({
      tag: 'chat:chat-9',
      stack: true,
    });
  });

  it('gives an announcement a notification of its own', () => {
    expect(notificationGroupingOf('ANNOUNCEMENT', 'chat-1', 'message-1')).toEqual({
      tag: 'announcement:message-1',
    });
  });

  it('lets a subscription confirmation or an admin test stand alone', () => {
    expect(notificationGroupingOf('SYSTEM', 'chat-1', 'message-1')).toEqual({});
  });
});
