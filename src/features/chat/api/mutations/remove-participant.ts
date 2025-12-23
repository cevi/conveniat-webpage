import { isUserMemberOfChat } from '@/features/chat/api/checks/is-user-member-of-chat';
import { findChatByUuid } from '@/features/chat/api/database-interactions/find-chat-by-uuid';
import { ChatMembershipPermission } from '@/lib/prisma';
import { trpcBaseProcedure } from '@/trpc/init';
import { databaseTransactionWrapper } from '@/trpc/middleware/database-transaction-wrapper';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const removeParticipantSchema = z.object({
    chatId: z.string(),
    participantId: z.string(),
});

export const removeParticipant = trpcBaseProcedure
    .input(removeParticipantSchema)
    .use(databaseTransactionWrapper)
    .mutation(async ({ input, ctx }) => {
        const { prisma, user } = ctx;
        const { chatId, participantId } = input;

        const chat = await findChatByUuid(chatId, prisma);

        // Validate that the user is a member of the chat
        if (!isUserMemberOfChat(user, chat.chatMemberships)) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'You are not a member of this chat.',
            });
        }

        // check if user is ADMIN or OWNER of the chat
        const userMembership = chat.chatMemberships.find(
            (membership) => membership.userId === user.uuid,
        );

        const permissionsWhichAllowRemoving: ChatMembershipPermission[] = [
            ChatMembershipPermission.OWNER,
            ChatMembershipPermission.ADMIN,
        ];

        if (!userMembership || !permissionsWhichAllowRemoving.includes(userMembership.chatPermission)) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'You do not have permission to remove participants from this chat.',
            });
        }

        // Check if the target participant exists in the chat
        const targetMember = chat.chatMemberships.find((m) => m.userId === participantId);
        if (!targetMember) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'User is not a member of this chat.',
            });
        }

        // Cannot remove the chat owner
        if (targetMember.chatPermission === ChatMembershipPermission.OWNER) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'Cannot remove the chat owner.',
            });
        }

        await prisma.chatMembership.delete({
            where: {
                userId_chatId: {
                    chatId: chat.uuid,
                    userId: participantId,
                }
            }
        });

        return { success: true };
    });
