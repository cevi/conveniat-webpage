import type {
  HofRemoval,
  HofSyncWrite,
  SettingsPort,
} from '@/features/billing/ports/settings.port';
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
      // the name too: a Hof is read-only in the admin panel, so the sync keeps it current
      const syncedFields = {
        name: hof.name,
        events: hof.events,
        ...(hof.addressManagerEmails === undefined
          ? {}
          : { addressManagerEmails: hof.addressManagerEmails }),
        ...(hof.addressManagers === undefined ? {} : { addressManagers: hof.addressManagers }),
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
            data: { groupId: hof.groupId, ...syncedFields },
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

  async deleteUnreferencedHoefe(groupIds: string[]): Promise<HofRemoval[]> {
    if (groupIds.length === 0) return [];
    // Loaded here, not at the top: every billing service imports this adapter, and only the
    // Hof sync needs the Postgres client.
    const { default: prisma } = await import('@/lib/db/prisma');
    const { docs } = await this.payload.find({
      collection: 'hoefe',
      where: { groupId: { in: groupIds } },
      pagination: false,
      depth: 0,
      context: { internal: true },
    });

    const removals: HofRemoval[] = [];
    for (const hof of docs) {
      const eventIds = (hof.events ?? []).map(({ eventId }) => eventId);
      const [users, submissions, participants, loans] = await Promise.all([
        this.payload.count({
          collection: 'users',
          where: { or: [{ hoefe: { contains: hof.id } }, { avpHoefe: { contains: hof.id } }] },
        }),
        this.payload.count({ collection: 'form-submissions', where: { hof: { equals: hof.id } } }),
        eventIds.length === 0
          ? { totalDocs: 0 }
          : this.payload.count({
              collection: 'bill-participants',
              where: { eventId: { in: eventIds } },
            }),
        prisma.materialLoan.count({ where: { hofId: hof.id } }),
      ]);

      const counts: Array<[number, string]> = [
        [users.totalDocs, 'users'],
        [submissions.totalDocs, 'form submissions'],
        [participants.totalDocs, 'billing participants'],
        [loans, 'material loans'],
      ];
      const references = counts
        .filter(([count]) => count > 0)
        .map(([count, what]) => `${count} ${what}`);

      if (references.length === 0) {
        await this.payload.delete({
          collection: 'hoefe',
          id: hof.id,
          context: { internal: true },
        });
      }
      removals.push({
        groupId: hof.groupId,
        name: hof.name,
        deleted: references.length === 0,
        references,
      });
    }
    return removals;
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
