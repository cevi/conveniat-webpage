/**
 * @jest-environment jsdom
 */

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    NEXT_PUBLIC_APP_HOST_URL: 'https://conveniat27.ch',
  },
}));

jest.mock('next-i18n-router/client', () => ({
  useCurrentLocale: (): string => mockLocale,
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

import type { ChatMessage } from '@/features/chat/api/types';
import { MessageInfoDropdown } from '@/features/chat/components/chat-view/message/message-info-dropdown';
import type { Locale } from '@/types/types';
import { render, screen, within } from '@testing-library/react';

let mockLocale: Locale = 'de';

const message = (status: string): ChatMessage =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    createdAt: new Date('2027-07-24T10:00:00.000Z'),
    messagePayload: 'Hoi zäme',
    senderId: 'sender-1',
    status,
    type: 'TEXT_MSG',
  }) as unknown as ChatMessage;

/**
 * The status value shares its wording with the "sent" row label in some locales, so
 * assertions are scoped to the row holding the localized "Status" caption.
 */
const statusRow = (caption: string): HTMLElement => {
  const row = screen.getByText(caption).parentElement?.parentElement;
  if (!row) throw new Error('status row not found');
  return row;
};

describe('MessageInfoDropdown status label', () => {
  beforeEach(() => {
    mockLocale = 'de';
  });

  it.each([
    ['STORED', 'Gesendet'],
    ['RECEIVED', 'Empfangen'],
    ['READ', 'Gelesen'],
    ['DISTRIBUTED', 'Zugestellt'],
    ['CREATED', 'Wird gesendet'],
  ])('renders the German label for %s', (status, label) => {
    render(<MessageInfoDropdown message={message(status)} isCurrentUser onClose={jest.fn()} />);

    expect(within(statusRow('Status')).getByText(label)).toBeInTheDocument();
    // the raw enum value must never leak into the UI
    expect(screen.queryByText(status.toLowerCase())).not.toBeInTheDocument();
  });

  it('translates the status into French', () => {
    mockLocale = 'fr';

    render(<MessageInfoDropdown message={message('READ')} isCurrentUser onClose={jest.fn()} />);

    expect(within(statusRow('Statut')).getByText('Lu')).toBeInTheDocument();
  });

  it('falls back to the raw status for an unknown event type', () => {
    render(
      <MessageInfoDropdown message={message('SOME_NEW_EVENT')} isCurrentUser onClose={jest.fn()} />,
    );

    expect(within(statusRow('Status')).getByText('SOME_NEW_EVENT')).toBeInTheDocument();
  });
});
