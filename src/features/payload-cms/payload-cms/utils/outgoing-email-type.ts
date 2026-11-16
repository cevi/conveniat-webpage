import type { StaticTranslationString } from '@/types/types';

export type OutgoingEmailType = 'formSubmission' | 'billParticipant' | 'visitDayBill' | 'other';

export const OUTGOING_EMAIL_TYPE_LABELS: Record<OutgoingEmailType, StaticTranslationString> = {
  formSubmission: {
    en: 'Form Submission',
    de: 'Formular Antwort',
    fr: 'Soumission de formulaire',
  },
  billParticipant: {
    en: 'Bill Participant',
    de: 'Rechnungsteilnehmer',
    fr: 'Participant à la facture',
  },
  visitDayBill: {
    en: 'Besuchstag bill',
    de: 'Besuchstag-Rechnung',
    fr: 'Facture de la journée des visites',
  },
  other: { en: 'Other', de: 'Andere', fr: 'Autre' },
};

const isSet = (value: unknown): boolean => value !== undefined && value !== null;

/** What a mail was sent for, read from the record it links to. */
export const outgoingEmailTypeOf = (data: Record<string, unknown>): OutgoingEmailType => {
  if (isSet(data['formSubmission'])) return 'formSubmission';
  if (isSet(data['billParticipant'])) return 'billParticipant';
  const billParticipants = data['billParticipants'];
  if (Array.isArray(billParticipants) && billParticipants.length > 0) return 'billParticipant';
  if (isSet(data['visitDayBill'])) return 'visitDayBill';
  return 'other';
};
