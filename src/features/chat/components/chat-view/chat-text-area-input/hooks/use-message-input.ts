import { useAutoResizeTextarea } from '@/features/chat/components/chat-view/chat-text-area-input/hooks/use-auto-resize-textarea';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { getChatDraftKey, useChatDraft } from '@/features/chat/hooks/use-chat-draft';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { useTypingSignal } from '@/features/chat/hooks/use-typing';
import { generateMessageId } from '@/features/chat/utils';
import { isRateLimitError } from '@/features/chat/utils/send-errors';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { chatErrorTexts } from '@/lib/chat-error-texts';
import { featureFlags as flagDefinitions } from '@/lib/feature-flags';
import { useTRPC } from '@/trpc/client';
import { i18nConfig, type Locale } from '@/types/types';
import { errorReasonOf, userErrorMessage } from '@/utils/user-error-message';
import type React from 'react';
import { useCallback, useState } from 'react';

interface MessageInputProperties {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  ref: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
}

interface UseMessageInputLogicResult {
  textareaProps: MessageInputProperties;
  handleSendMessage: () => void;
  sendText: (text: string) => void;
  takeMessage: () => string;
  restoreMessage: (text: string) => void;
  /** fits the field's height to what it holds */
  resizeTextarea: () => void;
  isSendButtonDisabled: boolean;
  messageLength: number;
  isGlobalMessagingDisabled: boolean;
  sendError: string | undefined;
  reportSendRefusal: (error: unknown) => void;
}

import { useChatActions } from '@/features/chat/context/chat-actions-context';

import { useSearchParams } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';

/** How often a composer rechecks whether sending was switched back on. */
const DISABLED_MESSAGING_POLL_MS = 60_000;

const isGlobalMessagingEnabledIn = (
  featureFlags: { key: string; isEnabled: boolean }[] | undefined,
): boolean =>
  featureFlags?.find((f) => f.key === flagDefinitions.globalMessagingEnabled.key)?.isEnabled ??
  true;

export const useMessageInput = (): UseMessageInputLogicResult => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const searchParameters = useSearchParams();
  const [newMessage, setNewMessage] = useState(() => {
    const shareText = searchParameters.get('text');
    const shareTitle = searchParameters.get('title');
    const shareUrl = searchParameters.get('url');

    const parts = [shareTitle, shareText, shareUrl].filter(Boolean);
    return parts.length > 0 ? parts.join('\n') : '';
  });
  const [sendError, setSendError] = useState<string>();
  const chatId = useChatId();
  const sendMessageMutation = useMessageSend();
  const { textareaRef: messageInputReference, resize: resizeTextarea } =
    useAutoResizeTextarea(newMessage);
  const { activeThreadId, quotedMessageId, cancelQuote } = useChatActions();

  // fixed at mount: the main composer stays mounted under an open thread and must not
  // take over the draft of the thread composer on top of it
  const [draftKey] = useState(() => getChatDraftKey(chatId, activeThreadId));
  useChatDraft(draftKey, newMessage, setNewMessage);

  const queryClient = useQueryClient();
  // Fetched when a composer mounts and refetched by the realtime resync (`useChatSSE`),
  // which also covers the app coming back to the foreground. Polled only while sending is
  // off, the one state nothing else would bring the composer back from.
  const { data: featureFlags, isLoading: isLoadingFlags } = useQuery(
    trpc.chat.getFeatureFlags.queryOptions(undefined, {
      staleTime: 30_000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchInterval: (query) =>
        isGlobalMessagingEnabledIn(query.state.data) ? false : DISABLED_MESSAGING_POLL_MS,
    }),
  );

  const isGlobalMessagingEnabled = isGlobalMessagingEnabledIn(featureFlags);

  /**
   * Shows why the server refused a send, text or image, above the composer. Offline sends are
   * queued by useMessageSend, and any other failed bubble stays in the list with its own retry,
   * so only what retrying cannot help with is worth a banner, plus the rate limit, whose send
   * waits in the outbox.
   */
  const reportSendRefusal = useCallback(
    (error: unknown): void => {
      const reason = errorReasonOf(error)?.reason;
      // the server knew before the cached flags or capabilities did: update the composer
      if (reason === 'messagingDisabled') {
        queryClient.invalidateQueries(trpc.chat.getFeatureFlags.pathFilter()).catch(console.error);
      } else if (reason === 'imagesDisabled') {
        queryClient
          .invalidateQueries(trpc.chat.chatDetails.queryFilter({ chatId }))
          .catch(console.error);
      } else if (reason !== 'threadGone' && !isRateLimitError(error)) {
        return;
      }
      setSendError(userErrorMessage(error, locale, chatErrorTexts));
    },
    [chatId, locale, queryClient, trpc],
  );

  /** Sends `text` as a message, without touching the composer. */
  const sendText = useCallback(
    (text: string): void => {
      if (!isGlobalMessagingEnabled) return;
      // Clear any previous error
      setSendError(undefined);

      sendMessageMutation.mutate(
        {
          chatId: chatId,
          content: text,
          timestamp: new Date(),
          parentId: activeThreadId ?? undefined,
          quotedMessageId: quotedMessageId ?? undefined,
          // the client owns the message id so that a replay (offline outbox, lost
          // response) is recognised by the server instead of stored a second time
          messageId: generateMessageId(),
        },
        {
          onSuccess: () => {
            if (quotedMessageId) cancelQuote();

            // Clear shared query parameters from the URL
            if ('history' in globalThis && 'location' in globalThis) {
              const url = new globalThis.URL(globalThis.location.href);
              const hasText = url.searchParams.has('text');
              const hasTitle = url.searchParams.has('title');
              const hasUrl = url.searchParams.has('url');
              if (hasText || hasTitle || hasUrl) {
                url.searchParams.delete('text');
                url.searchParams.delete('title');
                url.searchParams.delete('url');
                globalThis.history.replaceState(
                  globalThis.history.state,
                  '',
                  url.pathname + url.search,
                );
              }
            }
          },
          onError: reportSendRefusal,
        },
      );
    },
    [
      chatId,
      sendMessageMutation,
      isGlobalMessagingEnabled,
      activeThreadId,
      quotedMessageId,
      cancelQuote,
      reportSendRefusal,
    ],
  );

  const handleSendMessage = useCallback((): void => {
    if (!isGlobalMessagingEnabled) return;
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage === '') return;
    // Optimistically clear the input
    setNewMessage('');
    resizeTextarea();
    sendText(trimmedMessage);
  }, [newMessage, isGlobalMessagingEnabled, resizeTextarea, sendText]);

  /** Empties the composer and returns what it held, for a send that has to wait. */
  const takeMessage = useCallback((): string => {
    const trimmedMessage = newMessage.trim();
    setNewMessage('');
    return trimmedMessage;
  }, [newMessage]);

  /** Puts taken text back, in front of anything typed in the meantime. */
  const restoreMessage = useCallback((text: string): void => {
    if (text === '') return;
    setNewMessage((current) => (current === '' ? text : `${text}\n${current}`));
  }, []);

  const signalTyping = useTypingSignal(chatId, activeThreadId);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setNewMessage(event.target.value);
      if (event.target.value.trim() !== '') signalTyping();
    },
    [signalTyping],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  const isSendButtonDisabled =
    newMessage.trim() === '' ||
    sendMessageMutation.isPending ||
    !isGlobalMessagingEnabled ||
    isLoadingFlags;

  return {
    textareaProps: {
      value: newMessage,
      onChange: handleInputChange,
      onKeyDown: handleKeyDown,
      ref: messageInputReference,
      disabled: !isGlobalMessagingEnabled,
    },
    handleSendMessage,
    sendText,
    takeMessage,
    restoreMessage,
    resizeTextarea,
    isSendButtonDisabled,
    messageLength: newMessage.length,
    isGlobalMessagingDisabled: !isGlobalMessagingEnabled,
    sendError,
    reportSendRefusal,
  };
};
