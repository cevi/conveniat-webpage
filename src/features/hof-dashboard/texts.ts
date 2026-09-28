import type { Locale, StaticTranslationString } from '@/types/types';

/** Every string of the Hof dashboard that an editor does not own. */
export const text = {
  loginRequired: {
    de: 'Melde dich mit deinem Cevi.DB-Konto an, um das Dashboard deines Hofs zu öffnen.',
    en: 'Sign in with your Cevi.DB account to open the dashboard of your Hof.',
    fr: 'Connecte-toi avec ton compte Cevi.DB pour ouvrir le tableau de bord de ton Hof.',
  },
  login: {
    de: 'Mit Cevi.DB anmelden',
    en: 'Sign in with Cevi.DB',
    fr: 'Se connecter avec Cevi.DB',
  },
  noAccess: {
    de: 'Du hast keinen Zugriff auf ein Hof-Dashboard. Es öffnet sich für die Adressverwaltung der Cevi.DB-Gruppe eines Hofs. Hast du mehrere Cevi.DB-Konten, melde dich im Menü ab und mit dem richtigen wieder an.',
    en: "You have no access to a Hof dashboard. It opens for the address managers of a Hof's Cevi.DB group. If you have several Cevi.DB accounts, sign out in the menu and back in with the right one.",
    fr: "Tu n'as accès à aucun tableau de bord de Hof. Il s'ouvre pour la gestion des adresses du groupe Cevi.DB d'un Hof. Si tu as plusieurs comptes Cevi.DB, déconnecte-toi dans le menu et reconnecte-toi avec le bon.",
  },
  loadError: {
    de: 'Das Dashboard konnte nicht geladen werden.',
    en: 'The dashboard could not be loaded.',
    fr: "Le tableau de bord n'a pas pu être chargé.",
  },
  loading: { de: 'Wird geladen …', en: 'Loading …', fr: 'Chargement …' },
  retry: { de: 'Erneut versuchen', en: 'Try again', fr: 'Réessayer' },
  hof: { de: 'Hof', en: 'Hof', fr: 'Hof' },
  tabs: { de: 'Bereiche', en: 'Sections', fr: 'Rubriques' },
  tabOverview: { de: 'Übersicht', en: 'Overview', fr: 'Aperçu' },
  tabDocuments: { de: 'Dokumente', en: 'Documents', fr: 'Documents' },
  responsible: {
    de: 'Hofverantwortliche Person (AVP)',
    en: 'Person responsible for the Hof (AVP)',
    fr: 'Personne responsable du Hof (AVP)',
  },
  responsibleMissing: {
    de: 'In der Cevi.DB ist für diesen Hof noch keine Adressverwaltung eingetragen.',
    en: 'Cevi.DB has no address manager for this Hof yet.',
    fr: "Cevi.DB n'indique encore aucune gestion des adresses pour ce Hof.",
  },
  progress: { de: 'Stand der Abgaben', en: 'Progress', fr: 'Avancement' },
  progressCount: {
    de: '{done} von {total} abgegeben',
    en: '{done} of {total} handed in',
    fr: '{done} sur {total} déposés',
  },
  nextUp: { de: 'Als Nächstes', en: 'Up next', fr: 'À faire ensuite' },
  allDone: {
    de: 'Alles abgegeben. Danke!',
    en: 'Everything is handed in. Thank you!',
    fr: 'Tout est déposé. Merci !',
  },
  deadlines: { de: 'Termine', en: 'Deadlines', fr: 'Échéances' },
  noDeadlines: {
    de: 'Es sind noch keine Termine erfasst.',
    en: 'No deadlines recorded yet.',
    fr: 'Aucune échéance saisie pour le moment.',
  },
  inDays: { de: 'in {n} Tagen', en: 'in {n} days', fr: 'dans {n} jours' },
  inOneDay: { de: 'morgen', en: 'tomorrow', fr: 'demain' },
  today: { de: 'heute', en: 'today', fr: "aujourd'hui" },
  oneDayAgo: { de: 'seit 1 Tag überfällig', en: '1 day overdue', fr: 'en retard d’un jour' },
  deadlinePassed: { de: 'Frist abgelaufen', en: 'Deadline passed', fr: 'Délai dépassé' },
  daysAgo: {
    de: 'seit {n} Tagen überfällig',
    en: '{n} days overdue',
    fr: 'en retard de {n} jours',
  },
  dueOn: { de: 'Frist {date}', en: 'Due {date}', fr: 'Échéance {date}' },
  feedback: { de: 'Rückmeldung', en: 'Feedback', fr: 'Retour' },
  lastFeedback: { de: 'Letzte Rückmeldung', en: 'Last feedback', fr: 'Dernier retour' },
  submittedOn: { de: 'eingereicht am {date}', en: 'submitted on {date}', fr: 'déposé le {date}' },
  officialDocuments: {
    de: 'Unterlagen & Vorlagen',
    en: 'Documents & templates',
    fr: 'Documents et modèles',
  },
  noOfficialDocuments: {
    de: 'Es sind noch keine Unterlagen verfügbar.',
    en: 'No documents available yet.',
    fr: 'Aucun document disponible pour le moment.',
  },
  submittedDocuments: {
    de: 'Abgegebene Dateien',
    en: 'Files handed in',
    fr: 'Fichiers déposés',
  },
  noSubmittedDocuments: {
    de: 'Dein Hof hat noch keine Dateien abgegeben.',
    en: 'Your Hof has not handed in any files yet.',
    fr: "Ton Hof n'a encore déposé aucun fichier.",
  },
  download: { de: 'Herunterladen', en: 'Download', fr: 'Télécharger' },
  offline: {
    de: 'Keine Verbindung. Versuche es erneut, sobald du wieder Empfang hast.',
    en: 'No connection. Try again once you have signal.',
    fr: 'Pas de connexion. Réessaie dès que tu as du réseau.',
  },
  earlierVersions: {
    de: 'Frühere Versionen ({n})',
    en: 'Earlier versions ({n})',
    fr: 'Versions précédentes ({n})',
  },
  areaDocuments: { de: 'Unterlagen', en: 'Documents', fr: 'Documents' },
  version: { de: 'Version {n}', en: 'Version {n}', fr: 'Version {n}' },
  gapClosed: {
    de: 'Abgabe geschlossen',
    en: 'Closed',
    fr: 'Dépôt fermé',
  },
  gapMissing: { de: 'Noch nicht abgegeben', en: 'Not handed in yet', fr: 'Pas encore déposé' },
  handIn: { de: 'Abgeben', en: 'Hand in', fr: 'Déposer' },
  handInNewVersion: {
    de: 'Neue Version abgeben',
    en: 'Hand in a new version',
    fr: 'Déposer une nouvelle version',
  },
  handInAnother: {
    de: 'Weiteren Eintrag abgeben',
    en: 'Hand in another entry',
    fr: 'Déposer une autre entrée',
  },
  placeOrder: { de: 'Bestellen', en: 'Place order', fr: 'Commander' },
  changeOrder: { de: 'Bestellung anpassen', en: 'Change order', fr: 'Modifier la commande' },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
  handedIn: { de: 'Abgegeben', en: 'Handed in', fr: 'Déposé' },
  formClosed: {
    de: 'Die Abgabe ist seit dem {date} geschlossen. Änderungen nimmt das Ressort entgegen.',
    en: 'Handing in closed on {date}. Contact the Ressort for changes.',
    fr: 'Le dépôt est fermé depuis le {date}. Adresse-toi au Ressort pour toute modification.',
  },
  noEntries: { de: 'Noch nichts abgegeben.', en: 'Nothing handed in yet.', fr: 'Rien de déposé.' },
  noForms: {
    de: 'In diesem Bereich gibt es noch nichts abzugeben.',
    en: 'Nothing to hand in here yet.',
    fr: 'Rien à déposer ici pour le moment.',
  },
  entryUntitled: { de: 'Eintrag', en: 'Entry', fr: 'Entrée' },
  withdraw: { de: 'Zurückziehen', en: 'Withdraw', fr: 'Retirer' },
  withdrawQuestion: {
    de: 'Diese Abgabe mit ihren Dateien löschen?',
    en: 'Delete this submission with its files?',
    fr: 'Supprimer ce dépôt avec ses fichiers ?',
  },
  withdrawConfirm: { de: 'Löschen', en: 'Delete', fr: 'Supprimer' },
  withdrawDone: {
    de: 'Abgabe zurückgezogen',
    en: 'Submission withdrawn',
    fr: 'Dépôt retiré',
  },
  withdrawFailed: {
    de: 'Die Abgabe konnte nicht zurückgezogen werden.',
    en: 'The submission could not be withdrawn.',
    fr: "Le dépôt n'a pas pu être retiré.",
  },
  withdrawLocked: {
    de: 'Das Ressort hat die Abgabe schon aufgenommen. Melde dich dort für Änderungen.',
    en: 'The Ressort has already taken this up. Contact them for changes.',
    fr: 'Le Ressort a déjà pris ce dépôt en charge. Adresse-toi à lui pour toute modification.',
  },
  discardUnsaved: {
    de: 'Ein offenes Formular geht verloren. Trotzdem den Hof wechseln?',
    en: 'An open form will be lost. Switch the Hof anyway?',
    fr: 'Un formulaire ouvert sera perdu. Changer de Hof quand même ?',
  },
  signedInAs: {
    de: 'Angemeldet als {name}',
    en: 'Signed in as {name}',
    fr: 'Connecté·e en tant que {name}',
  },
  reviewTitle: {
    de: 'Antwort des Ressorts',
    en: 'The Ressort’s answer',
    fr: 'Réponse du Ressort',
  },
  feedbackBy: { de: '{name}, {date}', en: '{name}, {date}', fr: '{name}, {date}' },
  reviewHistory: {
    de: 'Verlauf ({n})',
    en: 'History ({n})',
    fr: 'Historique ({n})',
  },
  reviewerUnknown: { de: 'Unbekannt', en: 'Unknown', fr: 'Inconnu' },
  finalLabel: {
    de: 'Definitiv: keine weiteren Versionen',
    en: 'Final: no further versions',
    fr: 'Définitif : plus de nouvelles versions',
  },
  finalHint: {
    de: 'Der Hof kann danach keine neue Version mehr abgeben; Änderungen laufen über das Ressort.',
    en: 'The Hof can no longer hand in a new version; changes go through the Ressort.',
    fr: 'Le Hof ne peut plus déposer de nouvelle version ; les modifications passent par le Ressort.',
  },
  finalShort: { de: 'definitiv', en: 'final', fr: 'définitif' },
  finalized: {
    de: 'Das Ressort hat diese Version als definitiv markiert. Änderungen laufen über das Ressort.',
    en: 'The Ressort marked this version as final. Changes go through the Ressort.',
    fr: 'Le Ressort a marqué cette version comme définitive. Les modifications passent par lui.',
  },
  reviewStatus: { de: 'Status', en: 'Status', fr: 'Statut' },
  reviewFeedback: {
    de: 'Rückmeldung an den Hof',
    en: 'Feedback to the Hof',
    fr: 'Retour au Hof',
  },
  reviewHint: {
    de: 'Wird automatisch gespeichert. Der Hof sieht Status und Rückmeldung mit deinem Namen.',
    en: 'Saved automatically. The Hof sees the status and feedback with your name.',
    fr: 'Enregistré automatiquement. Le Hof voit le statut et le retour avec ton nom.',
  },
  autosaveTyping: { de: 'Änderungen …', en: 'Editing …', fr: 'Modification …' },
  autosaveOffline: {
    de: 'Offline – wird gespeichert, sobald du wieder Empfang hast',
    en: 'Offline – saves once you have signal',
    fr: 'Hors ligne – enregistré dès que tu as du réseau',
  },
  autosaveError: {
    de: 'Nicht gespeichert',
    en: 'Not saved',
    fr: 'Non enregistré',
  },
  saving: { de: 'Wird gespeichert …', en: 'Saving …', fr: 'Enregistrement …' },
  saved: { de: 'Gespeichert', en: 'Saved', fr: 'Enregistré' },
  openCount: { de: '{n} offen', en: '{n} open', fr: '{n} en attente' },
  signOut: { de: 'Abmelden', en: 'Sign out', fr: 'Se déconnecter' },
  allHoefe: { de: 'Alle Höfe', en: 'All Höfe', fr: 'Tous les Höfe' },
  noHoefe: {
    de: 'Es sind noch keine Höfe erfasst.',
    en: 'No Höfe recorded yet.',
    fr: 'Aucun Hof saisi pour le moment.',
  },
  files: { de: 'Dateien', en: 'Files', fr: 'Fichiers' },
  openHof: {
    de: 'Dashboard von {hof} öffnen',
    en: 'Open the dashboard of {hof}',
    fr: 'Ouvrir le tableau de bord de {hof}',
  },
  toReviewCount: { de: '{n} zu prüfen', en: '{n} to review', fr: '{n} à vérifier' },
  overdueCount: { de: '{n} überfällig', en: '{n} overdue', fr: '{n} en retard' },
  allAccepted: { de: 'Alles freigegeben', en: 'All accepted', fr: 'Tout validé' },
  acceptArea: { de: 'Alle freigeben', en: 'Accept all', fr: 'Tout valider' },
  acceptAreaLabel: {
    de: '{area} von {hof} freigeben',
    en: 'Accept {area} of {hof}',
    fr: 'Valider {area} de {hof}',
  },
  acceptAreaQuestion: {
    de: '{n} Abgaben von {hof} im Bereich {area} freigeben und als definitiv markieren? Der Hof kann danach keine neue Version mehr abgeben.',
    en: 'Accept {n} submissions of {hof} in {area} and mark them as final? The Hof can then no longer hand in a new version.',
    fr: 'Valider {n} dépôts de {hof} dans {area} et les marquer comme définitifs ? Le Hof ne pourra plus déposer de nouvelle version.',
  },
  acceptAreaDone: {
    de: '{n} Abgaben freigegeben',
    en: '{n} submissions accepted',
    fr: '{n} dépôts validés',
  },
  acceptAreaFailed: {
    de: 'Die Abgaben konnten nicht freigegeben werden.',
    en: 'The submissions could not be accepted.',
    fr: "Les dépôts n'ont pas pu être validés.",
  },
  zipFiles: { de: 'ZIP ({n})', en: 'ZIP ({n})', fr: 'ZIP ({n})' },
  downloadFiles: {
    de: 'Abgaben und Dateien von {hof} als ZIP herunterladen',
    en: 'Download the submissions and files of {hof} as a ZIP',
    fr: 'Télécharger les dépôts et fichiers de {hof} en ZIP',
  },
  entryNumbered: { de: 'Eintrag {n}', en: 'Entry {n}', fr: 'Entrée {n}' },
  pdfArea: { de: 'Bereich', en: 'Area', fr: 'Rubrique' },
  pdfSubmittedAt: { de: 'Eingereicht am', en: 'Submitted on', fr: 'Déposé le' },
  pdfAnswers: { de: 'Antworten', en: 'Answers', fr: 'Réponses' },
  pdfNoAnswers: {
    de: 'Diese Abgabe enthält keine Antworten.',
    en: 'This submission contains no answers.',
    fr: 'Ce dépôt ne contient aucune réponse.',
  },
  pdfNoReview: {
    de: 'Das Ressort hat diese Abgabe noch nicht beantwortet.',
    en: 'The Ressort has not answered this submission yet.',
    fr: "Le Ressort n'a pas encore répondu à ce dépôt.",
  },
  pdfNoFeedback: {
    de: 'Ohne Rückmeldung an den Hof.',
    en: 'No feedback to the Hof.',
    fr: 'Sans retour au Hof.',
  },
  pdfFooter: {
    de: 'conveniat27 · Hof-Dashboard · erstellt am {date}',
    en: 'conveniat27 · Hof dashboard · created on {date}',
    fr: 'conveniat27 · Tableau de bord du Hof · créé le {date}',
  },
  pdfPage: { de: 'Seite {n} von {total}', en: 'Page {n} of {total}', fr: 'Page {n} sur {total}' },
  statusLine: { de: 'Status: {status}', en: 'Status: {status}', fr: 'Statut : {status}' },
  approvalLinkHint: {
    de: 'Das ist dasselbe wie «{accepted}» im Hof-Dashboard. Rückmeldungen und Überarbeitungen gibst du dort.',
    en: 'This is the same as "{accepted}" on the Hof dashboard. Feedback and requests for revision go there.',
    fr: 'C’est la même chose que « {accepted} » dans le tableau de bord du Hof. Les retours et les demandes de révision se font là-bas.',
  },
} satisfies Record<string, StaticTranslationString>;

export type TextKey = keyof typeof text;

/** A translated string with `{name}` placeholders filled in. */
export const translate = (
  key: TextKey,
  locale: Locale,
  values: Record<string, string | number> = {},
): string =>
  Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    text[key][locale],
  );

const INTL_LOCALES: Record<Locale, string> = { de: 'de-CH', en: 'en-GB', fr: 'fr-CH' };

/** A day as the camp writes it, e.g. 31.01.2027. */
export const formatDate = (value: string, locale: Locale): string =>
  new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  }).format(new Date(value));

/** A moment as the camp writes it, e.g. 31.01.2027, 14:05. */
export const formatDateTime = (value: string, locale: Locale): string =>
  new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  }).format(new Date(value));

/** How far away a deadline is, in words: "in 12 days", "today", "3 days overdue". */
export const formatCountdown = (daysLeft: number, locale: Locale): string => {
  if (daysLeft === 0) return translate('today', locale);
  if (daysLeft === 1) return translate('inOneDay', locale);
  if (daysLeft === -1) return translate('oneDayAgo', locale);
  if (daysLeft < 0) return translate('daysAgo', locale, { n: -daysLeft });
  return translate('inDays', locale, { n: daysLeft });
};

/**
 * How much time is left to act before a deadline, in words; once it has passed, only that it
 * has. Unlike a submission that is overdue, a passed deadline asks nothing of the reader.
 */
export const formatTimeLeft = (daysLeft: number, locale: Locale): string =>
  daysLeft < 0 ? translate('deadlinePassed', locale) : formatCountdown(daysLeft, locale);

/** A number as the reader writes it, e.g. 10'000 in Swiss German. */
export const formatNumber = (value: number, locale: Locale): string =>
  new Intl.NumberFormat(INTL_LOCALES[locale]).format(value);

/** A file size in the unit people read it in. */
export const formatFileSize = (bytes: number, locale: Locale): string => {
  const megabytes = bytes / (1024 * 1024);
  // the unit in the reader's words: Mo and ko in French
  const format = (value: number, unit: 'megabyte' | 'kilobyte'): string =>
    new Intl.NumberFormat(INTL_LOCALES[locale], {
      style: 'unit',
      unit,
      unitDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(value);
  return megabytes >= 1
    ? format(megabytes, 'megabyte')
    : format(Math.max(1, Math.round(bytes / 1024)), 'kilobyte');
};
