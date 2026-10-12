import type { StaticTranslationString } from '@/types/types';

export const scheduleLabels = {
  admin: { de: 'Administration', en: 'Administration', fr: 'Administration' },
  participants: { de: 'Teilnehmer', en: 'Participants', fr: 'Participants' },
  createChat: {
    de: 'Gruppenchat erstellen',
    en: 'Create Group Chat',
    fr: 'Créer un chat de groupe',
  },
  editDetails: { de: 'Details bearbeiten', en: 'Edit details', fr: 'Modifier les détails' },
  save: { de: 'Speichern', en: 'Save', fr: 'Enregistrer' },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
  enrolled: { de: 'Angemeldet', en: 'Enrolled', fr: 'Inscrit' }, // Adjusted to match previous usage
  targetGroup: { de: 'Zielgruppe', en: 'Target Group', fr: 'Groupe cible' },
  noParticipants: {
    de: 'Noch keine Teilnehmer',
    en: 'No participants yet',
    fr: 'Pas encore de participants',
  },
  enrolledBadge: { de: 'Angemeldet', en: 'Enrolled', fr: 'Inscrit' },
} as const satisfies Record<string, StaticTranslationString>;

export const programmeLabels = {
  wholeCamp: { de: 'Ganzes Lager', en: 'Whole camp', fr: 'Tout le camp' },
  now: { de: 'Jetzt', en: 'Now', fr: 'Maintenant' },
  upNext: { de: 'Als Nächstes', en: 'Up next', fr: 'Ensuite' },
  inMinutes: { de: 'in {{duration}}', en: 'in {{duration}}', fr: 'dans {{duration}}' },
  minutesLeft: { de: 'noch {{duration}}', en: '{{duration}} left', fr: 'encore {{duration}}' },
  afterwards: { de: 'Danach', en: 'Afterwards', fr: 'Après' },
  today: { de: 'Heute', en: 'Today', fr: "Aujourd'hui" },
  overview: { de: 'Überblick', en: 'Overview', fr: 'Aperçu' },
  steps: { de: 'Ablauf', en: 'Schedule', fr: 'Déroulement' },
  material: { de: 'Material', en: 'Material', fr: 'Matériel' },
  safety: { de: 'Sicherheit', en: 'Safety', fr: 'Sécurité' },
  bring: { de: 'Mitnehmen', en: 'What to bring', fr: 'À emporter' },
  intro: { de: 'Einstieg', en: 'Introduction', fr: 'Introduction' },
  main: { de: 'Hauptteil', en: 'Main part', fr: 'Partie principale' },
  end: { de: 'Schluss', en: 'Ending', fr: 'Conclusion' },
  leadersOnly: {
    de: 'Nur für Leitende sichtbar',
    en: 'Only visible to Leitende',
    fr: 'Visible uniquement pour les Leitende',
  },
  materialList: { de: 'Material-Liste', en: 'Material list', fr: 'Liste de matériel' },
  attachments: { de: 'Beilagen', en: 'Attachments', fr: 'Annexes' },
  safetyNotes: {
    de: 'Sicherheitsüberlegungen',
    en: 'Safety considerations',
    fr: 'Réflexions sur la sécurité',
  },
  safeguarding: {
    de: 'Prävention sexueller Ausbeutung',
    en: 'Prevention of sexual exploitation',
    fr: "Prévention de l'exploitation sexuelle",
  },
  badWeather: { de: 'Schlechtwetter', en: 'Bad weather', fr: 'Mauvais temps' },
  showOnMap: { de: 'Auf der Karte zeigen', en: 'Show on the map', fr: 'Afficher sur la carte' },
  otherSlots: {
    de: 'Dieser Block zu anderen Zeiten',
    en: 'This block at other times',
    fr: "Ce bloc à d'autres heures",
  },
  form: {
    rp: { de: 'Ressortprogramm', en: 'Ressortprogramm', fr: 'Ressortprogramm' },
    hp: { de: 'Hofprogramm', en: 'Hofprogramm', fr: 'Hofprogramm' },
    hpStar: { de: 'Hofprogramm*', en: 'Hofprogramm*', fr: 'Hofprogramm*' },
  },
} as const;
