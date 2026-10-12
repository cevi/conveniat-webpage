import {
  ChatCreationCapabilities,
  MediaCapabilities,
  MessageCapabilities,
  ThreadCapabilities,
} from '@/lib/capabilities/definitions/chat-capabilities';
import type { CapabilitiesMap, Capability, CapabilitySubject } from '@/lib/capabilities/types';
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
): Promise<boolean> => {
  const capability = capabilities.find((c) => c.subject === subject);
  if (!capability) {
    console.warn(`No capability definition found for subject: ${subject}`);
    return false;
  }
  return capability.can(action, chatId ? { prisma, chatId } : { prisma });
};
