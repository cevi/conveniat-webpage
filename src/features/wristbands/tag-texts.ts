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
  hofWithAvp: { de: 'Hof · AVP {names}', en: 'Hof · AVP {names}', fr: 'Hof · AVP {names}' },
  hofWithoutAvp: {
    de: 'Hof · keine AVP mit der App',
    en: 'Hof · no AVP with the app',
    fr: 'Hof · aucune AVP avec l’app',
  },
  chatWithAvp: {
    de: 'Chat mit der AVP des Hofs starten',
    en: 'Start a chat with the AVP of the Hof',
    fr: 'Démarrer un chat avec l’AVP du Hof',
  },
  chatWith: { de: 'mit {name}', en: 'with {name}', fr: 'avec {name}' },
  chatNoApp: {
    de: '{name} hat die App nicht',
    en: '{name} does not have the app',
    fr: '{name} n’a pas l’app',
  },
  chat: { de: 'Chat', en: 'Chat', fr: 'Chat' },
  noAvp: {
    de: 'Niemand von der AVP dieses Hofs hat die App.',
    en: 'Nobody of this Hof’s AVP has the app.',
    fr: 'Personne de l’AVP de ce Hof n’a l’app.',
  },
  checkBand: { de: 'Band prüfen', en: 'Check the wristband', fr: 'Vérifier le bracelet' },
  unlockTitle: {
    de: 'Nochmals ans Handy halten',
    en: 'Hold it to the phone again',
    fr: 'Retiens-le contre le téléphone',
  },
  unlockSafety: {
    de: 'Zeigt Hof, Quartier und die AVP',
    en: 'Shows the Hof, the Quartier and the AVP',
    fr: 'Affiche le Hof, le Quartier et l’AVP',
  },
  unlockWaiting: {
    de: 'Wartet auf das Band …',
    en: 'Waiting for the wristband …',
    fr: 'En attente du bracelet …',
  },
  unlockChecking: { de: 'Wird geprüft …', en: 'Checking …', fr: 'Vérification …' },
  rescanTitle: {
    de: 'Erneut scannen, um Details zu sehen oder einen Chat zu starten',
    en: 'Scan again to see details or start a chat',
    fr: 'Scanne à nouveau pour voir les détails ou démarrer un chat',
  },
  rescanDescription: {
    de: 'Halte das Band nochmals ans Handy. Die Nummer allein könnte auch erraten sein.',
    en: 'Hold the wristband to the phone once more. The number alone could also be guessed.',
    fr: 'Tiens encore une fois le bracelet contre le téléphone. Le numéro seul pourrait aussi être deviné.',
  },
  rescanInApp: {
    de: 'Öffne das Band dazu in der conveniat27-App auf einem Handy mit NFC.',
    en: 'To do so, open the wristband in the conveniat27 app on a phone with NFC.',
    fr: 'Pour cela, ouvre le bracelet dans l’app conveniat27 sur un téléphone avec NFC.',
  },
  otherBandTitle: {
    de: 'Das ist ein anderes Band',
    en: 'This is another wristband',
    fr: 'C’est un autre bracelet',
  },
  otherBandDescription: {
    de: 'Das Band am Handy ist nicht das, dessen Seite offen ist.',
    en: 'The wristband on the phone is not the one whose page is open.',
    fr: 'Le bracelet contre le téléphone n’est pas celui dont la page est ouverte.',
  },
  showOtherBand: {
    de: 'Dieses Band zeigen',
    en: 'Show that wristband',
    fr: 'Afficher ce bracelet',
  },
  notVerified: {
    de: 'Prüfe das Band zuerst, dann kannst du einen Chat starten.',
    en: 'Check the wristband first, then you can start a chat.',
    fr: 'Vérifie d’abord le bracelet, ensuite tu pourras démarrer un chat.',
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
