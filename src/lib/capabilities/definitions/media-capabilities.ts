import {
  type Capability,
  CapabilityAction,
  type CapabilityContext,
  CapabilitySubject,
} from '@/lib/capabilities/types';
import prisma from '@/lib/database';

export class MediaCapabilities implements Capability {
  readonly subject = CapabilitySubject.Images;

  async can(action: CapabilityAction, context?: CapabilityContext): Promise<boolean> {
    if (action === CapabilityAction.Upload) {
      return this.canUpload(context?.chatId);
    }
    return false;
  }

  private async canUpload(chatId?: string): Promise<boolean> {
    if (chatId === undefined) {
      return false;
    }

    const capability = await prisma.chatCapability.findUnique({
      where: {
        chatId_capability: {
          chatId,
          capability: 'PICTURE_UPLOAD',
        },
      },
    });

    return capability?.isEnabled ?? false;
  }
}
