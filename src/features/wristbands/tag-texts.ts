import type { Locale, StaticTranslationString } from '@/types/types';

/** The words of the page a tapped band opens, `/tag/{uid}`. `{name}` and the like are filled in. */
export const tagTexts = {
  sheetTitle: { de: 'Armband', en: 'Wristband', fr: 'Bracelet' },
  bandTitle: {
    de: 'Das ist ein Armband des conveniat27',
    en: 'This is a conveniat27 wristband',
    fr: 'C’est un bracelet du conveniat27',
  },
  appStore: { de: 'Im App Store laden', en: 'Get it on the App Store', fr: 'Sur l’App Store' },
  playStore: { de: 'Bei Google Play laden', en: 'Get it on Google Play', fr: 'Sur Google Play' },
  nobodyDescription: {
    de: 'Zu diesem Armband gibt es nichts anzuzeigen.',
    en: 'There is nothing to show for this wristband.',
    fr: 'Il n’y a rien à afficher pour ce bracelet.',
  },
  ownTitle: { de: 'Das ist dein Armband', en: 'This is your wristband', fr: 'C’est ton bracelet' },
  ownDescription: {
    de: 'Wer es mit dem Handy antippt, sieht deinen Cevinamen und kann mit dir einen Chat starten.',
    en: 'Whoever taps it with a phone sees your Ceviname and can start a chat with you.',
    fr: 'Qui le touche avec un téléphone voit ton nom Cevi et peut démarrer un chat avec toi.',
  },
  wornBy: { de: 'trägt dieses Armband', en: 'wears this wristband', fr: 'porte ce bracelet' },
  someone: {
    de: 'Jemand vom conveniat27',
    en: 'Someone from conveniat27',
    fr: 'Quelqu’un du conveniat27',
  },
  startChat: { de: 'Chat starten', en: 'Start chat', fr: 'Démarrer un chat' },
  startChatWith: {
    de: 'Chat mit {name} starten',
    en: 'Start a chat with {name}',
    fr: 'Démarrer un chat avec {name}',
  },
  noAccount: {
    de: 'Diese Person hat die App noch nicht, ein Chat geht deshalb nicht.',
    en: 'This person does not have the app yet, so a chat is not possible.',
    fr: 'Cette personne n’a pas encore l’app, un chat n’est donc pas possible.',
  },
  ownBand: {
    de: 'Das ist dein eigenes Armband.',
    en: 'This is your own wristband.',
    fr: 'C’est ton propre bracelet.',
  },
  bandGone: {
    de: 'Dieses Armband nennt niemanden mehr.',
    en: 'This wristband names nobody any more.',
    fr: 'Ce bracelet ne nomme plus personne.',
  },
  chatFailed: {
    de: 'Der Chat konnte nicht gestartet werden.',
    en: 'The chat could not be started.',
    fr: 'Le chat n’a pas pu être démarré.',
  },
  hofAvp: { de: 'AVP des Hofs', en: 'AVP of the Hof', fr: 'AVP du Hof' },
  noAvp: {
    de: 'Niemand von der AVP dieses Hofs hat die App.',
    en: 'Nobody of this Hof’s AVP has the app.',
    fr: 'Personne de l’AVP de ce Hof n’a l’app.',
  },
  loadFailed: {
    de: 'Das Armband konnte nicht geladen werden.',
    en: 'The wristband could not be loaded.',
    fr: 'Le bracelet n’a pas pu être chargé.',
  },
} satisfies Record<string, StaticTranslationString>;

/** A text of the band's page in `locale`, with its `{name}` placeholders filled in. */
export const tagText = (
  key: keyof typeof tagTexts,
  locale: Locale,
  values: Record<string, string | number> = {},
): string =>
  tagTexts[key][locale].replaceAll(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );
