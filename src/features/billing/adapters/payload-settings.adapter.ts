import type { SettingsPort } from '@/features/billing/ports/settings.port';
import type { BillSetting, RegistrationManagement } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

export class PayloadSettingsAdapter implements SettingsPort {
  constructor(private readonly payload: Payload) {}

  async getBillSettings(): Promise<BillSetting> {
    const settings = await this.payload.findGlobal({
      slug: 'bill-settings',
      context: { internal: true },
    });
    return settings;
  }

  async getRegistrationManagement(): Promise<RegistrationManagement> {
    const management = await this.payload.findGlobal({
      slug: 'registration-management',
      context: { internal: true },
    });
    return management;
  }

  async updateBillSettingsEvents(
    events: Array<{ eventId: string; eventName: string; groupId: string }>,
  ): Promise<void> {
    await this.payload.updateGlobal({
      slug: 'bill-settings',
      data: {
        events,
      },
    });
  }

  async updateNextReferenceNumber(nextReferenceNumber: number): Promise<void> {
    await this.payload.updateGlobal({
      slug: 'bill-settings',
      data: {
        nextReferenceNumber,
      },
    });
  }
}
