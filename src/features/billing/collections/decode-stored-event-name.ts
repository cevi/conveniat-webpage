import { decodeDisplayText } from '@/features/registration_process/hitobito-api/html-parser';
import type { FieldHook } from 'payload';

/**
 * Unescapes a Hof name on its way out of the database.
 *
 * Cevi.DB serves event names with their HTML entities still in them, twice over for a name
 * whose field content was escaped before it was stored. The sync decodes them on the way in
 * now, but every name written before that still sits in the database as
 * `Altstetten &amp;amp; Albisrieden`, and it is read straight into the admin list, the
 * settings form, the exports, the bills and the reminder mails.
 *
 * A sync run rewrites what it still finds in Cevi.DB. It never comes back to a participant
 * whose registration Cevi.DB has dropped, so those rows would keep their entities for good.
 *
 * Decoding is idempotent, which makes this a no-op for every name written since the sync
 * started decoding. Drop it once no stored name carries an entity any more.
 */
export const decodeStoredEventName: FieldHook = ({ value }): unknown =>
  typeof value === 'string' ? decodeDisplayText(value) : value;
