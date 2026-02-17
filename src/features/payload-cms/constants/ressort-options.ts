import type { StaticTranslationString } from '@/types/types';

export type RessortCategory =
  | 'infrastruktur'
  | 'finanzen'
  | 'programm'
  | 'marketing'
  | 'verpflegung'
  | 'relations'
  | 'logistik'
  | 'sicherheit'
  | 'admin'
  | 'sponsoring'
  | 'international'
  | 'glaube'
  | 'other';

export const RESSORT_OPTIONS: { label: StaticTranslationString; value: RessortCategory }[] = [
  {
    label: {
      de: 'Ressort Infrastruktur',
      en: 'Department Infrastructure',
      fr: 'Département Infrastructure',
    },
    value: 'infrastruktur',
  },
  {
    label: {
      de: 'Ressort Finanzen',
      en: 'Department Finances',
      fr: 'Département Finances',
    },
    value: 'finanzen',
  },
  {
    label: {
      de: 'Ressort Programm',
      en: 'Department Program',
      fr: 'Département Programme',
    },
    value: 'programm',
  },
  {
    label: {
      de: 'Ressort Kommunikation und Marketing',
      en: 'Department Communication and Marketing',
      fr: 'Département Communication et Marketing',
    },
    value: 'marketing',
  },
  {
    label: {
      de: 'Ressort Verpflegung',
      en: 'Department Catering',
      fr: 'Département Restauration',
    },
    value: 'verpflegung',
  },
  {
    label: {
      de: 'Ressort Relations',
      en: 'Department Relations',
      fr: 'Département Relations',
    },
    value: 'relations',
  },
  {
    label: {
      de: 'Ressort Logistik',
      en: 'Department Logistics',
      fr: 'Département Logistique',
    },
    value: 'logistik',
  },
  {
    label: {
      de: 'Ressort Sicherheit',
      en: 'Department Security',
      fr: 'Département Sécurité',
    },
    value: 'sicherheit',
  },
  {
    label: {
      de: 'Ressort Admin',
      en: 'Department Admin',
      fr: 'Département Administration',
    },
    value: 'admin',
  },
  {
    label: {
      de: 'Ressort Sponsoring, Fundraising und Interactions',
      en: 'Department Sponsoring, Fundraising and Interactions',
      fr: 'Département Sponsoring, Fundraising et Interactions',
    },
    value: 'sponsoring',
  },
  {
    label: {
      de: 'Ressort International',
      en: 'Department International',
      fr: 'Département International',
    },
    value: 'international',
  },
  {
    label: {
      de: 'Ressort Glaube',
      en: 'Department Faith',
      fr: 'Département Foi',
    },
    value: 'glaube',
  },
  {
    label: {
      de: 'Other',
      en: 'Other',
      fr: 'Autre',
    },
    value: 'other',
  },
];
