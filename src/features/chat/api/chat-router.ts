import { archiveChat } from '@/features/chat/api/mutations/archive-chat';
import { create } from '@/features/chat/api/mutations/create';
import { sendMessage } from '@/features/chat/api/mutations/message';
import { messageStatus } from '@/features/chat/api/mutations/message-status';
import { onlinePing } from '@/features/chat/api/mutations/online-ping';
import { renameChat } from '@/features/chat/api/mutations/rename-chat';
import { chatDetails, chats } from '@/features/chat/api/queries/chat';
import { contacts } from '@/features/chat/api/queries/contacts';
import { userProcedure } from '@/features/chat/api/queries/userProcedure';
import { createTRPCRouter } from '@/trpc/init';

export const chatRouter = createTRPCRouter({
  archiveChat,
  messageStatus,
  createChat: create,
  user: userProcedure,
  contacts,
  onlinePing,
  renameChat,
  chats,
  chatDetails,
  sendMessage,
});
