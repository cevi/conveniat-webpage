import type { BillSetting, RegistrationManagement } from '@/features/payload-cms/payload-types';

export interface SettingsPort {
  getBillSettings(): Promise<BillSetting>;
  getRegistrationManagement(): Promise<RegistrationManagement>;
  updateBillSettingsEvents(
    events: Array<{ eventId: string; eventName: string; groupId: string }>,
  ): Promise<void>;
}
