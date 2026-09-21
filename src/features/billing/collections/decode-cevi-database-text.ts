import { decodeDisplayText } from '@/features/registration_process/hitobito-api/html-parser';
import type { FieldHook } from 'payload';

/**
 * Reads a text field that came from Cevi.DB as the name it is meant to be.
 *
 * Cevi.DB serves its names with the HTML entities still in them, so the Hof «Altstetten &
 * Albisrieden» was stored as «Altstetten &amp;amp; Albisrieden» by every sync that ran
 * before the ingest started decoding. Those rows are in the database now, and the field is
 * shown in the Rechnungs-Einstellungen, in the Rechnungsverwaltung list, on the bill and in
 * the reminder mails.
 *
 * Decoding on read rather than only at the ingest buys two things. The stored rows read
 * correctly on every one of those surfaces without waiting for a sync to rewrite them. And
 * the sync compares a decoded value against a decoded value, so repairing a name does not
 * look like Cevi.DB having changed it — which would park every already billed row of that
 * Hof in `needs_manual_review` with «Angaben in der Cevi.DB haben sich nach der
 * Rechnungsstellung geändert». The stored value is put right the next time anything saves
 * the document.
 */
export const decodeCeviDatabaseText = (({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? decodeDisplayText(value) : value) as FieldHook;
