import type { StaticTranslationString } from '@/types/types';

/**
 * Where a form belongs on the dashboard, and so under which tab the Hof finds it. Material
 * orders get a tab of their own, since a Hof keeps coming back to them.
 */
export const HOF_DASHBOARD_AREAS = ['infrastructure', 'program', 'material'] as const;

export type HofDashboardArea = (typeof HOF_DASHBOARD_AREAS)[number];

export const HOF_DASHBOARD_AREA_LABELS: Record<HofDashboardArea, StaticTranslationString> = {
  infrastructure: { de: 'Infrastruktur', en: 'Infrastructure', fr: 'Infrastructure' },
  program: { de: 'Programm', en: 'Programme', fr: 'Programme' },
  material: { de: 'Material', en: 'Material', fr: 'Matériel' },
};

/**
 * How a form's submissions read on the dashboard: as versions of one thing, where only the
 * newest counts, like a plan, or as separate entries, like the stands of the Stadtleben.
 */
export const HOF_ENTRY_MODES = ['versions', 'entries'] as const;

export type HofEntryMode = (typeof HOF_ENTRY_MODES)[number];

export const HOF_ENTRY_MODE_LABELS: Record<HofEntryMode, StaticTranslationString> = {
  versions: {
    de: 'Versionen: nur die neueste Antwort zählt (z.B. eine Planung)',
    en: 'Versions: only the newest submission counts (e.g. a plan)',
    fr: 'Versions : seule la réponse la plus récente compte (p. ex. des plans)',
  },
  entries: {
    de: 'Einträge: jede Antwort zählt für sich (z.B. Stände im Stadtleben)',
    en: 'Entries: every submission counts on its own (e.g. Stadtleben stands)',
    fr: 'Entrées : chaque réponse compte pour elle-même (p. ex. stands du Stadtleben)',
  },
};

/** What the reviewing Ressort answers on a submission, set in the admin panel. */
export const HOF_REVIEW_STATUSES = ['inReview', 'revisionRequired', 'accepted'] as const;

export type HofReviewStatus = (typeof HOF_REVIEW_STATUSES)[number];

/** Where a submission stands for the Hof: handed in, or what the Ressort answered. */
export type HofEntryStatus = 'submitted' | HofReviewStatus;

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
