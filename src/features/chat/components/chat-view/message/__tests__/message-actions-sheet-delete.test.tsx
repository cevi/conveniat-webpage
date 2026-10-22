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

const mockDelete = jest.fn();
jest.mock('@/features/chat/hooks/use-delete-message', () => ({
  useDeleteMessage: (): unknown => ({ mutate: mockDelete, isPending: false, isError: false }),
}));

let mockIsOnline = true;
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: (): boolean => mockIsOnline,
}));

jest.mock('@/features/chat/context/chat-id-context', () => ({
  useChatId: (): string => 'chat-1',
}));

import type { ChatMessage } from '@/features/chat/api/types';
import { MessageActionsSheet } from '@/features/chat/components/chat-view/message/message-actions-sheet';
import { fireEvent, render, screen } from '@testing-library/react';

const message = {
  id: '11111111-1111-4111-8111-111111111111',
  createdAt: new Date(2026, 9, 7, 20, 29),
  messagePayload: { text: 'Treffpunkt beim Hof Cevi Uster' },
  senderId: 'sender-1',
  status: 'STORED',
  type: 'TEXT_MSG',
} as unknown as ChatMessage;

const renderSheet = (canDelete: boolean, onClose = jest.fn()): void => {
  render(
    <MessageActionsSheet
      message={message}
      isCurrentUser
      locale="de"
      preview={<p>Treffpunkt beim Hof Cevi Uster</p>}
      onClose={onClose}
      textToCopy="Treffpunkt beim Hof Cevi Uster"
      canDelete={canDelete}
    />,
  );
};

beforeEach(() => {
  mockDelete.mockReset();
  mockIsOnline = true;
});

describe('deleting a message from its actions sheet', () => {
  it('offers no delete on a message the user may not delete', () => {
    renderSheet(false);

    expect(screen.queryByRole('button', { name: 'Löschen' })).toBeNull();
  });

  it('asks before it deletes, and says what it deletes', () => {
    renderSheet(true);

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Nachricht für alle löschen?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Für alle löschen' })).toBeTruthy();
  });

  it('deletes the message once confirmed', () => {
    renderSheet(true);

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Für alle löschen' }));

    expect(mockDelete).toHaveBeenCalledWith(
      { messageId: message.id },
      expect.objectContaining({ onSuccess: expect.any(Function) as unknown }),
    );
  });

  it('goes back to the actions when the user cancels', () => {
    renderSheet(true);

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Löschen' })).toBeTruthy();
  });

  it('cannot delete offline, and says why', () => {
    mockIsOnline = false;
    renderSheet(true);

    const row = screen.getByRole('button', { name: /Löschen/ });
    expect((row as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Zum Löschen brauchst du eine Verbindung')).toBeTruthy();
  });
});
