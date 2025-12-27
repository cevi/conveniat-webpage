import { checkCapability } from '@/lib/capabilities';
import type { CapabilitiesMap, CapabilitySubject } from '@/lib/capabilities/types';

export const Ability = {
  /**
   * Check if an action is allowed on a subject.
   */
  async can<S extends CapabilitySubject>(
    action: CapabilitiesMap[S],
    subject: S,
    chatId?: string,
  ): Promise<boolean> {
    return checkCapability(action, subject, chatId);
  },
};
