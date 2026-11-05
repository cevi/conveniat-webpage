import type { StaticTranslationString } from '@/types/types';

export const forumMapText = {
  reportHere: {
    de: 'Hier etwas melden',
    en: 'Report something here',
    fr: 'Signaler quelque chose ici',
  },
  closeMenu: { de: 'Schliessen', en: 'Close', fr: 'Fermer' },
  layerOn: {
    de: 'Meldungen auf der Karte ausblenden',
    en: 'Hide reports on the map',
    fr: 'Masquer les signalements sur la carte',
  },
  layerOff: {
    de: 'Meldungen auf der Karte einblenden',
    en: 'Show reports on the map',
    fr: 'Afficher les signalements sur la carte',
  },
  reportsHere: { de: 'Meldungen hier', en: 'Reports here', fr: 'Signalements ici' },
  pickTitle: { de: 'Standort wählen', en: 'Choose a location', fr: 'Choisir un emplacement' },
  pickHint: {
    de: 'Verschiebe die Karte, bis der Pin auf dem Ort steht.',
    en: 'Move the map until the pin is on the spot.',
    fr: 'Déplace la carte jusqu’à ce que l’épingle soit sur le lieu.',
  },
  here: { de: 'Hier', en: 'Here', fr: 'Ici' },
  exactlyHere: { de: 'Genau hier', en: 'Exactly here', fr: 'Exactement ici' },
  withoutEntry: { de: 'Ohne Kartenpunkt', en: 'Without a map entry', fr: 'Sans point de carte' },
  entryDistance: {
    de: 'Kartenpunkt · {m} m vom Pin',
    en: 'Map entry · {m} m from the pin',
    fr: 'Point de carte · {m} m de l’épingle',
  },
  useLocation: {
    de: 'Diesen Standort verwenden',
    en: 'Use this location',
    fr: 'Utiliser cet emplacement',
  },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
  forum: { de: 'conveniat27 Forum', en: 'conveniat27 Forum', fr: 'Forum conveniat27' },
  otherProblem: {
    de: 'Anderes Problem melden',
    en: 'Report another problem',
    fr: 'Signaler un autre problème',
  },
  reportProblem: { de: 'Problem melden', en: 'Report a problem', fr: 'Signaler un problème' },
  newPostHere: {
    de: 'Neuer Beitrag mit diesem Ort',
    en: 'New post with this place',
    fr: 'Nouvelle publication avec ce lieu',
  },
  meToo: { de: 'Ich auch', en: 'Me too', fr: 'Moi aussi' },
} satisfies Record<string, StaticTranslationString>;
