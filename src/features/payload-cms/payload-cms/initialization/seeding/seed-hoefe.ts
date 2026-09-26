import type { Hof } from '@/features/payload-cms/payload-types';
import type { Payload } from 'payload';

type HofSeed = Pick<
  Hof,
  'name' | 'groupId' | 'events' | 'addressManagerEmails' | 'reminderRecipientsOverride'
>;

/**
 * Fake Höfe, so a local stack has something to pick wherever a Hof is referenced. The ids are
 * made up and match nothing in Cevi.DB; the subgroup sync would add the real ones next to
 * them.
 */
const HOEFE: HofSeed[] = [
  {
    name: 'Hof Nord',
    groupId: '990001',
    events: [{ eventId: '991001', eventName: 'Hauptlager conveniat27 - Hof Nord' }],
    addressManagerEmails: 'adressverwaltung@hof-nord.example.com',
  },
  {
    name: 'Hof Süd',
    groupId: '990002',
    events: [
      { eventId: '991002', eventName: 'Hauptlager conveniat27 - Hof Süd' },
      { eventId: '991003', eventName: 'Hauptlager conveniat27 - Hof Süd (Leitende)' },
    ],
    addressManagerEmails: 'adressverwaltung@hof-sued.example.com',
    reminderRecipientsOverride: 'lagerleitung@hof-sued.example.com',
  },
  {
    name: 'Hof Ost',
    groupId: '990003',
    events: [{ eventId: '991004', eventName: 'Hauptlager conveniat27 - Hof Ost' }],
  },
  {
    name: 'Hof West',
    groupId: '990004',
    events: [{ eventId: '991005', eventName: 'Hauptlager conveniat27 - Hof West' }],
    addressManagerEmails: 'adressverwaltung@hof-west.example.com',
  },
];

/** Creates the fake Höfe of the dev seed. */
export const seedHoefe = async (payload: Payload): Promise<void> => {
  for (const hof of HOEFE) {
    await payload.create({ collection: 'hoefe', data: hof, context: { internal: true } });
  }
};
