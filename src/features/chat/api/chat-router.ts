import { archiveChat } from '@/features/chat/api/mutations/archive-chat';
import { createChat } from '@/features/chat/api/mutations/create-chat';
import { createMessage } from '@/features/chat/api/mutations/create-message';
import { createMessageStatus } from '@/features/chat/api/mutations/create-message-status';
import { onlinePing } from '@/features/chat/api/mutations/online-ping';
import { renameChat } from '@/features/chat/api/mutations/rename-chat';
import { updateMessageContent } from '@/features/chat/api/mutations/update-message-content';
import { getChat } from '@/features/chat/api/queries/get-chat';
import { getChatMessages } from '@/features/chat/api/queries/get-chat-messages';
import { getUser } from '@/features/chat/api/queries/get-user';
import { listChats } from '@/features/chat/api/queries/list-chats';
import { listContacts } from '@/features/chat/api/queries/list-contacts';
import { createTRPCRouter } from '@/trpc/init';

export const chatRouter = createTRPCRouter({
  archiveChat,
  messageStatus: createMessageStatus,
  createChat: createChat,
  user: getUser,
  contacts: listContacts,
  onlinePing,
  renameChat,
  chats: listChats,
  chatDetails: getChat,
  sendMessage: createMessage,
  infiniteMessages: getChatMessages,
  updateMessageContent: updateMessageContent,
});
