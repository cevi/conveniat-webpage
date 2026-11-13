/**
 * @jest-environment jsdom
 */

jest.mock('@/hooks/use-current-locale', () => ({
  useCurrentLocale: (): string => 'de',
}));
jest.mock('@/features/chat/components/chat-view/message/chat-image', () => ({
  ChatImage: (): undefined => undefined,
}));
jest.mock('@/features/chat/components/chat-view/message/image-message', () => ({
  ImageMessage: (): undefined => undefined,
}));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));

import type { ChatMessage } from '@/features/chat/api/types';
import {
  ForumHiddenNotice,
  RemovedMessageBubble,
} from '@/features/chat/components/chat-view/message/removed-message';
import type { ForumRemovalInfo } from '@/lib/forum-shared';
import { render } from '@testing-library/react';

const removal = (overrides: Partial<ForumRemovalInfo>): ForumRemovalInfo => ({
  kind: 'HIDDEN',
  reason: 'PERSONAL_DATA',
  note: null,
  byCapacity: null,
  at: new Date(2027, 6, 26, 19, 0),
  reviewRequested: false,
  ...overrides,
});

const comment = (overrides: Partial<ChatMessage>): ChatMessage =>
  ({
    id: 'comment-1',
    createdAt: new Date(2027, 6, 26, 18, 42),
    messagePayload: {},
    senderId: 'sender-1',
    status: 'STORED',
    type: 'TEXT_MSG',
    parentId: 'post-1',
    ...overrides,
  }) as unknown as ChatMessage;

const bubbleText = (message: ChatMessage): string =>
  render(<RemovedMessageBubble message={message} isCurrentUser={false} locale="de" showMeta />)
    .container.textContent ?? '';

describe('a message without its content', () => {
  it('says the sender deleted it when nobody else did', () => {
    expect(bubbleText(comment({ deletedAt: new Date() }))).toContain(
      'Diese Nachricht wurde gelöscht',
    );
  });

  it('says the moderators removed it, and why to those who may know', () => {
    const text = bubbleText(
      comment({
        deletedAt: new Date(),
        forumRemoval: removal({ kind: 'DELETED', note: 'Bitte keine Handynummern posten.' }),
      }),
    );

    expect(text).toContain('Von der Moderation entfernt');
    expect(text).toContain('Grund: Persönliche Daten');
    expect(text).toContain('Bitte keine Handynummern posten.');
    expect(text).not.toContain('gelöscht');
  });

  it('says the moderators hid it, to everyone who does not see it', () => {
    const text = bubbleText(comment({ deletedAt: new Date(), forumRemoval: removal({}) }));

    expect(text).toContain('Von der Moderation ausgeblendet');
    expect(text).toContain('18:42');
  });
});

describe('a hidden message its author or a moderator still sees', () => {
  it('says why it is hidden and that others only see a notice', () => {
    const { container } = render(
      <ForumHiddenNotice
        message={comment({
          messagePayload: { text: 'Ruft mich an: 079 …' },
          forumRemoval: removal({ note: 'Nummer entfernen, dann blenden wir es wieder ein.' }),
        })}
        locale="de"
      />,
    );

    expect(container.textContent).toContain(
      'Ausgeblendet: Persönliche Daten. Andere sehen nur einen Hinweis.',
    );
    expect(container.textContent).toContain('Nummer entfernen, dann blenden wir es wieder ein.');
  });

  it('shows nothing on a message nobody hid, as from a cache older than removals', () => {
    const { container } = render(
      <ForumHiddenNotice message={comment({ messagePayload: { text: 'Hoi' } })} locale="de" />,
    );

    expect(container.textContent).toBe('');
  });
});
