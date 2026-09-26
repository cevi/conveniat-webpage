import type { HofSyncWrite, SettingsPort } from '@/features/billing/ports/settings.port';
import { flattenHofEvents } from '@/features/billing/services/hof-events';
import type { HofEventRow } from '@/features/billing/types';
import type {
  BillSetting,
  Hof,
  RegistrationManagement,
} from '@/features/payload-cms/payload-types';
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

  async getHoefe(): Promise<Hof[]> {
    const { docs } = await this.payload.find({
      collection: 'hoefe',
      pagination: false,
      depth: 0,
      sort: 'name',
      context: { internal: true },
    });
    return docs;
  }

  async getHofEvents(): Promise<HofEventRow[]> {
    return flattenHofEvents(await this.getHoefe());
  }

  async upsertHoefe(hoefe: HofSyncWrite[]): Promise<void> {
    for (const hof of hoefe) {
      const syncedFields = {
        events: hof.events,
        ...(hof.addressManagerEmails === undefined
          ? {}
          : { addressManagerEmails: hof.addressManagerEmails }),
      };

      const { docs } = await this.payload.find({
        collection: 'hoefe',
        where: { groupId: { equals: hof.groupId } },
        limit: 1,
        depth: 0,
        context: { internal: true },
      });
      const existing = docs[0];

      await (existing === undefined
        ? this.payload.create({
            collection: 'hoefe',
            data: { name: hof.name, groupId: hof.groupId, ...syncedFields },
            context: { internal: true },
          })
        : this.payload.update({
            collection: 'hoefe',
            id: existing.id,
            data: syncedFields,
            context: { internal: true },
          }));
    }
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
