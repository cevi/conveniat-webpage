import {
  type Capability,
  CapabilityAction,
  type CapabilityContext,
  CapabilitySubject,
} from '@/lib/capabilities/types';
import prisma from '@/lib/database';
import { CHAT_CAPABILITY_CAN_SEND_MESSAGES } from '@/lib/chat-shared';
import { FEATURE_FLAG_SEND_MESSAGES } from '@/lib/feature-flags';
import { getFeatureFlag } from '@/lib/redis';

export class MessageCapabilities implements Capability {
  readonly subject = CapabilitySubject.Messages;

  async can(action: CapabilityAction, context?: CapabilityContext): Promise<boolean> {
    if (action === CapabilityAction.Send) {
      return this.canSend(context?.chatId);
    }
    if (action === CapabilityAction.View) {
      return this.canView(context?.chatId);
    }
    return false;
  }

  private async canSend(chatId?: string): Promise<boolean> {
    const isGlobalEnabled = await getFeatureFlag(FEATURE_FLAG_SEND_MESSAGES);
    if (!isGlobalEnabled) {
      return false;
    }

    if (chatId) {
      const capability = await prisma.chatCapability.findUnique({
        where: {
          chatId_capability: {
            chatId,
            capability: CHAT_CAPABILITY_CAN_SEND_MESSAGES,
          },
        },
      });

      if (capability && !capability.isEnabled) {
        return false;
      }
    }
    return true;
  }

  private canView(chatId?: string): Promise<boolean> {
    if (chatId === undefined) return Promise.resolve(false);
    // Membership checks are assumed to be handled by context/caller
    return Promise.resolve(true);
  }
}
