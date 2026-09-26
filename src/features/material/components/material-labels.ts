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
  navHoefe: { de: 'Höfe', en: 'Hofs', fr: 'Hofs' },
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
  hof: { de: 'Hof', en: 'Hof', fr: 'Hof' },
  unknownHof: { de: 'Unbekannter Hof', en: 'Unknown Hof', fr: 'Hof inconnu' },
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
  recordReturnShort: { de: 'Rücknahme', en: 'Check in', fr: 'Retour' },
  startDateShort: { de: 'Start', en: 'Start', fr: 'Début' },
  endDateShort: { de: 'Rückgabe', en: 'Return', fr: 'Retour' },
  returnAnnounced: { de: 'Rückgabe gemeldet', en: 'Return announced', fr: 'Retour annoncé' },
  confirm: { de: 'Bestätigen', en: 'Confirm', fr: 'Confirmer' },
  extend: {
    de: 'Rückgabedatum ändern',
    en: 'Change return date',
    fr: 'Modifier la date de retour',
  },
  showQr: { de: 'QR-Code', en: 'QR code', fr: 'Code QR' },
  moreActions: { de: 'Weitere Aktionen', en: 'More actions', fr: 'Autres actions' },
  filter: { de: 'Filter', en: 'Filters', fr: 'Filtres' },
  resetFilters: {
    de: 'Filter zurücksetzen',
    en: 'Reset filters',
    fr: 'Réinitialiser les filtres',
  },
  clearAll: { de: 'Alle löschen', en: 'Clear all', fr: 'Tout effacer' },
  removeFilter: {
    de: 'Filter entfernen: {name}',
    en: 'Remove filter: {name}',
    fr: 'Retirer le filtre : {name}',
  },
  showResults: { de: '{n} Einträge anzeigen', en: 'Show {n} entries', fr: 'Afficher {n} entrées' },
  date: { de: 'Datum', en: 'Date', fr: 'Date' },
  clearDate: { de: 'Datum löschen', en: 'Clear date', fr: 'Effacer la date' },
  sort: { de: 'Sortierung', en: 'Sort', fr: 'Tri' },
  sortDefault: { de: 'Standard', en: 'Default', fr: 'Par défaut' },
  sortAscending: { de: '{name} aufsteigend', en: '{name} ascending', fr: '{name} croissant' },
  sortDescending: { de: '{name} absteigend', en: '{name} descending', fr: '{name} décroissant' },
  select: { de: 'Auswählen', en: 'Select', fr: 'Sélectionner' },
  selectDone: { de: 'Fertig', en: 'Done', fr: 'Terminé' },
  selectRow: { de: '{name} auswählen', en: 'Select {name}', fr: 'Sélectionner {name}' },
  selectPage: {
    de: 'Alle auf dieser Seite auswählen',
    en: 'Select all on this page',
    fr: 'Tout sélectionner sur cette page',
  },
  selectAllMatching: {
    de: 'Alle {n} Treffer auswählen',
    en: 'Select all {n} matching',
    fr: 'Sélectionner les {n} résultats',
  },
  selectedCount: { de: '{n} ausgewählt', en: '{n} selected', fr: '{n} sélectionnés' },
  clearSelection: { de: 'Auswahl aufheben', en: 'Clear selection', fr: 'Désélectionner' },
  bulkActions: {
    de: 'Aktionen für die Auswahl',
    en: 'Selection actions',
    fr: 'Actions sur la sélection',
  },
  bulkCanConfirm: {
    de: '{n} von {total} können bestätigt werden',
    en: '{n} of {total} can be confirmed',
    fr: '{n} sur {total} peuvent être confirmés',
  },
  bulkCanIssue: {
    de: '{n} von {total} können ausgegeben werden',
    en: '{n} of {total} can be handed out',
    fr: '{n} sur {total} peuvent être remis',
  },
  bulkIssueAsk: {
    de: '{n} Ausleihen mit der vollen Menge ausgeben?',
    en: 'Hand out {n} loans in full?',
    fr: 'Remettre {n} prêts en entier ?',
  },
  bulkIssueYes: { de: 'Ja, ausgeben', en: 'Yes, hand out', fr: 'Oui, remettre' },
  back: { de: 'Zurück', en: 'Back', fr: 'Retour' },
  bulkDone: { de: '{n} erledigt', en: '{n} done', fr: '{n} traités' },
  bulkPartly: {
    de: '{n} erledigt, {failed} fehlgeschlagen',
    en: '{n} done, {failed} failed',
    fr: '{n} traités, {failed} en échec',
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
  selectionKeptHint: {
    de: 'Die Auswahl bleibt beim Blättern erhalten.',
    en: 'The selection is kept across pages.',
    fr: 'La sélection est conservée entre les pages.',
  },
  scrollTabsBack: { de: 'Frühere Bereiche', en: 'Earlier sections', fr: 'Sections précédentes' },
  scrollTabsForward: { de: 'Weitere Bereiche', en: 'More sections', fr: 'Autres sections' },
  sections: {
    de: 'Bereiche des Materialdepots',
    en: 'Material depot sections',
    fr: 'Sections du dépôt',
  },
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
