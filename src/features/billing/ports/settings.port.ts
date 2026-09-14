import type { BillSetting, RegistrationManagement } from '@/features/payload-cms/payload-types';

export interface SettingsPort {
  getBillSettings(): Promise<BillSetting>;
  getRegistrationManagement(): Promise<RegistrationManagement>;
  updateBillSettingsEvents(
    events: Array<{
      eventId: string;
      eventName: string;
      groupId: string;
      addressManagerEmails?: string | null;
      reminderRecipientsOverride?: string | null;
    }>,
  ): Promise<void>;
  updateNextReferenceNumber(nextReferenceNumber: number): Promise<void>;
}
