'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { useEffect, useLayoutEffect, useRef } from 'react';

interface ChatScrollManagerProperties {
  sortedMessages: ChatMessage[];
  isFetchingNextPage: boolean;
}

export const useChatScrollManager = ({
  sortedMessages,
  isFetchingNextPage,
}: ChatScrollManagerProperties): {
  scrollContainerReference: React.RefObject<HTMLDivElement | null>;
  messagesEndReference: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  isAtBottomReference: React.RefObject<boolean>;
} => {
  const scrollContainerReference = useRef<HTMLDivElement>(null);
  const messagesEndReference = useRef<HTMLDivElement>(null);
  const hasScrolledReference = useRef(false);
  const isAtBottomReference = useRef(true);
  const previousScrollHeightReference = useRef<number>(0);
  const previousMessageCountReference = useRef<number>(0);

  // Track scroll position to know if user is at bottom
  const handleScroll = (): void => {
    const container = scrollContainerReference.current;
    if (container) {
      const threshold = 100; // pixels from bottom to consider "at bottom"
      isAtBottomReference.current =
        container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    }
  };

  // Maintain scroll position when loading older messages
  useLayoutEffect(() => {
    const container = scrollContainerReference.current;
    if (!container) return;

    const currentMessageCount = sortedMessages.length;

    if (
      previousScrollHeightReference.current > 0 &&
      currentMessageCount > previousMessageCountReference.current
    ) {
      const newScrollHeight = container.scrollHeight;
      const heightDifference = newScrollHeight - previousScrollHeightReference.current;

      if (heightDifference > 0) {
        container.scrollTop += heightDifference;
      }
    }

    previousScrollHeightReference.current = container.scrollHeight;
    previousMessageCountReference.current = currentMessageCount;
  }, [sortedMessages, isFetchingNextPage]);

  // Initial scroll to bottom and scroll on new messages
  useEffect(() => {
    if (
      sortedMessages.length > 0 &&
      (!hasScrolledReference.current || isAtBottomReference.current)
    ) {
      messagesEndReference.current?.scrollIntoView({ behavior: 'instant' });
      hasScrolledReference.current = true;
    }
  }, [sortedMessages]);

  return {
    scrollContainerReference,
    messagesEndReference,
    handleScroll,
    isAtBottomReference,
  };
};
