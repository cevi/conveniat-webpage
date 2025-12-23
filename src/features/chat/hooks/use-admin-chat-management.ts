import { ChatStatus } from '@/lib/chat-shared';
import type { ChatMessage } from '@/features/chat/api/types';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import type { ChatType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';

interface UseAdminChatManagementOptions {
  chatType: ChatType;
  selectedChatId: string | undefined | null;
  showClosed: boolean;
  debouncedSearch: string;
}

export const useAdminChatManagement = ({
  chatType,
  selectedChatId,
  showClosed,
  debouncedSearch,
}: UseAdminChatManagementOptions): {
  chats: ChatWithMessagePreview[];
  messages: ChatMessage[];
  loadingChats: boolean;
  loadingMessages: boolean;
  sending: boolean;
  isClosing: boolean;
  isReopening: boolean;
  fetchChats: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  closeChat: () => Promise<void>;
  reopenChat: () => Promise<void>;
} => {
  const utils = trpc.useUtils();

  const {
    data: chats = [],
    isLoading: loadingChats,
    refetch: refetchChats,
  } = trpc.admin.listSupportChats.useQuery({
    type: chatType,
    status: showClosed ? undefined : ChatStatus.OPEN,
    search: debouncedSearch || undefined,
    includeId: selectedChatId ?? undefined,
  });

  const { data: messages = [], isLoading: loadingMessages } = trpc.admin.getChatMessages.useQuery(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    { chatId: selectedChatId! },
    {
      enabled: !!selectedChatId,
      // TODO: 
      //   - Refetch perodically or rely on invalidation?
      //   - Admin might want live updates?
      //   - Let's stick to standard behavior + invalidation on actions.
    },
  );

  const sendMessageMutation = trpc.admin.postAdminMessage.useMutation({
    onSuccess: () => {
      if (selectedChatId) {
        void utils.admin.getChatMessages.invalidate({ chatId: selectedChatId });
      }
      void utils.admin.listSupportChats.invalidate();
    },
  });

  const closeChatMutation = trpc.admin.closeChat.useMutation({
    onSuccess: () => {
      void utils.admin.listSupportChats.invalidate();
      if (selectedChatId) {
        void utils.admin.getChatMessages.invalidate({ chatId: selectedChatId });
      }
    },
  });

  const reopenChatMutation = trpc.admin.reopenChat.useMutation({
    onSuccess: () => {
      void utils.admin.listSupportChats.invalidate();
      if (selectedChatId) {
        void utils.admin.getChatMessages.invalidate({ chatId: selectedChatId });
      }
    },
  });

  return {
    chats,
    messages: messages as unknown as ChatMessage[], // Ensure type compatibility if needed
    loadingChats,
    loadingMessages,
    sending: sendMessageMutation.isPending,
    isClosing: closeChatMutation.isPending,
    isReopening: reopenChatMutation.isPending,
    fetchChats: async (): Promise<void> => {
      await refetchChats();
    },
    sendMessage: async (content: string): Promise<void> => {
      if (!selectedChatId) return;
      await sendMessageMutation.mutateAsync({ chatId: selectedChatId, content });
    },
    closeChat: async (): Promise<void> => {
      if (!selectedChatId) return;
      await closeChatMutation.mutateAsync({ chatId: selectedChatId });
    },
    reopenChat: async (): Promise<void> => {
      if (!selectedChatId) return;
      await reopenChatMutation.mutateAsync({ chatId: selectedChatId });
    },
  };
};
