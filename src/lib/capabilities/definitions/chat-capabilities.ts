/**
 * Chat-related Capabilities
 *
 * This file contains all capability definitions related to the chat feature.
 * Each class handles a specific subject (Messages, Images, Chat) within the chat domain.
 *
 * Future non-chat capabilities (e.g., for other features) should be defined in separate files.
 */
import {
  type Capability,
  CapabilityAction,
  type CapabilityContext,
  CapabilitySubject,
} from '@/lib/capabilities/types';
import { CHAT_CAPABILITY_CAN_SEND_MESSAGES, ChatCapability } from '@/lib/chat-shared';
import prisma from '@/lib/database';
import { FEATURE_FLAG_CREATE_CHATS_ENABLED, FEATURE_FLAG_SEND_MESSAGES } from '@/lib/feature-flags';
import { getFeatureFlag } from '@/lib/redis';

/**
 * Handles capabilities related to sending and viewing messages.
 */
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

/**
 * Handles capabilities related to media/image uploads.
 */
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

/**
 * Handles capabilities related to chat creation.
 */
export class ChatCreationCapabilities implements Capability {
  readonly subject = CapabilitySubject.Chat;

  async can(action: CapabilityAction): Promise<boolean> {
    if (action === CapabilityAction.Create) {
      return this.canCreate();
    }
    return false;
  }

  private async canCreate(): Promise<boolean> {
    const isCreateChatsEnabled = await getFeatureFlag(FEATURE_FLAG_CREATE_CHATS_ENABLED, true);
    return isCreateChatsEnabled;
  }
}

/**
 * Handles capabilities related to creating threads.
 */
export class ThreadCapabilities implements Capability {
  readonly subject = CapabilitySubject.Threads;

  async can(action: CapabilityAction, context?: CapabilityContext): Promise<boolean> {
    if (action === CapabilityAction.Create) {
      return this.canCreate(context?.chatId);
    }
    return false;
  }

  private async canCreate(chatId?: string): Promise<boolean> {
    if (chatId === undefined) {
      return false;
    }

    const capability = await prisma.chatCapability.findUnique({
      where: {
        chatId_capability: {
          chatId,
          capability: ChatCapability.THREADS,
        },
      },
    });

    // Enabled by default if no record exists
    return capability?.isEnabled ?? true;
  }
}
