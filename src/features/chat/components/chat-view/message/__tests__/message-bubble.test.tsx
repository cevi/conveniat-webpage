/**
 * @jest-environment jsdom
 */

jest.mock('@/hooks/use-current-locale', () => ({
  useCurrentLocale: (): string => 'de',
}));

// the generated Prisma client cannot be loaded in jsdom; the enums are all the bubble needs
// images sign their URLs through tRPC; these messages carry none
jest.mock('@/features/chat/components/chat-view/message/chat-image', () => ({
  ChatImage: (): undefined => undefined,
}));
jest.mock('@/features/chat/components/chat-view/message/image-message', () => ({
  ImageMessage: (): undefined => undefined,
}));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));

import type { ChatMessage } from '@/features/chat/api/types';
import { MessageBubble } from '@/features/chat/components/chat-view/message/message-bubble';
import { render } from '@testing-library/react';

const announcement = {
  id: 'announcement',
  // a local time, so the clock reads the same in every timezone the test runs in
  createdAt: new Date(2027, 6, 26, 18, 42),
  messagePayload: {
    de: { text: '*Tageswanderung*\n\nMorgen um 07:30 beim Quartiersplatz.' },
    fr: { text: '*Randonnée*\n\nDemain à 07:30.' },
  },
  senderId: undefined,
  status: 'STORED',
  type: 'TEXT_MSG',
} as unknown as ChatMessage;

describe('MessageBubble', () => {
  it('draws a message without a chat to load, in the reader’s language, with its time', () => {
    const { container } = render(
      <MessageBubble message={announcement} isCurrentUser={false} locale="fr" showMeta />,
    );

    expect(container.querySelector('strong, b, .font-bold')?.textContent).toBe('Randonnée');
    expect(container.textContent).toContain('Demain à 07:30.');
    expect(container.textContent).toContain('18:42');
  });

  it('shows the status of an own message only where the time is shown', () => {
    const status = <span data-testid="status" />;
    const withMeta = render(
      <MessageBubble message={announcement} isCurrentUser locale="de" showMeta status={status} />,
    );
    expect(withMeta.queryByTestId('status')).not.toBeNull();
    expect(withMeta.container.textContent).toContain('18:42');

    const withoutMeta = render(
      <MessageBubble
        message={announcement}
        isCurrentUser
        locale="de"
        showMeta={false}
        status={<span data-testid="hidden-status" />}
      />,
    );
    expect(withoutMeta.queryByTestId('hidden-status')).toBeNull();
    expect(withoutMeta.container.textContent).not.toContain('18:42');
  });

  it('says "Bearbeitet" next to the time once the sender changed the text', () => {
    const own = { ...announcement, messagePayload: { text: 'Treffpunkt 07:45' } };
    const edited = render(
      <MessageBubble
        message={{ ...own, editedAt: new Date(2027, 6, 26, 18, 50) }}
        isCurrentUser
        locale="de"
        showMeta
      />,
    );
    expect(edited.container.textContent).toContain('Bearbeitet18:42');

    const unchanged = render(<MessageBubble message={own} isCurrentUser locale="de" showMeta />);
    expect(unchanged.container.textContent).not.toContain('Bearbeitet');
  });
});
