'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import type React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface ChatScrollManagerProperties {
  sortedMessages: ChatMessage[];
  isFetchingNextPage: boolean;
  currentUserId: string | undefined;
}

const AT_BOTTOM_THRESHOLD_PX = 100;

/**
 * Keeps the message list anchored: pinned to the bottom while the reader is there, left alone
 * while they read history, and steady when an older page is prepended above them.
 *
 * Messages that arrive while the reader is scrolled up are counted instead of scrolled to, so
 * the list can offer a "new messages" jump without yanking the text they are reading.
 */
export const useChatScrollManager = ({
  sortedMessages,
  isFetchingNextPage,
  currentUserId,
}: ChatScrollManagerProperties): {
  scrollContainerReference: React.RefObject<HTMLDivElement | null>;
  messagesEndReference: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  isAtBottom: boolean;
  unseenCount: number;
  scrollToBottom: () => void;
} => {
  const scrollContainerReference = useRef<HTMLDivElement>(null);
  const messagesEndReference = useRef<HTMLDivElement>(null);
  const hasScrolledReference = useRef(false);
  const isAtBottomReference = useRef(true);
  const previousScrollHeightReference = useRef<number>(0);
  const previousFirstIdReference = useRef<string | undefined>(undefined);
  const previousLastIdReference = useRef<string | undefined>(undefined);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);

  const handleScroll = (): void => {
    const container = scrollContainerReference.current;
    if (!container) return;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      AT_BOTTOM_THRESHOLD_PX;
    isAtBottomReference.current = atBottom;
    setIsAtBottom(atBottom);
    if (atBottom) setUnseenCount(0);
  };

  const scrollToBottom = useCallback((): void => {
    messagesEndReference.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Keep the reader's place when an older page is prepended. Only a changed first message
  // means a prepend: compensating for an appended one would push the view down by its height.
  useLayoutEffect(() => {
    const container = scrollContainerReference.current;
    if (!container) return;

    const firstId = sortedMessages[0]?.id;
    const wasPrepended =
      previousFirstIdReference.current !== undefined &&
      firstId !== previousFirstIdReference.current;
    if (wasPrepended && previousScrollHeightReference.current > 0) {
      const heightDifference = container.scrollHeight - previousScrollHeightReference.current;
      if (heightDifference > 0) container.scrollTop += heightDifference;
    }

    previousScrollHeightReference.current = container.scrollHeight;
    previousFirstIdReference.current = firstId;
  }, [sortedMessages, isFetchingNextPage]);

  // Initial scroll to bottom, follow new messages while at the bottom, count them otherwise
  useEffect(() => {
    if (sortedMessages.length === 0) return;

    const previousLastId = previousLastIdReference.current;
    previousLastIdReference.current = sortedMessages.at(-1)?.id;

    if (!hasScrolledReference.current || isAtBottomReference.current) {
      messagesEndReference.current?.scrollIntoView({ behavior: 'instant' });
      hasScrolledReference.current = true;
      return;
    }

    const previousLastIndex = sortedMessages.findIndex((m) => m.id === previousLastId);
    if (previousLastIndex === -1) return;
    const appended = sortedMessages.slice(previousLastIndex + 1);
    if (appended.length === 0) return;

    // the reader's own send takes them to it, wherever they were
    if (appended.some((m) => m.senderId === currentUserId)) {
      messagesEndReference.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setUnseenCount((count) => count + appended.length);
  }, [sortedMessages, currentUserId]);

  // Handle container resize (e.g. when text input grows or keyboard appears)
  useEffect(() => {
    const container = scrollContainerReference.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isAtBottomReference.current) {
        messagesEndReference.current?.scrollIntoView({ behavior: 'instant' });
      }
    });

    resizeObserver.observe(container);
    return (): void => {
      resizeObserver.disconnect();
    };
  }, []);

  return {
    scrollContainerReference,
    messagesEndReference,
    handleScroll,
    isAtBottom,
    unseenCount,
    scrollToBottom,
  };
};
