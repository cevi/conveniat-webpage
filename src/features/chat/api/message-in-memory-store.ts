import type { ChatDetail } from '@/features/chat/types/chat';

/**
 * This is a temporary in-memory store for chat messages.
 * We should replace this with a proper database or API call in the future.
 */
export const chatStore = new Map<number, ChatDetail[]>();
