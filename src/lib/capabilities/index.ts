import {
  ChatCreationCapabilities,
  MediaCapabilities,
  MessageCapabilities,
  ThreadCapabilities,
} from '@/lib/capabilities/definitions/chat-capabilities';
import type {
  CapabilitiesMap,
  Capability,
  CapabilityChat,
  CapabilitySubject,
} from '@/lib/capabilities/types';
import type { PrismaClientOrTransaction } from '@/types/types';
import { createLogger } from '@/utils/server-logger';

const logger = createLogger('chat:capabilities');

const capabilities: Capability[] = [
  new MessageCapabilities(),
  new MediaCapabilities(),
  new ChatCreationCapabilities(),
  new ThreadCapabilities(),
];

/**
 * Whether `action` is allowed on `subject`, globally and, given a `chatId`, in that chat.
 * Reads through `prisma`, so a caller inside a transaction passes its transaction client. A
 * caller that already loaded the chat passes it as `chat` (`null` when it does not exist),
 * and the check does not read it again; without a `chatId` it is ignored.
 */
export const checkCapability = async <S extends CapabilitySubject>(
  prisma: PrismaClientOrTransaction,
  action: CapabilitiesMap[S],
  subject: S,
  chatId?: string,
  chat?: CapabilityChat | null,
): Promise<boolean> => {
  const capability = capabilities.find((c) => c.subject === subject);
  if (!capability) {
    logger.error('No capability definition found for subject', { 'capability.subject': subject });
    return false;
  }
  if (!chatId) return capability.can(action, { prisma });
  return capability.can(action, chat === undefined ? { prisma, chatId } : { prisma, chatId, chat });
};
