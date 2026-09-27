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

/**
 * Which seeded Hof each random user is registered at, in the order they were created: the
 * first is at two, the last three at none, so the address book shows every case.
 */
const RANDOM_USER_HOEFE: string[][] = [
  ['Hof Nord', 'Hof Süd'],
  ['Hof Nord'],
  ['Hof Süd'],
  ['Hof Süd'],
  ['Hof Ost'],
  ['Hof West'],
  ['Hof Ost'],
];

/**
 * Registers the random users for the camps of their Höfe, the way the billing's Cevi.DB sync
 * would. The registration hooks then give each user their Höfe.
 */
export const seedRandomUserRegistrations = async (
  payload: Payload,
  userIds: string[],
): Promise<void> => {
  const { docs: hoefe } = await payload.find({
    collection: 'hoefe',
    depth: 0,
    pagination: false,
    select: { name: true, groupId: true, events: true },
  });

  for (const [index, userId] of userIds.entries()) {
    const user = await payload.findByID({ collection: 'users', id: userId, depth: 0 });
    if (typeof user.cevi_db_uuid !== 'number') continue;
    for (const hofName of RANDOM_USER_HOEFE[index] ?? []) {
      const hof = hoefe.find(({ name }) => name === hofName);
      const event = hof?.events?.[0];
      if (hof === undefined || event === undefined) continue;
      await payload.create({
        collection: 'bill-participants',
        context: { internal: true },
        data: {
          participationUuid: crypto.randomUUID(),
          userId: String(user.cevi_db_uuid),
          eventId: event.eventId,
          eventName: event.eventName,
          groupId: hof.groupId,
          fullName: user.fullName,
          ...(typeof user.nickname === 'string' ? { nickname: user.nickname } : {}),
          email: user.email,
          roleType: 'Event::Camp::Role::Participant',
          active: true,
          status: 'new',
        },
      });
    }
  }
};
