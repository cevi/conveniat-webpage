import type { ChatMessage } from '@/features/chat/api/types';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { ChatStatus } from '@/lib/chat-shared';
import type { ChatRealtimeEvent } from '@/lib/db/chat-pubsub';
import type { ChatType } from '@/lib/prisma/client';
import { MessageEventType, MessageType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import { useEffect } from 'react';
import superjson from 'superjson';

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
  currentUserId: string | undefined;
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

  const { data: messagesData, isLoading: loadingMessages } = trpc.admin.getChatMessages.useQuery(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    { chatId: selectedChatId! },
    {
      enabled: typeof selectedChatId === 'string' && selectedChatId !== '',
      // TODO:
      //   - Refetch perodically or rely on invalidation?
      //   - Admin might want live updates?
      //   - Let's stick to standard behavior + invalidation on actions.
    },
  );

  const sendMessageMutation = trpc.admin.postAdminMessage.useMutation({
    async onMutate({ chatId, content, type }) {
      await utils.admin.getChatMessages.cancel({ chatId });

      const previousMessages = utils.admin.getChatMessages.getData({ chatId });
      const currentUserId = previousMessages?.currentUserId ?? 'current-admin-user';

      const optimisticMessage = {
        id: `optimistic-${Date.now()}`,
        createdAt: new Date(),
        messagePayload: type === MessageType.IMAGE_MSG ? { url: content } : { text: content },
        senderId: currentUserId,
        senderName: 'You (Admin)',
        type: type ?? MessageType.TEXT_MSG,
        status: MessageEventType.CREATED,
        isAdminMessage: true,
      };

      utils.admin.getChatMessages.setData({ chatId }, (old) => {
        if (!old) {
          return {
            messages: [optimisticMessage],
            currentUserId,
          };
        }
        return {
          ...old,
          messages: [...old.messages, optimisticMessage],
        };
      });

      return { previousMessages };
    },
    onError: (_error, { chatId }, context) => {
      if (context?.previousMessages) {
        utils.admin.getChatMessages.setData({ chatId }, context.previousMessages);
      }
    },
    onSuccess: (createdMessage, { chatId, content, type }) => {
      utils.admin.getChatMessages.setData({ chatId }, (old) => {
        if (!old) return old;
        const alreadyHasStored = old.messages.some((m) => m.id === createdMessage.uuid);
        return {
          ...old,
          messages: old.messages
            .map((m) => {
              if (m.id.startsWith('optimistic-')) {
                return alreadyHasStored
                  ? undefined
                  : {
                      id: createdMessage.uuid,
                      createdAt: createdMessage.createdAt,
                      messagePayload:
                        type === MessageType.IMAGE_MSG ? { url: content } : { text: content },
                      senderId: createdMessage.senderId ?? 'current-admin-user',
                      senderName: 'You (Admin)',
                      type: type ?? MessageType.TEXT_MSG,
                      status: MessageEventType.STORED,
                      isAdminMessage: true,
                    };
              }
              return m;
            })
            .filter((m): m is (typeof old.messages)[0] => m !== undefined),
        };
      });
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

  useEffect(() => {
    const url = `/api/chat/sse?chatIds=all`;
    const eventSource = new EventSource(url);

    const handleMessage = (event: MessageEvent): void => {
      try {
        if (typeof event.data !== 'string') return;
        const data = superjson.parse<{ json: ChatRealtimeEvent }>(event.data);
        const chatEvent = 'json' in data ? data.json : (data as unknown as ChatRealtimeEvent);

        // Invalidate chats to instantly update new/unread list in the sidebar
        void utils.admin.listSupportChats.invalidate();

        // If the event is for the active chat and it's a new or updated message, refresh messages.
        // We explicitly ignore 'chat_read_by_admin' events to prevent an infinite feedback loop,
        // as fetching admin messages automatically updates the admin read timestamp and publishes
        // a 'chat_read_by_admin' event.
        if (
          selectedChatId &&
          chatEvent.chatId === selectedChatId &&
          chatEvent.type !== 'chat_read_by_admin'
        ) {
          void utils.admin.getChatMessages.invalidate({ chatId: selectedChatId });
        }
      } catch (error) {
        console.error('[Admin SSE] Failed to parse real-time event:', error);
      }
    };

    eventSource.addEventListener('message', handleMessage);

    return (): void => {
      eventSource.removeEventListener('message', handleMessage);
      eventSource.close();
    };
  }, [selectedChatId, utils]);

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
    messages: messagesData?.messages ?? [], // Ensure type compatibility if needed
    currentUserId: messagesData?.currentUserId,
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
