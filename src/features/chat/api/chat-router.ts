import { addParticipants } from '@/features/chat/api/mutations/add-participants';
import { archiveChat } from '@/features/chat/api/mutations/archive-chat';
import { createChat } from '@/features/chat/api/mutations/create-chat';
import { createMessage } from '@/features/chat/api/mutations/create-message';
import { createMessageStatus } from '@/features/chat/api/mutations/create-message-status';
import { getUploadUrl } from '@/features/chat/api/mutations/get-upload-url';
import { onlinePing } from '@/features/chat/api/mutations/online-ping';
import { removeParticipant } from '@/features/chat/api/mutations/remove-participant';
import { renameChat } from '@/features/chat/api/mutations/rename-chat';
import { reportProblem } from '@/features/chat/api/mutations/report-problem';
import { updateMessageContent } from '@/features/chat/api/mutations/update-message-content';
import { getChat } from '@/features/chat/api/queries/get-chat';
import { getChatMessages } from '@/features/chat/api/queries/get-chat-messages';
import { getDownloadUrl } from '@/features/chat/api/queries/get-download-url';
import { getFeatureFlags } from '@/features/chat/api/queries/get-feature-flags';
import { getMessage } from '@/features/chat/api/queries/get-message';
import { getUser } from '@/features/chat/api/queries/get-user';
import { listChats } from '@/features/chat/api/queries/list-chats';
import { listContacts } from '@/features/chat/api/queries/list-contacts';
import { checkCapability } from '@/lib/capabilities';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { z } from 'zod';

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
  getMessage: getMessage,
  updateMessageContent: updateMessageContent,
  reportProblem: reportProblem,
  getUploadUrl: getUploadUrl,
  getDownloadUrl: getDownloadUrl,
  addParticipants: addParticipants,
  removeParticipant: removeParticipant,
  getFeatureFlags: getFeatureFlags,
  checkCapability: trpcBaseProcedure
    .input(
      z.object({
        subject: z.nativeEnum(CapabilitySubject),
        action: z.nativeEnum(CapabilityAction),
        chatId: z.string().optional(),
      }),
    )
    .query(async ({ input }): Promise<boolean> => {
      return checkCapability(input.action, input.subject, input.chatId);
    }),
});
