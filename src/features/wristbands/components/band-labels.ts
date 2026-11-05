import type { HofPerson } from '@/features/wristbands/types';

/**
 * A band's UID in bytes: "04 62 41 5A 7E 24 90". All of it: NXP numbers a batch so that bands
 * from one bag can share every byte but one, and not always the last. The AVP's page shows no
 * UID at all; this is for the views that read a band.
 */
export const formatUid = (uid: string): string => uid.match(/.{1,2}/g)?.join(' ') ?? uid;

/** "Lea Meier v/o Fuchs", the way the Cevi names a person with a Ceviname. */
export const personName = (person: Pick<HofPerson, 'fullName' | 'nickname'>): string =>
  person.nickname === null || person.nickname === ''
    ? person.fullName
    : `${person.fullName} v/o ${person.nickname}`;
