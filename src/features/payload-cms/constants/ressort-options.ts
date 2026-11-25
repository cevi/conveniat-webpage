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
      de: 'Anderes Ressort',
      en: 'Other Department',
      fr: 'Autre département',
    },
    value: 'other',
  },
];

/**
 * What a helper reads instead of the Ressort name: the area of work, as the helper registration
 * describes it. Helpers do not know the Ressorts, so the public form never names them.
 */
export const HELPER_AREA_LABELS: Record<RessortCategory, StaticTranslationString> = {
  infrastruktur: {
    de: 'Aufbau & Infrastruktur',
    en: 'Setup & infrastructure',
    fr: 'Montage & infrastructure',
  },
  finanzen: { de: 'Finanzen', en: 'Finances', fr: 'Finances' },
  programm: { de: 'Programm & Events', en: 'Programme & events', fr: 'Programme & événements' },
  marketing: {
    de: 'Kommunikation & Marketing',
    en: 'Communication & marketing',
    fr: 'Communication & marketing',
  },
  verpflegung: {
    de: 'Küche & Verpflegung',
    en: 'Kitchen & catering',
    fr: 'Cuisine & restauration',
  },
  relations: { de: 'Relations', en: 'Relations', fr: 'Relations' },
  logistik: {
    de: 'Logistik & Transport',
    en: 'Logistics & transport',
    fr: 'Logistique & transport',
  },
  sicherheit: { de: 'Sicherheit & Betreuung', en: 'Safety & care', fr: 'Sécurité & encadrement' },
  admin: { de: 'Administration', en: 'Administration', fr: 'Administration' },
  sponsoring: {
    de: 'Sponsoring & Fundraising',
    en: 'Sponsoring & fundraising',
    fr: 'Sponsoring & recherche de fonds',
  },
  international: { de: 'International', en: 'International', fr: 'International' },
  glaube: { de: 'Glaube', en: 'Faith', fr: 'Foi' },
  other: { de: 'Weitere Aufgaben', en: 'Other tasks', fr: 'Autres tâches' },
};

/**
 * The areas a helper can wish for when signing up by availability instead of for a concrete
 * job: the areas that also offer jobs. Keyed by Ressort so the team can route the helper, and
 * labelled by area.
 */
const WISHABLE_RESSORTS: RessortCategory[] = [
  'infrastruktur',
  'programm',
  'marketing',
  'verpflegung',
  'logistik',
];

export const RESSORT_WISH_OPTIONS: { label: StaticTranslationString; value: RessortCategory }[] =
  WISHABLE_RESSORTS.map((value) => ({ label: HELPER_AREA_LABELS[value], value }));
