import { checkCapability } from '@/lib/capabilities';
import type { CapabilitiesMap, CapabilityChat, CapabilitySubject } from '@/lib/capabilities/types';
import type { PrismaClientOrTransaction } from '@/types/types';

export const Ability = {
  /**
   * Check if an action is allowed on a subject. Reads through the given client, so a caller
   * inside a transaction passes its transaction client, and a caller that already loaded the
   * chat passes it as `chat` (`null` when it does not exist), so the check does not read it
   * again.
   */
  async can<S extends CapabilitySubject>(
    prisma: PrismaClientOrTransaction,
    action: CapabilitiesMap[S],
    subject: S,
    chatId?: string,
    chat?: CapabilityChat | null,
  ): Promise<boolean> {
    return checkCapability(prisma, action, subject, chatId, chat);
  },
};
