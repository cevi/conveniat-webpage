import type { HofEventRow } from '@/features/billing/types';
import type {
  BillSetting,
  Hof,
  RegistrationManagement,
} from '@/features/payload-cms/payload-types';

/**
 * What the subgroup sync writes to one Hof. Only the fields Cevi.DB owns: an editor's name
 * and reminder override are never part of a sync write, so a walk cannot overwrite what
 * somebody changed while it ran.
 */
export interface HofSyncWrite {
  groupId: string;
  /** Only used when the Hof does not exist yet; an existing Hof keeps its name. */
  name: string;
  /** The complete event list of the Hof, replacing the stored one. */
  events: Array<{ eventId: string; eventName: string }>;
  /** Left out when the Cevi.DB lookup failed, which keeps the stored addresses. */
  addressManagerEmails?: string;
}

export interface SettingsPort {
  getBillSettings(): Promise<BillSetting>;
  getRegistrationManagement(): Promise<RegistrationManagement>;
  /** Every Hof document, with its nested events. */
  getHoefe(): Promise<Hof[]>;
  /** Every event of every Hof, one row per event. See `flattenHofEvents`. */
  getHofEvents(): Promise<HofEventRow[]>;
  /** Creates or updates one Hof per entry, matched by `groupId`. */
  upsertHoefe(hoefe: HofSyncWrite[]): Promise<void>;
  updateNextReferenceNumber(nextReferenceNumber: number): Promise<void>;
}
