import { assertChatMember } from '@/features/chat/api/checks/assert-chat-member';
import { Ability } from '@/lib/ability';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { createChatImageUploadUrl } from '@/lib/chat-image-upload';
import { chatImageUploadInputSchema } from '@/lib/chat-images';
import { trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';

export const getUploadUrl = trpcBaseProcedure
  .input(chatImageUploadInputSchema)
  .mutation(async ({ input, ctx }) => {
    await assertChatMember(ctx.prisma, ctx.user.uuid, input.chatId);

    const canUpload = await Ability.can(
      CapabilityAction.Upload,
      CapabilitySubject.Images,
      input.chatId,
    );
    if (!canUpload) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Image uploading is not enabled in this chat.',
      });
    }

    return createChatImageUploadUrl(input);
  });
