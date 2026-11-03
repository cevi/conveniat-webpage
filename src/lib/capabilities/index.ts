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

const capabilities: Capability[] = [
  new MessageCapabilities(),
  new MediaCapabilities(),
  new ChatCreationCapabilities(),
  new ThreadCapabilities(),
];

export const checkCapability = async <S extends CapabilitySubject>(
  prisma: PrismaClientOrTransaction,
  action: CapabilitiesMap[S],
  subject: S,
  chatId?: string,
  chat?: CapabilityChat,
): Promise<boolean> => {
  const capability = capabilities.find((c) => c.subject === subject);
  if (!capability) {
    console.warn(`No capability definition found for subject: ${subject}`);
    return false;
  }
  if (!chatId) return capability.can(action, { prisma });
  return capability.can(action, chat ? { prisma, chatId, chat } : { prisma, chatId });
};
