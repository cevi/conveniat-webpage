/**
 * @jest-environment jsdom
 */

jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => 'de',
}));

// the generated Prisma client cannot be loaded in jsdom; the enum is all this component needs
jest.mock('@/lib/prisma/client', () => ({
  MessageEventType: {
    CREATED: 'CREATED',
    STORED: 'STORED',
    DISTRIBUTED: 'DISTRIBUTED',
    RECEIVED: 'RECEIVED',
    READ: 'READ',
  },
}));

// the sheet in the same module deletes through tRPC, which this line never touches
jest.mock('@/features/chat/hooks/use-delete-message', () => ({ useDeleteMessage: jest.fn() }));

import type { ChatMessage } from '@/features/chat/api/types';
import { MessageStatusLine } from '@/features/chat/components/chat-view/message/message-actions-sheet';
import { render } from '@testing-library/react';

const message = (status: string, extra: Partial<ChatMessage> = {}): ChatMessage =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    // a local time, so the clock reads the same in every timezone the test runs in
    createdAt: new Date(2026, 9, 7, 20, 29),
    messagePayload: 'Hoi zäme',
    senderId: 'sender-1',
    status,
    type: 'TEXT_MSG',
    ...extra,
  }) as unknown as ChatMessage;

const lineOf = (element: React.ReactElement): string => render(element).container.textContent ?? '';

describe('MessageStatusLine', () => {
  it.each([
    ['STORED', 'Gesendet'],
    ['DISTRIBUTED', 'Gesendet'],
    ['RECEIVED', 'Zugestellt'],
    ['READ', 'Gelesen'],
    ['CREATED', 'Wird gesendet'],
  ])('says how far an own %s message got, and when it went out', (status, label) => {
    expect(lineOf(<MessageStatusLine message={message(status)} isCurrentUser locale="de" />)).toBe(
      `${label}·Mi, 7. Okt., 20:29`,
    );
  });

  it('shows only the time on a message from someone else', () => {
    expect(
      lineOf(<MessageStatusLine message={message('READ')} isCurrentUser={false} locale="de" />),
    ).toBe('Mi, 7. Okt., 20:29');
  });

  it('speaks French and English', () => {
    expect(lineOf(<MessageStatusLine message={message('READ')} isCurrentUser locale="fr" />)).toBe(
      'Lu·mer. 7 oct., 20:29',
    );
    expect(lineOf(<MessageStatusLine message={message('READ')} isCurrentUser locale="en" />)).toBe(
      'Read·Wed, Oct 7, 20:29',
    );
  });

  it('tells a failed and a queued message from a sent one', () => {
    expect(
      lineOf(
        <MessageStatusLine
          message={message('CREATED', { sendFailed: true })}
          isCurrentUser
          locale="de"
        />,
      ),
    ).toContain('Nicht gesendet');
    expect(
      lineOf(
        <MessageStatusLine
          message={message('CREATED', { isPendingOffline: true })}
          isCurrentUser
          locale="de"
        />,
      ),
    ).toContain('sobald du online bist');
  });

  it('shows a status this build does not know as it is, rather than crash', () => {
    expect(
      lineOf(<MessageStatusLine message={message('SOME_NEW_EVENT')} isCurrentUser locale="de" />),
    ).toContain('SOME_NEW_EVENT');
  });
});
