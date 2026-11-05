/**
 * @jest-environment jsdom
 */

import { toast } from '@/components/ui/toast';
import { useArchiveChatMutation } from '@/features/chat/hooks/use-archive-chat-mutation';
import { renderHook } from '@testing-library/react';

interface ArchiveOptions {
  onError: (error: unknown, input: { chatUuid: string }, context: unknown) => void;
}

const setChats = jest.fn();
const mutate = jest.fn();
let options: ArchiveOptions | undefined;

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: (): unknown => ({
      chat: { chatDetails: { setData: jest.fn() }, chats: { setData: setChats } },
    }),
    chat: {
      archiveChat: {
        useMutation: (givenOptions: ArchiveOptions): unknown => {
          options = givenOptions;
          return { mutate };
        },
      },
    },
  },
}));
jest.mock('@/components/ui/toast', () => ({ toast: { error: jest.fn() } }));
jest.mock('@/hooks/use-current-locale', () => ({ useCurrentLocale: (): string => 'de' }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useArchiveChatMutation', () => {
  it('brings the chat back, says the delete failed and sends it again on "Nochmals"', () => {
    renderHook(() => useArchiveChatMutation());
    const previousChats = [{ id: 'chat-avp-zueri-11' }];

    options?.onError(new Error('offline'), { chatUuid: 'chat-avp-zueri-11' }, { previousChats });

    expect(setChats).toHaveBeenCalledWith({}, previousChats);
    const [[message, { action }]] = jest.mocked(toast.error).mock.calls as unknown as [
      [string, { action: { label: string; onClick: () => void } }],
    ];
    expect(message).toBe('Chat konnte nicht gelöscht werden.');
    expect(action.label).toBe('Nochmals');
    action.onClick();
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'chat-avp-zueri-11' });
  });
});
