import type { StaticTranslationString } from '@/types/types';

/**
 * A tab of the dashboard, under which the Hof finds the forms, deadlines and documents of one
 * area. Editors set the tabs up in the dashboard settings; the id is the row id there, and what
 * a form, a deadline or a document stores to say where it belongs.
 */
export type HofDashboardArea = string;

/** The icons an editor can give a tab, by the name the settings store. */
export const HOF_AREA_ICONS = [
  'hammer',
  'sparkles',
  'package',
  'clipboard-list',
  'info',
  'users',
  'tent',
  'calendar',
] as const;

export type HofAreaIcon = (typeof HOF_AREA_ICONS)[number];

export const HOF_AREA_ICON_LABELS: Record<HofAreaIcon, StaticTranslationString> = {
  hammer: { de: 'Hammer', en: 'Hammer', fr: 'Marteau' },
  sparkles: { de: 'Funken', en: 'Sparkles', fr: 'Étincelles' },
  package: { de: 'Paket', en: 'Package', fr: 'Colis' },
  'clipboard-list': { de: 'Klemmbrett', en: 'Clipboard', fr: 'Presse-papiers' },
  info: { de: 'Info', en: 'Info', fr: 'Info' },
  users: { de: 'Personen', en: 'People', fr: 'Personnes' },
  tent: { de: 'Zelt', en: 'Tent', fr: 'Tente' },
  calendar: { de: 'Kalender', en: 'Calendar', fr: 'Calendrier' },
};

/** A tab of the dashboard as the dashboard shows it, its name in every language. */
export interface HofDashboardAreaInfo {
  id: HofDashboardArea;
  label: StaticTranslationString;
  icon: HofAreaIcon;
}

/**
 * The tabs the dashboard had before editors could set them up, and still has until they change
 * them. Their ids are the values forms, deadlines and documents stored back then.
 */
export const DEFAULT_HOF_DASHBOARD_AREAS: readonly HofDashboardAreaInfo[] = [
  {
    id: 'infrastructure',
    label: { de: 'Infrastruktur', en: 'Infrastructure', fr: 'Infrastructure' },
    icon: 'hammer',
  },
  { id: 'program', label: { de: 'Programm', en: 'Programme', fr: 'Programme' }, icon: 'sparkles' },
  { id: 'material', label: { de: 'Material', en: 'Material', fr: 'Matériel' }, icon: 'package' },
];

/**
 * The tab whose forms are material orders: the Ressort sees them together under
 * "Materialbestellungen", confirms them one by one and the Hof "orders" there.
 */
export const MATERIAL_AREA: HofDashboardArea = 'material';

/**
 * How a form's submissions read on the dashboard: as versions of one thing, where only the
 * newest counts, like a plan or a Hof's one Stadtleben stand, or as separate entries, of which a
 * Hof hands in several.
 */
export const HOF_ENTRY_MODES = ['versions', 'entries'] as const;

export type HofEntryMode = (typeof HOF_ENTRY_MODES)[number];

export const HOF_ENTRY_MODE_LABELS: Record<HofEntryMode, StaticTranslationString> = {
  versions: {
    de: 'Versionen: nur die neueste Antwort zählt (z.B. eine Planung oder der Stand im Stadtleben)',
    en: 'Versions: only the newest submission counts (e.g. a plan or the Stadtleben stand)',
    fr: 'Versions : seule la réponse la plus récente compte (p. ex. des plans ou le stand du Stadtleben)',
  },
  entries: {
    de: 'Einträge: jede Antwort zählt für sich, ein Hof gibt mehrere ab',
    en: 'Entries: every submission counts on its own, a Hof hands in several',
    fr: 'Entrées : chaque réponse compte pour elle-même, un Hof en dépose plusieurs',
  },
};

/**
 * What the reviewing Ressort says while it works on a submission. Accepting it is the form
 * builder's own approval (`approved`), the same whether set on the dashboard, in the admin
 * panel or through the approval link of an email.
 */
export const HOF_REVIEW_STATUSES = ['inReview', 'revisionRequired'] as const;

export type HofReviewStatus = (typeof HOF_REVIEW_STATUSES)[number];

/** The answers a reviewer can give: a working status, or accepted. */
export const HOF_REVIEW_CHOICES = [...HOF_REVIEW_STATUSES, 'accepted'] as const;

export type HofReviewChoice = (typeof HOF_REVIEW_CHOICES)[number];

/** Where a submission stands for the Hof: handed in, or what the Ressort answered. */
export type HofEntryStatus = 'submitted' | HofReviewChoice;

export const HOF_ENTRY_STATUS_LABELS: Record<HofEntryStatus, StaticTranslationString> = {
  submitted: { de: 'Eingereicht', en: 'Submitted', fr: 'Déposé' },
  inReview: { de: 'In Prüfung', en: 'In review', fr: 'En cours de vérification' },
  revisionRequired: {
    de: 'Überarbeitung erforderlich',
    en: 'Revision required',
    fr: 'Révision nécessaire',
  },
  accepted: { de: 'Freigegeben', en: 'Accepted', fr: 'Validé' },
};

/** Days before a deadline from which an open form counts as due soon. */
export const DUE_SOON_DAYS = 14;
