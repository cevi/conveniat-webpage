import {
  CHAT_OVERSIGHT_ROLES,
  hasAccessToThisUser,
  SUPPORT_DESK_ROLES,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { ChatType, type PrismaClient } from '@/lib/prisma/client';

/** The session user, as far as the roles need it. */
interface SessionUser {
  group_ids?: number[];
}

/** The chats the support desk works on: what a participant sent to the camp, not to each other. */
export const SUPPORT_DESK_CHAT_TYPES: ChatType[] = [ChatType.SUPPORT_GROUP, ChatType.EMERGENCY];

/** Whether the user may read and manage every chat, see `CHAT_OVERSIGHT_ROLES`. */
export const canOverseeAllChats = (user: SessionUser): boolean =>
  hasAccessToThisUser({ user, requiredRoles: CHAT_OVERSIGHT_ROLES });

/** Whether the user runs the support desk, see `SUPPORT_DESK_ROLES`. */
export const canRunSupportDesk = (user: SessionUser): boolean =>
  hasAccessToThisUser({ user, requiredRoles: SUPPORT_DESK_ROLES });

/**
 * Whether the user may read and manage a chat of this type without being a member of it: the
 * support desk its own chat types, the chat oversight all of them.
 */
export const canManageChatOfType = (user: SessionUser, type: ChatType): boolean =>
  canOverseeAllChats(user) || (canRunSupportDesk(user) && SUPPORT_DESK_CHAT_TYPES.includes(type));

/** A chat never changes its type, so the answer for a chat that exists holds for good. */
const supportDeskChatCache = new Map<string, boolean>();
const SUPPORT_DESK_CHAT_CACHE_LIMIT = 10_000;

/**
 * Whether the chat is one the support desk works on. Asked for every event on the realtime
 * `all` channel, hence the cache; a chat that does not exist is not one, and is asked again.
 */
export const isSupportDeskChat = async (
  prisma: Pick<PrismaClient, 'chat'>,
  chatId: string,
): Promise<boolean> => {
  const cached = supportDeskChatCache.get(chatId);
  if (cached !== undefined) return cached;

  const chat = await prisma.chat.findUnique({ where: { uuid: chatId }, select: { type: true } });
  if (!chat) return false;

  const isSupportDesk = SUPPORT_DESK_CHAT_TYPES.includes(chat.type);
  if (supportDeskChatCache.size >= SUPPORT_DESK_CHAT_CACHE_LIMIT) supportDeskChatCache.clear();
  supportDeskChatCache.set(chatId, isSupportDesk);
  return isSupportDesk;
};

/**
 * Whether the user may read and manage this chat without being a member of it, see
 * `canManageChatOfType`. A participant is answered without a query.
 */
export const canManageChat = async (
  prisma: Pick<PrismaClient, 'chat'>,
  user: SessionUser,
  chatId: string,
): Promise<boolean> => {
  if (canOverseeAllChats(user)) return true;
  if (!canRunSupportDesk(user)) return false;
  return isSupportDeskChat(prisma, chatId);
};
