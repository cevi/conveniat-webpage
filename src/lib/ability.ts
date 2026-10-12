import { checkCapability } from '@/lib/capabilities';
import type { CapabilitiesMap, CapabilitySubject } from '@/lib/capabilities/types';
import type { PrismaClientOrTransaction } from '@/types/types';

export const Ability = {
  /**
   * Check if an action is allowed on a subject. Reads through the given client, so a caller
   * inside a transaction passes its transaction client.
   */
  async can<S extends CapabilitySubject>(
    prisma: PrismaClientOrTransaction,
    action: CapabilitiesMap[S],
    subject: S,
    chatId?: string,
  ): Promise<boolean> {
    return checkCapability(prisma, action, subject, chatId);
  },
};
