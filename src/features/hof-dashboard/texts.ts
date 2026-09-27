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
    en: "You have no access to a Hof dashboard. It opens for the address administration of a Hof's Cevi.DB group. If you have several Cevi.DB accounts, sign out in the menu and back in with the right one.",
    fr: "Tu n'as accès à aucun tableau de bord. Il s'ouvre pour l'administration des adresses du groupe Cevi.DB d'un Hof. Si tu as plusieurs comptes Cevi.DB, déconnecte-toi dans le menu et reconnecte-toi avec le bon.",
  },
  loadError: {
    de: 'Das Dashboard konnte nicht geladen werden.',
    en: 'The dashboard could not be loaded.',
    fr: "Le tableau de bord n'a pas pu être chargé.",
  },
  loading: { de: 'Wird geladen …', en: 'Loading …', fr: 'Chargement …' },
  retry: { de: 'Erneut versuchen', en: 'Try again', fr: 'Réessayer' },
  close: { de: 'Schliessen', en: 'Close', fr: 'Fermer' },
  hof: { de: 'Hof', en: 'Hof', fr: 'Hof' },

  tabs: { de: 'Bereiche', en: 'Sections', fr: 'Rubriques' },
  tabOverview: { de: 'Übersicht', en: 'Overview', fr: 'Aperçu' },
  tabOrders: { de: 'Material', en: 'Material', fr: 'Matériel' },
  tabDocuments: { de: 'Dokumente', en: 'Documents', fr: 'Documents' },

  contacts: { de: 'Kontakte', en: 'Contacts', fr: 'Contacts' },
  avp: { de: 'AVP', en: 'AVP', fr: 'AVP' },
  coach: { de: 'Coach', en: 'Coach', fr: 'Coach' },
  buildingManager: {
    de: 'Bauverantwortliche/r',
    en: 'Responsible for buildings',
    fr: 'Responsable des constructions',
  },
  contactMissing: {
    de: 'Noch nicht erfasst',
    en: 'Not recorded yet',
    fr: 'Pas encore saisi',
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
  oneDayAgo: { de: 'seit 1 Tag überfällig', en: '1 day overdue', fr: 'en retard d’1 jour' },
  deadlinePassed: { de: 'Frist abgelaufen', en: 'Deadline passed', fr: 'Délai dépassé' },
  daysAgo: {
    de: 'seit {n} Tagen überfällig',
    en: '{n} days overdue',
    fr: 'en retard de {n} jours',
  },
  dueOn: { de: 'Frist {date}', en: 'Due {date}', fr: 'Échéance {date}' },

  gapPlan: { de: 'Planung fehlt', en: 'Plan missing', fr: 'Planification manquante' },
  gapSafetyRiskAnswer: {
    de: 'Sicherheitsrisiko angeben',
    en: 'Safety risk not answered',
    fr: 'Risque de sécurité à indiquer',
  },
  gapSafetyConcept: {
    de: 'Sicherheitskonzept fehlt',
    en: 'Safety concept missing',
    fr: 'Concept de sécurité manquant',
  },

  upload: { de: 'Hochladen', en: 'Upload', fr: 'Téléverser' },
  uploadNewVersion: {
    de: 'Neue Version hochladen',
    en: 'Upload a new version',
    fr: 'Nouvelle version',
  },
  uploadDone: { de: 'Datei hochgeladen', en: 'File uploaded', fr: 'Fichier téléversé' },
  uploadFailed: {
    de: 'Die Datei konnte nicht hochgeladen werden.',
    en: 'The file could not be uploaded.',
    fr: "Le fichier n'a pas pu être téléversé.",
  },
  fileTooLarge: {
    de: 'Die Datei ist grösser als {n} MB.',
    en: 'The file is larger than {n} MB.',
    fr: 'Le fichier dépasse {n} Mo.',
  },
  fileTypeNotAllowed: {
    de: 'Dieser Dateityp wird nicht angenommen. Erlaubt: {types}.',
    en: 'This file type is not accepted. Allowed: {types}.',
    fr: "Ce type de fichier n'est pas accepté. Autorisés : {types}.",
  },
  fileUnreadable: {
    de: 'Die Datei lässt sich nicht öffnen. Ist sie vielleicht beschädigt?',
    en: 'The file cannot be opened. Could it be damaged?',
    fr: 'Le fichier ne peut pas être ouvert. Serait-il endommagé ?',
  },
  tooManyFiles: {
    de: 'Dieser Hof hat die höchste Zahl an Dateien erreicht. Melde dich beim Ressort.',
    en: 'This Hof has reached the most files it can hand in. Please contact the Ressort.',
    fr: 'Ce Hof a atteint le nombre maximal de fichiers. Contacte le Ressort.',
  },
  fileRules: {
    de: 'PDF, Word, Excel, PowerPoint, Bild oder ZIP · bis {n} MB',
    en: 'PDF, Word, Excel, PowerPoint, image or ZIP · up to {n} MB',
    fr: 'PDF, Word, Excel, PowerPoint, image ou ZIP · jusqu’à {n} Mo',
  },
  noFileYet: {
    de: 'Noch keine Datei abgegeben',
    en: 'No file handed in yet',
    fr: 'Aucun fichier déposé',
  },
  version: { de: 'Version {n}', en: 'Version {n}', fr: 'Version {n}' },
  uploadedOn: { de: 'hochgeladen am {date}', en: 'uploaded on {date}', fr: 'téléversé le {date}' },
  feedback: { de: 'Rückmeldung', en: 'Feedback', fr: 'Retour' },
  lastFeedback: { de: 'Letzte Rückmeldung', en: 'Last feedback', fr: 'Dernier retour' },

  safetyRiskQuestion: {
    de: 'Erhöhtes Sicherheitsrisiko?',
    en: 'Elevated safety risk?',
    fr: 'Risque de sécurité accru ?',
  },
  safetyCriteria: {
    de: 'Kriterien für erhöhtes Sicherheitsrisiko',
    en: 'Criteria for an elevated safety risk',
    fr: 'Critères de risque de sécurité accru',
  },
  safetyConcept: { de: 'Sicherheitskonzept', en: 'Safety concept', fr: 'Concept de sécurité' },
  safetyConceptRequired: {
    de: 'Sicherheitskonzept erforderlich',
    en: 'Safety concept required',
    fr: 'Concept de sécurité requis',
  },
  safetyConceptHint: {
    de: 'Bei erhöhtem Sicherheitsrisiko gehört ein Sicherheitskonzept zur Abgabe.',
    en: 'With an elevated safety risk, a safety concept is part of the submission.',
    fr: 'En cas de risque accru, un concept de sécurité fait partie du dépôt.',
  },
  saveFailed: {
    de: 'Speichern fehlgeschlagen.',
    en: 'Saving failed.',
    fr: "L'enregistrement a échoué.",
  },

  stadtleben: { de: 'Stadtleben', en: 'Stadtleben', fr: 'Stadtleben' },
  stadtlebenIntro: {
    de: 'Das Stadtleben-Konzept gibst du über die Standanmeldung ab. Anmeldungen deines Hofs erscheinen hier.',
    en: 'Hand in the Stadtleben concept through the stand registration. Registrations of your Hof appear here.',
    fr: "Le concept Stadtleben se dépose via l'inscription de stand. Les inscriptions de ton Hof apparaissent ici.",
  },
  stadtlebenNone: {
    de: 'Noch keine Standanmeldung mit deinem Hof verknüpft.',
    en: 'No stand registration linked to your Hof yet.',
    fr: 'Aucune inscription de stand liée à ton Hof pour le moment.',
  },
  stadtlebenRegister: {
    de: 'Stand anmelden',
    en: 'Register a stand',
    fr: 'Inscrire un stand',
  },
  stadtlebenApproved: { de: 'Freigegeben', en: 'Approved', fr: 'Approuvé' },
  stadtlebenPending: { de: 'In Prüfung', en: 'In review', fr: 'En cours de vérification' },
  stadtlebenUntitled: {
    de: 'Standanmeldung',
    en: 'Stand registration',
    fr: 'Inscription de stand',
  },
  submittedOn: { de: 'eingereicht am {date}', en: 'submitted on {date}', fr: 'déposé le {date}' },

  material: { de: 'Material', en: 'Material', fr: 'Matériel' },
  quantity: { de: 'Anzahl', en: 'Quantity', fr: 'Quantité' },
  quantityHint: {
    de: 'Ganze Stückzahlen, höchstens {n} pro Material.',
    en: 'Whole numbers, at most {n} per material.',
    fr: 'Nombres entiers, au maximum {n} par matériel.',
  },
  orderableUntil: {
    de: 'Bestellbar bis {date}',
    en: 'Orderable until {date}',
    fr: "Commandable jusqu'au {date}",
  },
  orderClosed: {
    de: 'Die Bestellfrist ist abgelaufen. Änderungen nimmt das Ressort entgegen.',
    en: 'The order deadline has passed. Contact the Ressort for changes.',
    fr: 'Le délai de commande est passé. Adresse-toi au Ressort pour toute modification.',
  },
  orderEmpty: {
    de: 'Für diese Bestellung ist noch kein Material erfasst.',
    en: 'No material recorded for this order yet.',
    fr: 'Aucun matériel saisi pour cette commande.',
  },
  powerConnection: {
    de: 'Stromanschluss benötigt',
    en: 'Power connection needed',
    fr: 'Raccordement électrique nécessaire',
  },
  retiredItems: {
    de: 'Nicht mehr auf der Liste, aber bestellt',
    en: 'No longer listed, but ordered',
    fr: 'Plus dans la liste, mais commandé',
  },
  orderListChanged: {
    de: 'Die Materialliste wurde in der Zwischenzeit geändert. Prüfe deine Mengen und speichere erneut.',
    en: 'The material list changed in the meantime. Check your quantities and save again.',
    fr: 'La liste du matériel a changé entre-temps. Vérifie tes quantités et enregistre à nouveau.',
  },
  save: { de: 'Speichern', en: 'Save', fr: 'Enregistrer' },
  saving: { de: 'Wird gespeichert …', en: 'Saving …', fr: 'Enregistrement …' },
  saved: { de: 'Gespeichert', en: 'Saved', fr: 'Enregistré' },
  lastSaved: {
    de: 'Zuletzt gespeichert am {date}',
    en: 'Last saved on {date}',
    fr: 'Enregistré le {date}',
  },

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
  showCriteriaLink: { de: 'Was zählt dazu?', en: 'What counts?', fr: "Qu'est-ce qui compte ?" },
  offline: {
    de: 'Keine Verbindung. Versuche es erneut, sobald du wieder Empfang hast.',
    en: 'No connection. Try again once you have signal.',
    fr: 'Pas de connexion. Réessaie dès que tu as du réseau.',
  },
  discardUnsaved: {
    de: 'Nicht gespeicherte Mengen oder ein laufender Upload gehen verloren. Trotzdem den Hof wechseln?',
    en: 'Unsaved quantities or an upload under way will be lost. Switch the Hof anyway?',
    fr: 'Des quantités non enregistrées ou un téléversement en cours seront perdus. Changer de Hof quand même ?',
  },
  unsavedChanges: {
    de: 'Nicht gespeicherte Änderungen',
    en: 'Unsaved changes',
    fr: 'Modifications non enregistrées',
  },
  uploadingFile: {
    de: '{name} wird hochgeladen',
    en: 'Uploading {name}',
    fr: 'Téléversement de {name}',
  },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
  earlierVersions: {
    de: 'Frühere Versionen ({n})',
    en: 'Earlier versions ({n})',
    fr: 'Versions précédentes ({n})',
  },
  areaDocuments: { de: 'Unterlagen', en: 'Documents', fr: 'Documents' },
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
