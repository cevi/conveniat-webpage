/**
 * @jest-environment jsdom
 */

const mockToastError = jest.fn();
jest.mock('@/components/ui/toast', () => ({
  toast: { error: (text: string): unknown => mockToastError(text) },
}));

jest.mock('@/features/chat/context/chat-id-context', () => ({
  useChatId: (): string => 'chat-1',
}));

interface MutationOptions {
  onError: (error: unknown) => void;
}

jest.mock('@/trpc/client', () => ({
  useTRPC: (): unknown => ({
    chat: {
      updateMessageContent: { mutationOptions: (options: unknown): unknown => options },
      infiniteMessages: { infiniteQueryFilter: (): unknown => ({}) },
    },
    admin: { getChatMessages: { queryFilter: (): unknown => ({}) } },
  }),
}));

// the server refuses the answer, without a reason, as a dropped connection would
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: (): unknown => ({ invalidateQueries: jest.fn() }),
  useMutation: (options: MutationOptions): unknown => ({
    mutate: (): void => options.onError(new Error('Internal server error')),
  }),
}));

import type { ChatMessage } from '@/features/chat/api/types';
import { AlertQuestionMessage } from '@/features/chat/components/chat-view/message/alert-question-message';
import { fireEvent, render, screen } from '@testing-library/react';

const question = {
  id: '11111111-1111-4111-8111-111111111111',
  createdAt: new Date(2026, 6, 28, 14, 5),
  messagePayload: {
    question: 'Ist die Person ansprechbar?',
    options: [
      { id: 'yes', option: 'Ja' },
      { id: 'no', option: 'Nein' },
    ],
  },
  senderId: 'sender-1',
  status: 'STORED',
  type: 'ALERT_QUESTION',
} as unknown as ChatMessage;

beforeEach(() => {
  mockToastError.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('answering an emergency question', () => {
  it('tells the user when the answer could not be sent, and lets them answer again', () => {
    render(<AlertQuestionMessage message={question} isCurrentUser locale="de" />);

    fireEvent.click(screen.getByRole('button', { name: 'Ja' }));

    expect(mockToastError).toHaveBeenCalledWith(
      'Deine Antwort konnte nicht gesendet werden. Versuche es nochmals.',
    );
    for (const name of ['Ja', 'Nein']) {
      expect(screen.getByRole<HTMLButtonElement>('button', { name }).disabled).toBe(false);
    }
  });
});
