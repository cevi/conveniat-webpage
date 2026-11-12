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
  type CapabilityChat,
  type CapabilityContext,
  CapabilitySubject,
} from '@/lib/capabilities/types';
import { isChatArchived } from '@/lib/chat-shared';
import { ChatCapability, ChatStatus } from '@/lib/prisma/enums';
import { readFeatureFlag } from '@/lib/read-feature-flags';

/**
 * The chat a check decides on: the one the caller handed in, or else read once. Undefined
 * when there is no chat id or no such chat.
 */
const loadChat = async ({
  prisma,
  chatId,
  chat,
}: CapabilityContext): Promise<CapabilityChat | undefined> => {
  if (chat !== undefined) return chat ?? undefined;
  if (chatId === undefined) return undefined;
  const row = await prisma.chat.findUnique({
    where: { uuid: chatId },
    select: { capabilities: true, status: true, archivedAt: true },
  });
  return row ?? undefined;
};

/**
 * Handles capabilities related to sending messages. Who may read a chat is a membership
 * question, which the chat procedures answer themselves; capabilities know no user.
 */
export class MessageCapabilities implements Capability {
  readonly subject = CapabilitySubject.Messages;

  async can(action: CapabilityAction, context: CapabilityContext): Promise<boolean> {
    if (action === CapabilityAction.Send) {
      return this.canSend(context);
    }
    return false;
  }

  private async canSend(context: CapabilityContext): Promise<boolean> {
    const isGlobalEnabled = await readFeatureFlag('globalMessagingEnabled');

    if (!isGlobalEnabled) {
      return false;
    }

    if (context.chatId) {
      const chat = await loadChat(context);

      if (chat) {
        // Archiving only sets `archivedAt` and leaves the status alone, so both are checked.
        if (chat.status === ChatStatus.CLOSED || isChatArchived(chat)) {
          return false;
        }
        if (!chat.capabilities.includes(ChatCapability.CAN_SEND_MESSAGES)) {
          return false;
        }
      }
    }

    return true;
  }
}

/**
 * Handles capabilities related to media/image uploads.
 */
export class MediaCapabilities implements Capability {
  readonly subject = CapabilitySubject.Images;

  async can(action: CapabilityAction, context: CapabilityContext): Promise<boolean> {
    if (action === CapabilityAction.Upload) {
      return this.canUpload(context);
    }
    return false;
  }

  private async canUpload(context: CapabilityContext): Promise<boolean> {
    if (context.chatId === undefined) {
      return false;
    }

    const chat = await loadChat(context);
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
    const isCreateChatsEnabled = await readFeatureFlag('createChatsEnabled');
    return isCreateChatsEnabled;
  }
}

/**
 * Handles capabilities related to creating threads.
 */
export class ThreadCapabilities implements Capability {
  readonly subject = CapabilitySubject.Threads;

  async can(action: CapabilityAction, context: CapabilityContext): Promise<boolean> {
    if (action === CapabilityAction.Create) {
      return this.canCreate(context);
    }
    return false;
  }

  private async canCreate(context: CapabilityContext): Promise<boolean> {
    if (context.chatId === undefined) {
      return false;
    }

    const chat = await loadChat(context);

    // Enabled by default if chat exists and THREADS in capabilities
    return chat?.capabilities.includes(ChatCapability.THREADS) ?? true;
  }
}
