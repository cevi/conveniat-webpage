import type { StaticTranslationString } from '@/types/types';

/** Every string the story's and the challenges' pages show. */
export const storyTexts = {
  story: { de: 'Story', en: 'Story', fr: 'Histoire' },
  challenges: { de: 'Challenges', en: 'Challenges', fr: 'Défis' },
  events: { de: 'Ereignisse', en: 'Events', fr: 'Événements' },
  figures: { de: 'Figuren', en: 'Figures', fr: 'Personnages' },
  prologue: { de: 'Vorgeschichte', en: 'Backstory', fr: 'Préhistoire' },
  campWeek: { de: 'Lagerwoche', en: 'Camp week', fr: 'Semaine de camp' },
  forLeaders: {
    de: 'Für Leitende, damit ihr Fragen eurer TNs beantworten könnt. Neues erscheint jeweils, nachdem es im Lager passiert ist.',
    en: 'For Leitende, to answer your participants’ questions. New parts appear once they have happened at the camp.',
    fr: 'Pour les responsables, pour répondre aux questions des participant·e·s. La suite apparaît une fois vécue au camp.',
  },
  nothingYet: {
    de: 'Die Story beginnt bald',
    en: 'The story begins soon',
    fr: 'L’histoire commence bientôt',
  },
  nothingYetText: {
    de: 'Sobald etwas passiert ist, steht es hier.',
    en: 'As soon as something has happened, it is here.',
    fr: 'Dès que quelque chose s’est passé, c’est ici.',
  },
  noFigures: {
    de: 'Noch keine Figur ist aufgetreten.',
    en: 'No figure has appeared yet.',
    fr: 'Aucun personnage n’est encore apparu.',
  },
  court: { de: 'Hofstaat des Königs', en: 'The king’s court', fr: 'La cour du roi' },
  quartier: { de: 'Quartieroberhäupter', en: 'Heads of the Quartiere', fr: 'Chefs des Quartiers' },
  other: { de: 'Weitere Figuren', en: 'Other figures', fr: 'Autres personnages' },
  isNew: { de: 'Neu', en: 'New', fr: 'Nouveau' },
  whatWeKnow: { de: 'Was wir wissen', en: 'What we know', fr: 'Ce que l’on sait' },
  relations: { de: 'Beziehungen', en: 'Relationships', fr: 'Relations' },
  appearsIn: { de: 'Kommt vor in', en: 'Appears in', fr: 'Apparaît dans' },
  involved: { de: 'Beteiligte Figuren', en: 'Figures involved', fr: 'Personnages' },
  inProgramme: { de: 'Im Programm', en: 'In the programme', fr: 'Au programme' },
  places: { de: 'Orte', en: 'Places', fr: 'Lieux' },
  showOnMap: { de: 'Auf der Karte zeigen', en: 'Show on the map', fr: 'Voir sur la carte' },
  back: { de: 'Zurück', en: 'Back', fr: 'Retour' },
  notFound: {
    de: 'Nicht gefunden',
    en: 'Not found',
    fr: 'Introuvable',
  },
  notFoundText: {
    de: 'Das gibt es (noch) nicht. Vielleicht kommt es später in der Woche.',
    en: 'This does not exist (yet). It may come later in the week.',
    fr: 'Cela n’existe pas (encore). Peut-être plus tard dans la semaine.',
  },
  leadersOnly: {
    de: 'Nur für Leitende',
    en: 'For Leitende only',
    fr: 'Réservé aux responsables',
  },
  leadersOnlyText: {
    de: 'Story und Challenges sind für die Leitenden, die sie ihren TNs weitergeben.',
    en: 'The story and the challenges are for the Leitende, who pass them on to their participants.',
    fr: 'L’histoire et les défis sont pour les responsables, qui les transmettent.',
  },
  signInTitle: {
    de: 'Melde dich an',
    en: 'Sign in',
    fr: 'Connecte-toi',
  },
  signIn: {
    de: 'Mit Cevi.DB anmelden',
    en: 'Sign in with Cevi.DB',
    fr: 'Se connecter avec Cevi.DB',
  },
  loadFailed: {
    de: 'Konnte nicht geladen werden.',
    en: 'Could not be loaded.',
    fr: 'Impossible de charger.',
  },
  challengeFrom: {
    de: '{name} fordert euch heraus',
    en: '{name} challenges you',
    fr: '{name} vous défie',
  },
  confirmHint: {
    de: 'Erfüllt? Kommt mit euren TNs zum Infopoint, dort gibt es die Bestätigung.',
    en: 'Done? Come to the Infopoint with your participants to have it confirmed.',
    fr: 'Réussi ? Venez à l’Infopoint avec vos participant·e·s pour la confirmation.',
  },
  noChallenges: {
    de: 'Noch keine Challenges',
    en: 'No challenges yet',
    fr: 'Pas encore de défis',
  },
  noChallengesText: {
    de: 'Challenges erscheinen am Morgen ihres Tages.',
    en: 'Challenges appear in the morning of their day.',
    fr: 'Les défis apparaissent le matin de leur jour.',
  },
  until: { de: 'Bis {time}', en: 'Until {time}', fr: 'Jusqu’à {time}' },
  isOver: { de: 'Vorbei', en: 'Over', fr: 'Terminé' },
  task: { de: 'Aufgabe', en: 'Task', fr: 'Tâche' },
  confirmAt: { de: 'Bestätigung', en: 'Confirmation', fr: 'Confirmation' },
  figureInStory: { de: 'Figur in der Story', en: 'Figure in the story', fr: 'Personnage' },
  challengeToday: { de: 'Challenge', en: 'Challenge', fr: 'Défi' },
  newInStory: { de: 'Neu in der Story', en: 'New in the story', fr: 'Nouveau dans l’histoire' },
  allChallenges: { de: 'Alle Challenges', en: 'All challenges', fr: 'Tous les défis' },
  chooseDay: { de: 'Tag wählen', en: 'Choose a day', fr: 'Choisir un jour' },
} satisfies Record<string, StaticTranslationString>;

/** A text with `{name}`-style placeholders filled in. */
export const fillStoryText = (text: string, values: Record<string, string>): string =>
  text.replaceAll(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
