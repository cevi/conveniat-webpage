import { chatError } from '@/features/chat/api/chat-errors';
import { assertChatMember } from '@/features/chat/api/checks/assert-chat-member';
import { Ability } from '@/lib/ability';
import { CapabilityAction, CapabilitySubject } from '@/lib/capabilities/types';
import { createChatImageUploadUrl } from '@/lib/chat-image-upload';
import { chatImageUploadInputSchema } from '@/lib/chat-images';
import { trpcBaseProcedure } from '@/trpc/init';

export const getUploadUrl = trpcBaseProcedure
  .input(chatImageUploadInputSchema)
  .mutation(async ({ input, ctx }) => {
    await assertChatMember(ctx.prisma, ctx.user.uuid, input.chatId);

    const canUpload = await Ability.can(
      ctx.prisma,
      CapabilityAction.Upload,
      CapabilitySubject.Images,
      input.chatId,
    );
    if (!canUpload) {
      // a legitimate client asks this when its cached chat details are out of date
      throw chatError('FORBIDDEN', 'imagesDisabled');
    }

    return createChatImageUploadUrl(input);
  });
