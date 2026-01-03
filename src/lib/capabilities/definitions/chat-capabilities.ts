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
import { ChatCapability, ChatStatus } from '@/lib/chat-shared';
import prisma from '@/lib/database';
import { FEATURE_FLAG_CREATE_CHATS_ENABLED, FEATURE_FLAG_SEND_MESSAGES } from '@/lib/feature-flags';
import { ChatType } from '@/lib/prisma';
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

    if (chatId) {
      const chat = await prisma.chat.findUnique({
        where: { uuid: chatId },
        select: { capabilities: true, type: true, status: true },
      });

      if (chat && (chat.type === ChatType.EMERGENCY || chat.type === ChatType.SUPPORT_GROUP)) {
        // if it is an emergency, allow messages as long as the chat is "open".
        return (
          (chat.status as ChatStatus) === ChatStatus.OPEN &&
          chat.capabilities.includes(ChatCapability.CAN_SEND_MESSAGES)
        );
      }

      if (chat && !chat.capabilities.includes(ChatCapability.CAN_SEND_MESSAGES)) {
        return isGlobalEnabled;
      }
    }

    return isGlobalEnabled;
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

    const chat = await prisma.chat.findUnique({
      where: { uuid: chatId },
      select: { capabilities: true },
    });

    return chat?.capabilities.includes(ChatCapability.PICTURE_UPLOAD) ?? false;
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

    const chat = await prisma.chat.findUnique({
      where: { uuid: chatId },
      select: { capabilities: true },
    });

    // Enabled by default if chat exists and THREADS in capabilities
    return chat?.capabilities.includes(ChatCapability.THREADS) ?? true;
  }
}
