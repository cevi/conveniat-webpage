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
  eyebrow: { de: 'Hof-Dashboard', en: 'Hof dashboard', fr: 'Tableau de bord du Hof' },
  intro: {
    de: 'Was dein Hof bis wann abgeben muss, und alle Unterlagen an einem Ort.',
    en: 'What your Hof has to hand in by when, and every document in one place.',
    fr: 'Ce que ton Hof doit déposer et quand, et tous les documents au même endroit.',
  },
  stillOpen: { de: 'Noch offen', en: 'Still open', fr: 'Encore ouvert' },
  submissionOne: { de: 'Abgabe', en: 'submission', fr: 'dépôt' },
  submissionMany: { de: 'Abgaben', en: 'submissions', fr: 'dépôts' },
  submissionCountOne: { de: '1 Abgabe', en: '1 submission', fr: '1 dépôt' },
  submissionCountMany: { de: '{n} Abgaben', en: '{n} submissions', fr: '{n} dépôts' },
  openCountOne: { de: '1 Abgabe offen', en: '1 submission open', fr: '1 dépôt ouvert' },
  openCountMany: {
    de: '{n} Abgaben offen',
    en: '{n} submissions open',
    fr: '{n} dépôts ouverts',
  },
  progressShort: {
    de: '{done} / {total} abgegeben',
    en: '{done} / {total} handed in',
    fr: '{done} / {total} déposés',
  },
  nextDeadline: { de: 'Nächste Frist', en: 'Next deadline', fr: 'Prochaine échéance' },
  openSubmissions: { de: 'Offene Abgaben', en: 'Open submissions', fr: 'Dépôts ouverts' },
  sortedByDeadline: {
    de: 'Sortiert nach Frist',
    en: 'Sorted by deadline',
    fr: 'Triés par échéance',
  },
  noDeadline: { de: 'Ohne Frist', en: 'No deadline', fr: 'Sans échéance' },
  doneGroup: { de: 'Erledigt', en: 'Done', fr: 'Terminé' },
  revise: { de: 'Überarbeiten', en: 'Revise', fr: 'Réviser' },
  view: { de: 'Ansehen', en: 'View', fr: 'Voir' },
  openFormLabel: { de: '{form} öffnen', en: 'Open {form}', fr: 'Ouvrir {form}' },
  versionOn: {
    de: 'Version {n} vom {date}',
    en: 'Version {n} of {date}',
    fr: 'Version {n} du {date}',
  },
  entriesCount: { de: '{n} Einträge', en: '{n} entries', fr: '{n} entrées' },
  newestOrderCounts: {
    de: 'neueste Bestellung gilt',
    en: 'the newest order counts',
    fr: 'la commande la plus récente compte',
  },
  todayOn: { de: 'Heute · {date}', en: 'Today · {date}', fr: "Aujourd'hui · {date}" },
  allDocuments: { de: 'Alle Unterlagen', en: 'All documents', fr: 'Tous les documents' },
  area: { de: 'Bereich', en: 'Area', fr: 'Rubrique' },
  submissions: { de: 'Abgaben', en: 'Submissions', fr: 'Dépôts' },
  whatYouHandIn: { de: 'Was du abgibst', en: 'What you hand in', fr: 'Ce que tu déposes' },
  whatTheHofHandsIn: {
    de: 'Was der Hof abgibt',
    en: 'What the Hof hands in',
    fr: 'Ce que le Hof dépose',
  },
  versionsHint: {
    de: 'Du kannst später eine neue Version abgeben. Es zählt jeweils die neueste.',
    en: 'You can hand in a new version later. The newest one counts.',
    fr: 'Tu peux déposer une nouvelle version plus tard. La plus récente compte.',
  },
  orderHint: {
    de: 'Du kannst die Bestellung bis zur Frist anpassen. Es zählt jeweils die neueste.',
    en: 'You can change the order until the deadline. The newest one counts.',
    fr: "Tu peux modifier la commande jusqu'à l'échéance. La plus récente compte.",
  },
  formDocuments: { de: 'Unterlagen dazu', en: 'Documents for it', fr: 'Documents associés' },
  yourSubmissions: { de: 'Deine Abgaben', en: 'Your submissions', fr: 'Tes dépôts' },
  hofSubmissions: {
    de: 'Abgaben des Hofs',
    en: "The Hof's submissions",
    fr: 'Dépôts du Hof',
  },
  nothingYet: { de: 'Noch nichts abgegeben', en: 'Nothing handed in yet', fr: 'Rien de déposé' },
  nothingYetHint: {
    de: 'Nach der Abgabe siehst du hier jede Version und die Rückmeldung des Ressorts.',
    en: "Once handed in, every version and the Ressort's feedback show here.",
    fr: 'Après le dépôt, tu verras ici chaque version et le retour du Ressort.',
  },
  reviewerEyebrow: {
    de: 'Hof-Dashboard · Ressort-Ansicht',
    en: 'Hof dashboard · Ressort view',
    fr: 'Tableau de bord du Hof · vue du Ressort',
  },
  reviewerIntro: {
    de: 'Stand der Abgaben aller Höfe. Wähle einen Hof, um seine Abgaben zu öffnen und zu prüfen.',
    en: 'Where every Hof stands. Choose a Hof to open and review what it handed in.',
    fr: 'Avancement de tous les Höfe. Choisis un Hof pour ouvrir et vérifier ses dépôts.',
  },
  reviewerViews: { de: 'Ansichten', en: 'Views', fr: 'Vues' },
  materialOrders: {
    de: 'Materialbestellungen',
    en: 'Material orders',
    fr: 'Commandes de matériel',
  },
  waitingForReview: {
    de: 'Wartet auf Prüfung',
    en: 'Waiting for review',
    fr: 'En attente de vérification',
  },
  fromHoefeOne: { de: 'aus 1 Hof', en: 'from 1 Hof', fr: "d'un Hof" },
  fromHoefeMany: { de: 'aus {n} Höfen', en: 'from {n} Höfe', fr: 'de {n} Höfe' },
  nothingToReview: {
    de: 'Nichts wartet auf eine Prüfung.',
    en: 'Nothing is waiting for a review.',
    fr: "Rien n'attend de vérification.",
  },
  handedInOne: { de: '1 Abgabe eingereicht', en: '1 submission handed in', fr: '1 dépôt reçu' },
  handedInMany: {
    de: '{n} Abgaben eingereicht',
    en: '{n} submissions handed in',
    fr: '{n} dépôts reçus',
  },
  orderedOne: { de: '1 Bestellung eingereicht', en: '1 order placed', fr: '1 commande reçue' },
  orderedMany: {
    de: '{n} Bestellungen eingereicht',
    en: '{n} orders placed',
    fr: '{n} commandes reçues',
  },
  review: { de: 'Prüfen', en: 'Review', fr: 'Vérifier' },
  reviewHofLabel: { de: '{hof} prüfen', en: 'Review {hof}', fr: 'Vérifier {hof}' },
  acceptHofLabel: {
    de: 'Alle Abgaben von {hof} freigeben',
    en: 'Accept every submission of {hof}',
    fr: 'Valider tous les dépôts de {hof}',
  },
  acceptHofQuestion: {
    de: '{n} Abgaben von {hof} freigeben und als definitiv markieren? Der Hof kann danach keine neue Version mehr abgeben. Materialbestellungen bestätigst du einzeln.',
    en: 'Accept {n} submissions of {hof} and mark them as final? The Hof can then no longer hand in a new version. Material orders are confirmed one by one.',
    fr: 'Valider {n} dépôts de {hof} et les marquer comme définitifs ? Le Hof ne pourra plus déposer de nouvelle version. Les commandes de matériel se confirment une à une.',
  },
  searchHof: { de: 'Hof suchen', en: 'Search Hof', fr: 'Chercher un Hof' },
  filters: { de: 'Filter', en: 'Filters', fr: 'Filtres' },
  filterToReview: { de: 'Zu prüfen', en: 'To review', fr: 'À vérifier' },
  filterWithSubmissions: { de: 'Mit Abgaben', en: 'With submissions', fr: 'Avec dépôts' },
  filterNothing: {
    de: 'Noch nichts abgegeben',
    en: 'Nothing handed in yet',
    fr: 'Rien de déposé',
  },
  legendWaiting: {
    de: 'Eingereicht, wartet auf Prüfung',
    en: 'Handed in, waiting for review',
    fr: 'Déposé, en attente de vérification',
  },
  legendMissing: { de: 'Fehlt', en: 'Missing', fr: 'Manquant' },
  noMatchingHof: {
    de: 'Kein Hof passt zu Suche und Filter.',
    en: 'No Hof matches the search and filter.',
    fr: 'Aucun Hof ne correspond à la recherche et au filtre.',
  },
  formStatesLabel: {
    de: '{area}: {done} von {total} abgegeben, {accepted} freigegeben, {waiting} warten auf Prüfung',
    en: '{area}: {done} of {total} handed in, {accepted} accepted, {waiting} waiting for review',
    fr: '{area} : {done} sur {total} déposés, {accepted} validés, {waiting} en attente',
  },
  orderForm: { de: 'Formular', en: 'Form', fr: 'Formulaire' },
  viewLabel: { de: 'Ansicht', en: 'View', fr: 'Vue' },
  viewTotal: { de: 'Total pro Material', en: 'Total per material', fr: 'Total par matériel' },
  viewPerHof: { de: 'Pro Hof', en: 'Per Hof', fr: 'Par Hof' },
  excelExport: { de: 'Excel-Export', en: 'Excel export', fr: 'Export Excel' },
  material: { de: 'Material', en: 'Material', fr: 'Matériel' },
  largestOrder: { de: 'Grösste Bestellung', en: 'Largest order', fr: 'Plus grande commande' },
  showHoefeOf: {
    de: 'Bestellungen pro Hof für {material}',
    en: 'Orders per Hof for {material}',
    fr: 'Commandes par Hof pour {material}',
  },
  orderedState: { de: 'Bestellt', en: 'Ordered', fr: 'Commandé' },
  orderedCount: {
    de: '{n} von {total} Höfen haben bestellt',
    en: '{n} of {total} Höfe have ordered',
    fr: '{n} Höfe sur {total} ont commandé',
  },
  notOrderedCount: {
    de: '{n} Höfe ohne Bestellung',
    en: '{n} Höfe without an order',
    fr: '{n} Höfe sans commande',
  },
  allOrdered: {
    de: 'Alle Höfe haben bestellt.',
    en: 'Every Hof has ordered.',
    fr: 'Tous les Höfe ont commandé.',
  },
  changedSinceExport: {
    de: 'Geändert seit dem letzten Export',
    en: 'Changed since the last export',
    fr: 'Modifié depuis le dernier export',
  },
  lastExportOn: {
    de: 'Letzter Export am {date}',
    en: 'Last export on {date}',
    fr: 'Dernier export le {date}',
  },
  neverExported: {
    de: 'Noch nie exportiert: jede Bestellung ist neu.',
    en: 'Never exported: every order is new.',
    fr: 'Jamais exporté : chaque commande est nouvelle.',
  },
  nothingChanged: {
    de: 'Seither hat kein Hof seine Bestellung geändert.',
    en: 'No Hof has changed its order since.',
    fr: "Aucun Hof n'a modifié sa commande depuis.",
  },
  remarks: { de: 'Bemerkungen', en: 'Remarks', fr: 'Remarques' },
  noRemarks: { de: 'Keine Bemerkungen.', en: 'No remarks.', fr: 'Aucune remarque.' },
  noMaterialForms: {
    de: 'Es ist noch kein Formular mit einer Materialliste mit dem Dashboard verbunden.',
    en: 'No form with a material list is linked to the dashboard yet.',
    fr: "Aucun formulaire avec une liste de matériel n'est encore lié au tableau de bord.",
  },
  exportForms: { de: 'Formulare', en: 'Forms', fr: 'Formulaires' },
  exportAllForms: { de: 'Alle Formulare', en: 'All forms', fr: 'Tous les formulaires' },
  exportCurrentForm: { de: 'Nur {form}', en: 'Only {form}', fr: 'Seulement {form}' },
  exportSheets: { de: 'Tabellenblätter', en: 'Sheets', fr: 'Feuilles' },
  sheetVersions: {
    de: 'Alle Versionen mit Datum',
    en: 'Every version with its date',
    fr: 'Toutes les versions avec leur date',
  },
  exportHint: {
    de: 'Der Export merkt sich die Zeit, damit alle im Ressort sehen, welche Bestellungen sich seither geändert haben.',
    en: 'The export records the time, so everyone in the Ressort sees which orders changed since.',
    fr: "L'export retient l'heure, pour que tout le Ressort voie quelles commandes ont changé depuis.",
  },
  exportFailed: {
    de: 'Der Export ist fehlgeschlagen.',
    en: 'The export failed.',
    fr: "L'export a échoué.",
  },
  exportNoSheet: {
    de: 'Wähle mindestens ein Tabellenblatt.',
    en: 'Choose at least one sheet.',
    fr: 'Choisis au moins une feuille.',
  },
  exporting: { de: 'Wird erstellt …', en: 'Creating …', fr: 'Création …' },
  openOrder: {
    de: 'Bestellung von {hof} öffnen',
    en: 'Open the order of {hof}',
    fr: 'Ouvrir la commande de {hof}',
  },
  allMaterialOrders: {
    de: 'Alle Materialbestellungen',
    en: 'All material orders',
    fr: 'Toutes les commandes de matériel',
  },
  hofOrdered: { de: 'Hof bestellt', en: 'Hof ordered', fr: 'Commandé par le Hof' },
  change: { de: 'Änderung', en: 'Change', fr: 'Modification' },
  newLine: { de: 'neu', en: 'new', fr: 'nouveau' },
  reviewOrderHint: {
    de: 'Prüfe die Bestellung. Du kannst sie dem Hof zur Überarbeitung zurückgeben oder sie definitiv bestätigen.',
    en: 'Review the order. You can send it back to the Hof for a revision or confirm it as final.',
    fr: 'Vérifie la commande. Tu peux la renvoyer au Hof pour révision ou la confirmer définitivement.',
  },
  reject: { de: 'Zurückweisen', en: 'Send back', fr: 'Renvoyer' },
  confirmOrder: { de: 'Bestätigen', en: 'Confirm', fr: 'Confirmer' },
  reopen: { de: 'Wieder öffnen', en: 'Reopen', fr: 'Rouvrir' },
  rejectReason: {
    de: 'Was soll der Hof ändern?',
    en: 'What should the Hof change?',
    fr: 'Que doit changer le Hof ?',
  },
  orderConfirmed: {
    de: 'Bestätigt und definitiv. Der Hof kann keine neue Version mehr abgeben.',
    en: 'Confirmed and final. The Hof can no longer hand in a new version.',
    fr: 'Confirmée et définitive. Le Hof ne peut plus déposer de nouvelle version.',
  },
  orderRejected: {
    de: 'Zur Überarbeitung zurückgegeben. Der Hof sieht deine Rückmeldung.',
    en: 'Sent back for a revision. The Hof sees your feedback.',
    fr: 'Renvoyée pour révision. Le Hof voit ton retour.',
  },
  openInDashboard: {
    de: 'Im Hof-Dashboard öffnen',
    en: 'Open on the Hof dashboard',
    fr: 'Ouvrir dans le tableau de bord du Hof',
  },
  remarksOfHof: { de: 'Bemerkung des Hofes', en: "The Hof's remark", fr: 'Remarque du Hof' },
  history: { de: 'Verlauf', en: 'History', fr: 'Historique' },
  versionHandedIn: {
    de: 'Version {n} abgegeben',
    en: 'Version {n} handed in',
    fr: 'Version {n} déposée',
  },
  positionsOrdered: {
    de: '{n} Positionen bestellt',
    en: '{n} items ordered',
    fr: '{n} articles commandés',
  },
  remarksChanged: {
    de: 'Bemerkung geändert',
    en: 'Remark changed',
    fr: 'Remarque modifiée',
  },
  reviewFailed: {
    de: 'Die Antwort konnte nicht gespeichert werden.',
    en: 'The answer could not be saved.',
    fr: "La réponse n'a pas pu être enregistrée.",
  },
  noOrderYet: {
    de: '{hof} hat noch nicht bestellt.',
    en: '{hof} has not ordered yet.',
    fr: "{hof} n'a pas encore commandé.",
  },
  xlsxSection: { de: 'Abschnitt', en: 'Section', fr: 'Section' },
  xlsxMaterial: { de: 'Material', en: 'Material', fr: 'Matériel' },
  xlsxTotal: { de: 'Total', en: 'Total', fr: 'Total' },
  xlsxHoefe: { de: 'Höfe', en: 'Höfe', fr: 'Höfe' },
  xlsxLargest: { de: 'Grösste Bestellung', en: 'Largest order', fr: 'Plus grande commande' },
  xlsxForm: { de: 'Formular', en: 'Form', fr: 'Formulaire' },
  xlsxQuestion: { de: 'Frage', en: 'Question', fr: 'Question' },
  xlsxAnswer: { de: 'Antwort', en: 'Answer', fr: 'Réponse' },
  xlsxSubmittedAt: { de: 'Eingereicht am', en: 'Submitted on', fr: 'Déposé le' },
  xlsxVersion: { de: 'Version', en: 'Version', fr: 'Version' },
  xlsxQuantity: { de: 'Menge', en: 'Quantity', fr: 'Quantité' },
  xlsxPerHof: { de: 'Pro Hof', en: 'Per Hof', fr: 'Par Hof' },
  xlsxVersions: { de: 'Versionen', en: 'Versions', fr: 'Versions' },
  xlsxFilename: {
    de: 'Materialbestellungen',
    en: 'Material orders',
    fr: 'Commandes de matériel',
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

/** A count in words, the one or the many form: "1 Abgabe", "3 Abgaben". */
export const translateCount = (n: number, one: TextKey, many: TextKey, locale: Locale): string =>
  n === 1 ? translate(one, locale) : translate(many, locale, { n });

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
