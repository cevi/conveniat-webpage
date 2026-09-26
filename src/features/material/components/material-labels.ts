import type {
  MaterialItemStatus,
  MaterialLoanDisplayStatus,
} from '@/features/material/utils/stock';
import type { MaterialCondition } from '@/lib/prisma/client';
import type { Locale, StaticTranslationString } from '@/types/types';

export const itemStatusLabel: Record<MaterialItemStatus, StaticTranslationString> = {
  AVAILABLE: { de: 'Verfügbar', en: 'Available', fr: 'Disponible' },
  PARTIALLY_AVAILABLE: {
    de: 'Teilweise verfügbar',
    en: 'Partially available',
    fr: 'Partiellement disponible',
  },
  RESERVED: { de: 'Reserviert', en: 'Reserved', fr: 'Réservé' },
  LOANED: { de: 'Ausgeliehen', en: 'On loan', fr: 'Prêté' },
  DAMAGED: { de: 'Beschädigt', en: 'Damaged', fr: 'Endommagé' },
  IN_REPAIR: { de: 'In Reparatur', en: 'In repair', fr: 'En réparation' },
  NOT_AVAILABLE: { de: 'Nicht verfügbar', en: 'Not available', fr: 'Indisponible' },
};

export const loanStatusLabel: Record<MaterialLoanDisplayStatus, StaticTranslationString> = {
  REQUESTED: { de: 'Angefragt', en: 'Requested', fr: 'Demandé' },
  RESERVED: { de: 'Reserviert', en: 'Reserved', fr: 'Réservé' },
  ISSUED: { de: 'Ausgeliehen', en: 'On loan', fr: 'Prêté' },
  RETURN_DUE: { de: 'Rückgabe fällig', en: 'Return due', fr: 'Retour dû' },
  OVERDUE: { de: 'Überfällig', en: 'Overdue', fr: 'En retard' },
  RETURNED: { de: 'Zurückgegeben', en: 'Returned', fr: 'Rendu' },
  CONSUMED: { de: 'Verbraucht', en: 'Used up', fr: 'Consommé' },
  CANCELLED: { de: 'Storniert', en: 'Cancelled', fr: 'Annulé' },
};

export const conditionLabel: Record<MaterialCondition, StaticTranslationString> = {
  OK: {
    de: 'Vollständig und einwandfrei',
    en: 'Complete and in good order',
    fr: 'Complet et en bon état',
  },
  LIGHT_DAMAGE: { de: 'Leichte Beschädigung', en: 'Slight damage', fr: 'Légèrement endommagé' },
  DAMAGED: { de: 'Beschädigt', en: 'Damaged', fr: 'Endommagé' },
  MISSING: { de: 'Fehlt', en: 'Missing', fr: 'Manquant' },
};

export const labels = {
  pageTitle: { de: 'Materialdepot', en: 'Material depot', fr: 'Dépôt de matériel' },
  navOverview: { de: 'Übersicht', en: 'Overview', fr: 'Aperçu' },
  navMaterial: { de: 'Material', en: 'Material', fr: 'Matériel' },
  navLoans: { de: 'Ausleihen', en: 'Loans', fr: 'Prêts' },
  navReservations: { de: 'Reservationen', en: 'Reservations', fr: 'Réservations' },
  navReturns: { de: 'Rückgaben', en: 'Returns', fr: 'Retours' },
  navDepartments: { de: 'Abteilungen', en: 'Departments', fr: 'Groupes' },
  navPeople: { de: 'Personen', en: 'People', fr: 'Personnes' },
  navTeam: { de: 'Materialteam', en: 'Material team', fr: 'Équipe matériel' },
  navScan: { de: 'Scannen', en: 'Scan', fr: 'Scanner' },
  available: { de: 'Verfügbar', en: 'Available', fr: 'Disponible' },
  free: { de: 'frei', en: 'free', fr: 'libres' },
  reserved: { de: 'Reserviert', en: 'Reserved', fr: 'Réservé' },
  reservedShort: { de: 'res.', en: 'res.', fr: 'rés.' },
  issued: { de: 'Ausgeliehen', en: 'On loan', fr: 'Prêté' },
  issuedShort: { de: 'aus', en: 'out', fr: 'sortis' },
  damaged: { de: 'Beschädigt', en: 'Damaged', fr: 'Endommagé' },
  damagedShort: { de: 'defekt', en: 'broken', fr: 'cassés' },
  inRepair: { de: 'In Reparatur', en: 'In repair', fr: 'En réparation' },
  total: { de: 'Gesamtbestand', en: 'Total stock', fr: 'Stock total' },
  maxPerLoan: {
    de: 'Maximale Ausleihmenge',
    en: 'Maximum per loan',
    fr: 'Quantité maximale par prêt',
  },
  reserve: { de: 'Reservieren', en: 'Reserve', fr: 'Réserver' },
  reserveLong: {
    de: 'Material reservieren / ausleihen',
    en: 'Reserve / borrow material',
    fr: 'Réserver / emprunter du matériel',
  },
  handOut: { de: 'Ausgeben', en: 'Hand out', fr: 'Remettre' },
  noneFree: { de: 'Keine frei', en: 'None free', fr: 'Aucun libre' },
  counterOnly: { de: 'Nur im Depot', en: 'Depot only', fr: 'Au dépôt' },
  article: { de: 'Artikel', en: 'Item', fr: 'Article' },
  quantity: { de: 'Menge', en: 'Quantity', fr: 'Quantité' },
  department: { de: 'Abteilung', en: 'Department', fr: 'Groupe' },
  person: { de: 'Person', en: 'Person', fr: 'Personne' },
  responsible: { de: 'Verantwortlich', en: 'Responsible', fr: 'Responsable' },
  startDate: { de: 'Ausleihdatum', en: 'Start', fr: 'Début' },
  endDate: { de: 'Rückgabedatum', en: 'Return date', fr: 'Date de retour' },
  status: { de: 'Status', en: 'Status', fr: 'Statut' },
  action: { de: 'Aktion', en: 'Action', fr: 'Action' },
  comment: { de: 'Kommentar', en: 'Comment', fr: 'Commentaire' },
  optional: { de: 'optional', en: 'optional', fr: 'facultatif' },
  category: { de: 'Kategorie', en: 'Category', fr: 'Catégorie' },
  description: { de: 'Beschreibung', en: 'Description', fr: 'Description' },
  usageNotes: { de: 'Hinweise zur Verwendung', en: 'How to use', fr: 'Conseils d’utilisation' },
  returnInstructions: {
    de: 'Rückgabeinstruktionen',
    en: 'Return instructions',
    fr: 'Instructions de retour',
  },
  consumable: { de: 'Verbrauchsmaterial', en: 'Consumable', fr: 'Consommable' },
  loading: { de: 'Wird geladen …', en: 'Loading …', fr: 'Chargement …' },
  error: {
    de: 'Das hat nicht geklappt.',
    en: 'That did not work.',
    fr: 'Cela n’a pas fonctionné.',
  },
  save: { de: 'Speichern', en: 'Save', fr: 'Enregistrer' },
  edit: { de: 'Bearbeiten', en: 'Edit', fr: 'Modifier' },
  reportDamage: { de: 'Schaden melden', en: 'Report damage', fr: 'Signaler un dégât' },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
  close: { de: 'Schliessen', en: 'Close', fr: 'Fermer' },
  details: { de: 'Details', en: 'Details', fr: 'Détails' },
  empty: { de: 'Nichts gefunden.', en: 'Nothing found.', fr: 'Rien trouvé.' },
  all: { de: 'Alle', en: 'All', fr: 'Tous' },
  loanNumber: { de: 'Ausleihe #{n}', en: 'Loan #{n}', fr: 'Prêt n° {n}' },
  saved: { de: 'Gespeichert', en: 'Saved', fr: 'Enregistré' },
  notSignedIn: {
    de: 'Melde dich an, um Material zu reservieren.',
    en: 'Sign in to reserve material.',
    fr: 'Connecte-toi pour réserver du matériel.',
  },
  signIn: { de: 'Anmelden', en: 'Sign in', fr: 'Se connecter' },
  teamOnly: {
    de: 'Nur für das Materialteam.',
    en: 'For the material team only.',
    fr: 'Réservé à l’équipe matériel.',
  },
  notFound: {
    de: 'Nicht gefunden.',
    en: 'Not found.',
    fr: 'Introuvable.',
  },
  loanNotFound: {
    de: 'Ausleihe #{n} nicht gefunden.',
    en: 'Loan #{n} not found.',
    fr: 'Prêt n° {n} introuvable.',
  },
  periodInvalid: {
    de: 'Das Rückgabedatum liegt vor dem Ausleihdatum.',
    en: 'The return date is before the start.',
    fr: 'La date de retour est avant le début.',
  },
  maxShort: { de: 'max. {n}', en: 'max {n}', fr: 'max {n}' },
  recordReturn: { de: 'Rückgabe erfassen', en: 'Record return', fr: 'Enregistrer le retour' },
} satisfies Record<string, StaticTranslationString>;

/** Fills `{n}`-style placeholders of a translated label. */
export const format = (
  text: StaticTranslationString,
  locale: Locale,
  values: Record<string, string | number>,
): string =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text[locale],
  );

/** A day such as "Mo., 13. Juli", in the reader's locale and time zone. */
export const formatDay = (date: Date, locale: Locale): string =>
  new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(
    date,
  );

/** A day with the time, for issued and returned stamps. */
export const formatDateTime = (date: Date, locale: Locale): string =>
  new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
