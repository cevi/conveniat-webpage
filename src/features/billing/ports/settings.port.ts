import type { HofAddressManager, HofEventRow } from '@/features/billing/types';
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
  /** Written on every sync: a Hof is read-only in the admin panel, so Cevi.DB names it. */
  name: string;
  /** The complete event list of the Hof, replacing the stored one. */
  events: Array<{ eventId: string; eventName: string }>;
  /** Left out when the Cevi.DB lookup failed, which keeps the stored addresses. */
  addressManagerEmails?: string;
  /** The same people with their names, left out together with the addresses. */
  addressManagers?: HofAddressManager[];
}

/** A Hof whose group left the conveniat27 parent group in Cevi.DB. */
export interface HofRemoval {
  groupId: string;
  name: string;
  deleted: boolean;
  /** What still points at the Hof and kept it, e.g. "2 form submissions". Empty once deleted. */
  references: string[];
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
  /**
   * Deletes the Hof of each group unless something still points at it: a user, a form
   * submission, a material loan, or a billing participant registered for one of its events.
   */
  deleteUnreferencedHoefe(groupIds: string[]): Promise<HofRemoval[]>;
  updateNextReferenceNumber(nextReferenceNumber: number): Promise<void>;
}
