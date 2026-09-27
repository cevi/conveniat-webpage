import type { StaticTranslationString } from '@/types/types';

/** Where a submission belongs on the dashboard, and which colour it carries there. */
export type HofDashboardArea = 'infrastructure' | 'program';

export const HOF_DASHBOARD_AREAS: HofDashboardArea[] = ['infrastructure', 'program'];

export const HOF_DASHBOARD_AREA_LABELS: Record<HofDashboardArea, StaticTranslationString> = {
  infrastructure: { de: 'Infrastruktur', en: 'Infrastructure', fr: 'Infrastructure' },
  program: { de: 'Programm', en: 'Programme', fr: 'Programme' },
};

/**
 * The plans a Hof hands in on the dashboard. The Stadtleben concept is not among them: it is
 * handed in through the Stadtleben form, whose submissions the dashboard links instead.
 */
export const HOF_SUBMISSION_TYPES = [
  'flagpole',
  'entrance',
  'hofBuildings',
  'sleepingTent',
  'hofProgram',
] as const;

export type HofSubmissionType = (typeof HOF_SUBMISSION_TYPES)[number];

export const HOF_SUBMISSION_TYPE_AREA: Record<HofSubmissionType, HofDashboardArea> = {
  flagpole: 'infrastructure',
  entrance: 'infrastructure',
  hofBuildings: 'infrastructure',
  sleepingTent: 'infrastructure',
  hofProgram: 'program',
};

export const HOF_SUBMISSION_TYPE_LABELS: Record<HofSubmissionType, StaticTranslationString> = {
  flagpole: {
    de: 'Flaggenmast oder zentrales Symbol',
    en: 'Flagpole or central symbol',
    fr: 'Mât de drapeau ou symbole central',
  },
  entrance: {
    de: 'Eingangs- oder Begrenzungselemente',
    en: 'Entrance or boundary elements',
    fr: "Éléments d'entrée ou de délimitation",
  },
  hofBuildings: { de: 'Hofbauten', en: 'Hof buildings', fr: 'Constructions du Hof' },
  sleepingTent: { de: 'Schlafzelt', en: 'Sleeping tent', fr: 'Tente dortoir' },
  hofProgram: {
    de: 'Dossier Hofprogramme inkl. Anhänge',
    en: 'Hof programme dossier incl. attachments',
    fr: 'Dossier des programmes du Hof, annexes comprises',
  },
};

/** What the reviewing Ressort says about a submission. */
export const HOF_SUBMISSION_STATUSES = [
  'submitted',
  'inReview',
  'revisionRequired',
  'archived',
] as const;

export type HofSubmissionStatus = (typeof HOF_SUBMISSION_STATUSES)[number];

export const HOF_SUBMISSION_STATUS_LABELS: Record<HofSubmissionStatus, StaticTranslationString> = {
  submitted: { de: 'Eingereicht', en: 'Submitted', fr: 'Déposé' },
  inReview: { de: 'In Prüfung', en: 'In review', fr: 'En cours de vérification' },
  revisionRequired: {
    de: 'Überarbeitung erforderlich',
    en: 'Revision required',
    fr: 'Révision nécessaire',
  },
  archived: { de: 'Archiviert', en: 'Archived', fr: 'Archivé' },
};

/** A file on a submission is either the plan itself or the safety concept that goes with it. */
export const HOF_FILE_KINDS = ['plan', 'safetyConcept'] as const;

export type HofFileKind = (typeof HOF_FILE_KINDS)[number];

export const HOF_FILE_KIND_LABELS: Record<HofFileKind, StaticTranslationString> = {
  plan: { de: 'Planung', en: 'Plan', fr: 'Planification' },
  safetyConcept: { de: 'Sicherheitskonzept', en: 'Safety concept', fr: 'Concept de sécurité' },
};

/** The Hof's answers to "elevated safety risk?". */
export const SAFETY_RISK_ANSWERS = ['yes', 'no'] as const;

export const SAFETY_RISK_LABELS: Record<
  (typeof SAFETY_RISK_ANSWERS)[number],
  StaticTranslationString
> = {
  yes: { de: 'Ja', en: 'Yes', fr: 'Oui' },
  no: { de: 'Nein', en: 'No', fr: 'Non' },
};

/** The two material orders a Hof places. */
export const HOF_ORDER_TYPES = ['infrastructure', 'stadtleben'] as const;

export type HofOrderType = (typeof HOF_ORDER_TYPES)[number];

export const HOF_ORDER_TYPE_LABELS: Record<HofOrderType, StaticTranslationString> = {
  infrastructure: {
    de: 'Materialbestellung Hof-Infrastruktur',
    en: 'Material order Hof infrastructure',
    fr: "Commande de matériel pour l'infrastructure du Hof",
  },
  stadtleben: {
    de: 'Materialbestellung Stadtleben',
    en: 'Material order Stadtleben',
    fr: 'Commande de matériel Stadtleben',
  },
};

/** Days before a deadline from which an open submission counts as due soon. */
export const DUE_SOON_DAYS = 14;

/** Largest file a Hof can hand in, in bytes. */
export const HOF_FILE_MAX_BYTES = 25 * 1024 * 1024;

/**
 * The files a Hof can hand in, by ending: plans, documents and pictures of them. The legacy
 * Office formats (.doc, .xls, .ppt) are left out, since Payload's content check reads them as
 * a generic container and rejects them.
 */
export const HOF_FILE_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  zip: 'application/zip',
} as const;

type HofFileExtension = keyof typeof HOF_FILE_TYPES;

export const HOF_FILE_EXTENSIONS = Object.keys(HOF_FILE_TYPES) as HofFileExtension[];

/** The ending of a file name, if the dashboard takes files of that kind. */
export const hofFileExtensionOf = (filename: string): HofFileExtension | undefined => {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return undefined;
  const extension = filename.slice(dot + 1).toLowerCase();
  // own keys only: "x.constructor" must not find Object's constructor
  return Object.hasOwn(HOF_FILE_TYPES, extension) ? (extension as HofFileExtension) : undefined;
};

/** The `accept` attribute of a file input, from the endings the server takes. */
export const HOF_FILE_ACCEPT = HOF_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(',');

/** Keys an upload by its card and kind, since a card can upload its plan and its concept at once. */
export const uploadKey = (submissionType: HofSubmissionType, kind: HofFileKind): string =>
  `${submissionType}:${kind}`;

/** Most of one material a Hof can order; the order form and the server both hold to it. */
export const HOF_ORDER_MAX_QUANTITY = 10_000;
