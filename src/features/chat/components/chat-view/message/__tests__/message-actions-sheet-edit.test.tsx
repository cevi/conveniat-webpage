/**
 * @jest-environment jsdom
 */

jest.mock('@/hooks/use-current-locale', () => ({
  useCurrentLocale: (): string => 'de',
}));

// deleting goes through tRPC, which these tests never reach
jest.mock('@/features/chat/hooks/use-delete-message', () => ({
  useDeleteMessage: (): unknown => ({ mutate: jest.fn(), isPending: false, isError: false }),
}));

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: (): boolean => true,
}));

jest.mock('@/features/chat/context/chat-id-context', () => ({
  useChatId: (): string => 'chat-1',
}));

import type { ChatMessage } from '@/features/chat/api/types';
import { MessageActionsSheet } from '@/features/chat/components/chat-view/message/message-actions-sheet';
import type { ExtraMessageAction } from '@/features/chat/context/chat-actions-context';
import { ChatActionsProvider, useChatActions } from '@/features/chat/context/chat-actions-context';
import { fireEvent, render, screen } from '@testing-library/react';
import { Flag, ShieldOff } from 'lucide-react';
import type React from 'react';

const HOUR_MS = 60 * 60 * 1000;

const textMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    createdAt: new Date(Date.now() - HOUR_MS),
    messagePayload: { text: 'Treffpunkt beim Hof Cevi Uster' },
    senderId: 'sender-1',
    status: 'STORED',
    type: 'TEXT_MSG',
    ...overrides,
  }) as unknown as ChatMessage;

/** What the composer reads from the context: the message it is changing. */
const EditingProbe: React.FC = () => {
  const { editingMessage } = useChatActions();
  return <output data-testid="editing">{editingMessage?.text ?? ''}</output>;
};

const renderSheet = ({
  message = textMessage(),
  isCurrentUser = true,
  canEdit = true,
  messageActions,
  onClose = jest.fn(),
}: {
  message?: ChatMessage;
  isCurrentUser?: boolean;
  canEdit?: boolean;
  messageActions?: (message: ChatMessage) => ExtraMessageAction[];
  onClose?: () => void;
} = {}): void => {
  render(
    <ChatActionsProvider {...(messageActions === undefined ? {} : { messageActions })}>
      <MessageActionsSheet
        message={message}
        isCurrentUser={isCurrentUser}
        locale="de"
        preview={<p>Treffpunkt</p>}
        onClose={onClose}
        canEdit={canEdit}
      />
      <EditingProbe />
    </ChatActionsProvider>,
  );
};

describe('editing a message from its actions sheet', () => {
  it('offers to edit an own text sent less than a day ago, and puts it in the composer', () => {
    const onClose = jest.fn();
    renderSheet({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));

    expect(screen.getByTestId('editing').textContent).toBe('Treffpunkt beim Hof Cevi Uster');
    expect(onClose).toHaveBeenCalled();
  });

  it('does not offer it once the day is over', () => {
    renderSheet({ message: textMessage({ createdAt: new Date(Date.now() - 25 * HOUR_MS) }) });

    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).toBeNull();
  });

  it('does not offer it on someone else’s message', () => {
    renderSheet({ isCurrentUser: false });

    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).toBeNull();
  });

  it('does not offer it on an image', () => {
    renderSheet({ message: textMessage({ type: 'IMAGE_MSG' }) });
    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).toBeNull();
  });

  it('does not offer it before the server stored the message', () => {
    renderSheet({ message: textMessage({ status: 'CREATED' as ChatMessage['status'] }) });
    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).toBeNull();
  });

  it('does not offer it where the user may not write', () => {
    renderSheet({ canEdit: false });

    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).toBeNull();
  });
});

describe('actions a screen adds to the sheet', () => {
  it('shows them after the built-in rows and runs the one chosen', () => {
    const report = jest.fn<undefined, [string]>();
    const onClose = jest.fn();
    renderSheet({
      onClose,
      isCurrentUser: false,
      messageActions: (message) => [
        {
          key: 'report',
          label: 'Melden',
          icon: Flag,
          onSelect: (): void => {
            report(message.id);
          },
        },
        {
          key: 'hide',
          label: 'Ausblenden',
          icon: ShieldOff,
          onSelect: jest.fn(),
          destructive: true,
        },
      ],
    });

    expect(screen.getByRole('button', { name: 'Ausblenden' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Melden' }));

    expect(report).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
    expect(onClose).toHaveBeenCalled();
  });
});
