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
 * Ressorts that staff their helpers themselves and therefore only appear as a job category.
 * A helper signing up by availability cannot wish for them.
 */
const RESSORTS_WITHOUT_WISH = new Set<RessortCategory>(['finanzen', 'relations']);

/**
 * The Ressorts a helper can wish for when signing up by availability instead of for a concrete
 * job. A subset of {@link RESSORT_OPTIONS}, which stays complete for job categories.
 */
export const RESSORT_WISH_OPTIONS: typeof RESSORT_OPTIONS = RESSORT_OPTIONS.filter(
  (option) => !RESSORTS_WITHOUT_WISH.has(option.value),
);
