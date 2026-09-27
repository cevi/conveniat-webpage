export { CHAT_PAGE_SIZE } from '@/lib/chat-shared';

/** How long a QR code shown to start a chat stays scannable, see `createChatInvite`. */
export const CHAT_INVITE_LIFETIME_MS = 15 * 60 * 1000;

/** How often an open QR dialog swaps in a new code, comfortably before the shown one expires. */
export const CHAT_INVITE_REFRESH_MS = 10 * 60 * 1000;
