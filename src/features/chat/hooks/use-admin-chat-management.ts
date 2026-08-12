import type { ChatMessage } from '@/features/chat/api/types';
import type { RealtimeConnectionStatus } from '@/features/chat/hooks/use-admin-realtime-connection';
import { useAdminRealtimeConnection } from '@/features/chat/hooks/use-admin-realtime-connection';
import type { ChatWithMessagePreview } from '@/features/chat/types/api-dto-types';
import { generateMessageId, mergeStoredMessage } from '@/features/chat/utils';
import {
  playAlertRingTone,
  playMessageTone,
  unlockNotificationSounds,
} from '@/features/chat/utils/notification-sounds';
import { ChatStatus, SYSTEM_MSG_TYPE_EMERGENCY_ALERT, SYSTEM_SENDER_ID } from '@/lib/chat-shared';
import type { ChatRealtimeEvent } from '@/lib/db/chat-pubsub';
import { ChatType, MessageEventType, MessageType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import { useCallback, useEffect, useRef } from 'react';
import superjson from 'superjson';

/**
 * Whether a realtime event is the system message that marks the creation of a
 * new emergency alert chat.
 */
const isEmergencyAlertCreationEvent = (chatEvent: ChatRealtimeEvent): boolean => {
  if (chatEvent.type !== 'new_message') return false;
  if (chatEvent.message?.type !== (MessageType.SYSTEM_MSG as string)) return false;
  const payload = chatEvent.message.messagePayload;
  if (typeof payload !== 'object' || payload === null) return false;
  return (
    (payload as Record<string, unknown>)['system_msg_type'] === SYSTEM_MSG_TYPE_EMERGENCY_ALERT
  );
};

interface UseAdminChatManagementOptions {
  chatType: ChatType;
  selectedChatId: string | undefined | null;
  showClosed: boolean;
  debouncedSearch: string;
  locale: string;
}

export const useAdminChatManagement = ({
  chatType,
  selectedChatId,
  showClosed,
  debouncedSearch,
  locale,
}: UseAdminChatManagementOptions): {
  chats: ChatWithMessagePreview[];
  messages: ChatMessage[];
  currentUserId: string | undefined;
  loadingChats: boolean;
  loadingMessages: boolean;
  sending: boolean;
  isClosing: boolean;
  isReopening: boolean;
  /** Health of the realtime stream that feeds this view. */
  realtimeStatus: RealtimeConnectionStatus;
  /** Timestamp of the last signal received from the realtime stream. */
  lastSignalAt: number | undefined;
  /** Forces a fresh realtime connection and refetches the view. */
  reconnectRealtime: () => void;
  fetchChats: () => Promise<void>;
  sendMessage: (content: string, type?: MessageType) => Promise<void>;
  closeChat: () => Promise<void>;
  reopenChat: () => Promise<void>;
} => {
  const utils = trpc.useUtils();

  const {
    data: chats = [],
    isLoading: loadingChats,
    refetch: refetchChats,
  } = trpc.admin.listSupportChats.useQuery(
    {
      type: chatType,
      status: showClosed ? undefined : ChatStatus.OPEN,
      search: debouncedSearch || undefined,
      includeId: selectedChatId ?? undefined,
    },
    {
      placeholderData: (previousData) => previousData,
    },
  );

  const { data: messagesData, isLoading: loadingMessages } = trpc.admin.getChatMessages.useQuery(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    { chatId: selectedChatId! },
    {
      enabled: typeof selectedChatId === 'string' && selectedChatId !== '',
      // TODO:
      //   - Refetch perodically or rely on invalidation?
    },
  );

  const { mutate: markChatAsRead } = trpc.admin.markChatAsRead.useMutation({
    onMutate({ chatId }) {
      utils.admin.listSupportChats.setData(
        {
          type: chatType,
          status: showClosed ? undefined : ChatStatus.OPEN,
          search: debouncedSearch || undefined,
          includeId: selectedChatId ?? undefined,
        },
        (oldChats?: ChatWithMessagePreview[]) => {
          if (!oldChats) return [];
          return oldChats.map((chat) => (chat.id === chatId ? { ...chat, unreadCount: 0 } : chat));
        },
      );
    },
    onSettled() {
      utils.admin.listSupportChats.invalidate().catch(console.error);
    },
  });

  const selectedChat = chats.find((c) => c.id === selectedChatId);
  const hasUnread = selectedChat ? selectedChat.unreadCount > 0 : false;

  useEffect(() => {
    if (selectedChatId && hasUnread) {
      markChatAsRead({ chatId: selectedChatId });
    }
  }, [selectedChatId, hasUnread, markChatAsRead]);

  const sendMessageMutation = trpc.admin.postAdminMessage.useMutation({
    async onMutate({ chatId, content, type, uuid }) {
      await utils.admin.getChatMessages.cancel({ chatId });

      const previousMessages = utils.admin.getChatMessages.getData({ chatId });
      const currentUserId = previousMessages?.currentUserId ?? 'current-admin-user';

      const optimisticMessage = {
        id: uuid ?? generateMessageId(),
        createdAt: new Date(),
        messagePayload: type === MessageType.IMAGE_MSG ? { url: content } : { text: content },
        senderId: currentUserId,
        senderName: locale === 'de' ? 'Du (Admin)' : 'You (Admin)',
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

      return { previousMessages, optimisticMessageId: optimisticMessage.id };
    },
    onError: (_error, { chatId }, context) => {
      if (context?.previousMessages) {
        utils.admin.getChatMessages.setData({ chatId }, context.previousMessages);
      }
    },
    onSuccess: (createdMessage, { chatId, content, type }, context) => {
      utils.admin.getChatMessages.setData({ chatId }, (old) => {
        if (!old) return old;

        const storedMessage = {
          id: createdMessage.uuid,
          createdAt: createdMessage.createdAt,
          messagePayload: type === MessageType.IMAGE_MSG ? { url: content } : { text: content },
          senderId: createdMessage.senderId ?? 'current-admin-user',
          senderName: locale === 'de' ? 'Du (Admin)' : 'You (Admin)',
          type: type ?? MessageType.TEXT_MSG,
          status: MessageEventType.STORED,
          isAdminMessage: true,
        };

        // The panel now sends the message id along, so the optimistic entry already carries
        // the stored id. Matching and de-duplicating in one pass keeps a plain "is the
        // stored id present?" check from mistaking that entry for an already merged copy
        // and dropping the admin's own message.
        return {
          ...old,
          messages: mergeStoredMessage(
            old.messages,
            storedMessage,
            (context as { optimisticMessageId?: string } | undefined)?.optimisticMessageId,
          ),
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

  const selectedChatIdReference = useRef(selectedChatId);
  useEffect(() => {
    selectedChatIdReference.current = selectedChatId;
  }, [selectedChatId]);

  const currentUserIdReference = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (messagesData?.currentUserId !== undefined) {
      currentUserIdReference.current = messagesData.currentUserId;
    }
  }, [messagesData?.currentUserId]);

  // Audio can only start after a user gesture; unlock the AudioContext on the
  // first interaction so alert/message tones can play later.
  useEffect(() => unlockNotificationSounds(), []);

  const chatTypeReference = useRef(chatType);
  useEffect(() => {
    chatTypeReference.current = chatType;
  }, [chatType]);

  // Timestamp of the last message sent from THIS admin panel session. Used to
  // tell the admin's own sends (no tone) apart from messages the same user
  // account sent elsewhere, e.g. from the app on another device (tone).
  const recentLocalMessageIdsReference = useRef<Set<string>>(new Set());

  const handleRealtimeMessage = useCallback(
    (event: MessageEvent): void => {
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
        const currentSelectedChatId = selectedChatIdReference.current;
        if (
          currentSelectedChatId &&
          chatEvent.chatId === currentSelectedChatId &&
          chatEvent.type !== 'chat_read_by_admin'
        ) {
          void utils.admin.getChatMessages.invalidate({ chatId: currentSelectedChatId });
        }

        // Audible feedback: a new emergency alert rings loudly in the emergency
        // management view; a new message in the currently open chat plays a soft
        // tone (its push notification is suppressed because this chat is open).
        const isOwnRecentPanelSend =
          chatEvent.message?.id && recentLocalMessageIdsReference.current.has(chatEvent.message.id);
        if (
          chatTypeReference.current === ChatType.EMERGENCY &&
          isEmergencyAlertCreationEvent(chatEvent)
        ) {
          playAlertRingTone();
        } else if (
          chatEvent.type === 'new_message' &&
          chatEvent.chatId === currentSelectedChatId &&
          !isOwnRecentPanelSend &&
          chatEvent.senderId !== SYSTEM_SENDER_ID &&
          document.visibilityState === 'visible'
        ) {
          playMessageTone();
        }
      } catch (error) {
        console.error('[Admin SSE] Failed to parse real-time event:', error);
      }
    },
    [utils],
  );

  // Whatever was published while the stream was down is not replayed, so a
  // reconnect has to be followed by a refetch or the panel silently stays stale.
  const handleRealtimeResync = useCallback((): void => {
    void utils.admin.listSupportChats.invalidate();
    const currentSelectedChatId = selectedChatIdReference.current;
    if (currentSelectedChatId !== undefined && currentSelectedChatId !== null) {
      void utils.admin.getChatMessages.invalidate({ chatId: currentSelectedChatId });
    }
  }, [utils]);

  const {
    status: realtimeStatus,
    lastSignalAt,
    reconnect: reconnectRealtime,
  } = useAdminRealtimeConnection({
    url: '/api/chat/sse?chatIds=all',
    onEvent: handleRealtimeMessage,
    onResync: handleRealtimeResync,
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
    messages: messagesData?.messages ?? [], // Ensure type compatibility if needed
    currentUserId: messagesData?.currentUserId,
    loadingChats,
    loadingMessages,
    sending: sendMessageMutation.isPending,
    isClosing: closeChatMutation.isPending,
    isReopening: reopenChatMutation.isPending,
    realtimeStatus,
    lastSignalAt,
    reconnectRealtime: (): void => {
      reconnectRealtime();
      handleRealtimeResync();
    },
    fetchChats: async (): Promise<void> => {
      await refetchChats();
    },
    sendMessage: async (content: string, type?: MessageType): Promise<void> => {
      if (!selectedChatId) return;
      const messageId = generateMessageId();
      if (recentLocalMessageIdsReference.current.size > 100) {
        recentLocalMessageIdsReference.current.clear();
      }
      recentLocalMessageIdsReference.current.add(messageId);
      await sendMessageMutation.mutateAsync({
        chatId: selectedChatId,
        content,
        type,
        uuid: messageId,
      });
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
