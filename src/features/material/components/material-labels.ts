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
  RESERVED: { de: 'Vorbereitet', en: 'Prepared', fr: 'Préparé' },
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
  navHandOut: { de: 'Ausgeben', en: 'Hand out', fr: 'Remettre' },
  navTakeBack: { de: 'Zurück', en: 'Take back', fr: 'Retour' },
  navInventory: { de: 'Inventar', en: 'Inventory', fr: 'Inventaire' },
  sections: {
    de: 'Bereiche des Materialdepots',
    en: 'Material depot sections',
    fr: 'Sections du dépôt',
  },
  available: { de: 'Verfügbar', en: 'Available', fr: 'Disponible' },
  free: { de: 'frei', en: 'free', fr: 'libres' },
  reserved: { de: 'Vorbereitet', en: 'Prepared', fr: 'Préparé' },
  reservedShort: { de: 'res.', en: 'res.', fr: 'rés.' },
  issued: { de: 'Draussen', en: 'Out', fr: 'Dehors' },
  issuedShort: { de: 'draussen', en: 'out', fr: 'dehors' },
  damaged: { de: 'Beschädigt', en: 'Damaged', fr: 'Endommagé' },
  damagedShort: { de: 'defekt', en: 'broken', fr: 'cassés' },
  inRepair: { de: 'In Reparatur', en: 'In repair', fr: 'En réparation' },
  total: { de: 'Gesamtbestand', en: 'Total stock', fr: 'Stock total' },
  maxPerLoan: {
    de: 'Maximale Ausleihmenge',
    en: 'Maximum per loan',
    fr: 'Quantité maximale par prêt',
  },
  quantity: { de: 'Menge', en: 'Quantity', fr: 'Quantité' },
  hof: { de: 'Hof', en: 'Hof', fr: 'Hof' },
  unknownHof: { de: 'Unbekannter Hof', en: 'Unknown Hof', fr: 'Hof inconnu' },
  unknownPerson: { de: 'Unbekannte Person', en: 'Unknown person', fr: 'Personne inconnue' },
  person: { de: 'Person', en: 'Person', fr: 'Personne' },
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
  back: { de: 'Zurück', en: 'Back', fr: 'Retour' },
  change: { de: 'ändern', en: 'change', fr: 'modifier' },
  remove: { de: 'Entfernen', en: 'Remove', fr: 'Retirer' },
  empty: { de: 'Nichts gefunden.', en: 'Nothing found.', fr: 'Rien trouvé.' },
  all: { de: 'Alle', en: 'All', fr: 'Tous' },
  loanNumber: { de: 'Ausleihe #{n}', en: 'Loan #{n}', fr: 'Prêt n° {n}' },
  saved: { de: 'Gespeichert', en: 'Saved', fr: 'Enregistré' },
  notSignedIn: {
    de: 'Melde dich an, um das Material deines Hofs zu sehen.',
    en: 'Sign in to see the material of your Hof.',
    fr: 'Connecte-toi pour voir le matériel de ton Hof.',
  },
  signIn: { de: 'Anmelden', en: 'Sign in', fr: 'Se connecter' },
  teamOnly: {
    de: 'Nur für das Materialteam.',
    en: 'For the material team only.',
    fr: 'Réservé à l’équipe matériel.',
  },
  notFound: { de: 'Nicht gefunden.', en: 'Not found.', fr: 'Introuvable.' },
  loanNotFound: {
    de: 'Ausleihe #{n} nicht gefunden.',
    en: 'Loan #{n} not found.',
    fr: 'Prêt n° {n} introuvable.',
  },
  maxShort: { de: 'max. {n}', en: 'max {n}', fr: 'max {n}' },
  pieces: { de: '{n} Stück', en: '{n} pieces', fr: '{n} pièces' },
  positions: { de: '{n} Positionen', en: '{n} lines', fr: '{n} positions' },
  onePosition: { de: '1 Position', en: '1 line', fr: '1 position' },
  dueOn: { de: 'fällig {day}', en: 'due {day}', fr: 'dû {day}' },
  dueToday: { de: 'fällig heute', en: 'due today', fr: 'dû aujourd’hui' },
  overdue: { de: 'Überfällig', en: 'Overdue', fr: 'En retard' },
  overdueSince: {
    de: 'überfällig seit {day}',
    en: 'overdue since {day}',
    fr: 'en retard depuis {day}',
  },
  pickupFrom: { de: 'ab {day}', en: 'from {day}', fr: 'dès {day}' },
  showQr: { de: 'QR-Code', en: 'QR code', fr: 'Code QR' },
  scan: { de: 'QR-Code scannen', en: 'Scan QR code', fr: 'Scanner un code QR' },
  unknownCode: {
    de: 'Dieser Code gehört nicht zum Materialdepot.',
    en: 'This code does not belong to the material depot.',
    fr: 'Ce code n’appartient pas au dépôt de matériel.',
  },
  pagination: { de: 'Seiten', en: 'Pages', fr: 'Pages' },
  pageSize: { de: 'Pro Seite', en: 'Per page', fr: 'Par page' },
  previousPage: { de: 'Vorherige Seite', en: 'Previous page', fr: 'Page précédente' },
  nextPage: { de: 'Nächste Seite', en: 'Next page', fr: 'Page suivante' },
  pageNumber: { de: 'Seite {n}', en: 'Page {n}', fr: 'Page {n}' },
  range: {
    de: '{from}–{to} von {total}',
    en: '{from}–{to} of {total}',
    fr: '{from}–{to} sur {total}',
  },
  shownOf: { de: '{n} von {total}', en: '{n} of {total}', fr: '{n} sur {total}' },
  loadMore: { de: 'Mehr laden', en: 'Load more', fr: 'Charger plus' },
  loadPrevious: { de: 'Frühere anzeigen', en: 'Show earlier', fr: 'Afficher les précédents' },
  bulkDone: { de: '{n} erledigt', en: '{n} done', fr: '{n} traités' },
  bulkPartly: {
    de: '{n} erledigt, {failed} fehlgeschlagen',
    en: '{n} done, {failed} failed',
    fr: '{n} traités, {failed} en échec',
  },
  clearDate: { de: 'Datum löschen', en: 'Clear date', fr: 'Effacer la date' },
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
