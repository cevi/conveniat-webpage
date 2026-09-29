import { notificationGroupingOf } from '@/lib/push/notification-grouping';

describe('notification grouping', () => {
  it('stacks the messages of a chat under the chat', () => {
    expect(notificationGroupingOf('CHAT', 'chat-1', 'message-1')).toEqual({
      tag: 'chat:chat-1',
      stack: true,
    });
  });

  // A notification of its own alerts in every browser, and nothing arriving later hides it.
  it('never stacks an emergency and keeps its chat in the tag', () => {
    expect(notificationGroupingOf('EMERGENCY', 'chat-9', 'message-2')).toEqual({
      tag: 'emergency:chat-9:message-2',
    });
  });

  // Reading the emergency chat closes its notifications by the chat in the tag, the alert too.
  it('tags the alert that opens an emergency chat under that chat', () => {
    expect(notificationGroupingOf('EMERGENCY', 'chat-9')).toEqual({
      tag: 'emergency:chat-9:alert',
    });
  });

  it('stacks a problem report under its support chat', () => {
    expect(notificationGroupingOf('SUPPORT', 'chat-3', 'message-4')).toEqual({
      tag: 'chat:chat-3',
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
