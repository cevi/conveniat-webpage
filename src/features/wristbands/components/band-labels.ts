import { translate } from '@/features/wristbands/texts';
import type { HofPerson } from '@/features/wristbands/types';
import type { Locale } from '@/types/types';

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

/**
 * Ceviname and Abteilung: what tells two Lea Meier apart, and what the child answers to. A list
 * of a Hof with one Abteilung leaves it out, since every row would say the same.
 */
export const personDetails = (
  person: HofPerson,
  locale: Locale,
  { withAbteilung = true }: { withAbteilung?: boolean } = {},
): string =>
  [
    person.nickname === null ? null : `v/o ${person.nickname}`,
    withAbteilung ? person.abteilung : null,
    person.role === 'leader' ? translate('leaders', locale) : null,
  ]
    .filter((part) => part !== null && part !== '')
    .join(' · ');
