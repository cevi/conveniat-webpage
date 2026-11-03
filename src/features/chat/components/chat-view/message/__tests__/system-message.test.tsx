/**
 * @jest-environment jsdom
 */

jest.mock('@/hooks/use-current-locale', () => ({
  useCurrentLocale: (): string => 'de',
}));

// reached through the message formatter, which reads the app's URL for links
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NEXT_PUBLIC_APP_HOST_URL: 'http://localhost:3000' },
}));

import type { ChatMessage } from '@/features/chat/api/types';
import { SystemMessage } from '@/features/chat/components/chat-view/message/system-message';
import { render, screen } from '@testing-library/react';

const PENDING = 'Wird erstellt, sobald du wieder online bist';
const creator = { id: 'me', name: 'Nina Muster' };

const message = (
  payload: ChatMessage['messagePayload'],
  isPendingOffline: boolean,
  sendFailed = false,
): ChatMessage =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    createdAt: new Date(2027, 6, 27, 10, 35),
    messagePayload: payload,
    type: 'SYSTEM_MSG',
    status: 'STORED',
    isPendingOffline,
    sendFailed,
  }) as ChatMessage;

const created = { de: 'Neuer Chat erstellt', en: 'New Chat created', fr: 'Nouveau chat créé' };

describe('SystemMessage of a chat created without signal', () => {
  it('says under the creation that the chat is still waiting', () => {
    render(<SystemMessage message={message(created, true)} creator={creator} currentUserId="me" />);

    expect(screen.getByText(/Du hast den Chat erstellt/)).toBeInTheDocument();
    expect(screen.getByText(PENDING)).toBeInTheDocument();
  });

  it('says nothing more once the chat exists on the server', () => {
    render(
      <SystemMessage message={message(created, false)} creator={creator} currentUserId="me" />,
    );

    expect(screen.queryByText(PENDING)).toBeNull();
  });

  it('says so when the server refused the queued creation for good', () => {
    render(
      <SystemMessage
        message={message(created, false, true)}
        creator={creator}
        currentUserId="me"
      />,
    );

    expect(screen.queryByText(PENDING)).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Der Chat konnte nicht erstellt werden.');
  });

  it('keeps the line to the creation', () => {
    render(<SystemMessage message={message({ de: 'Anna ist beigetreten' }, true)} />);

    expect(screen.queryByText(PENDING)).toBeNull();
  });
});
