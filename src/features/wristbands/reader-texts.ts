import type { NfcFailureCode } from '@/features/wristbands/native-nfc';
import type { NfcFailureText } from '@/features/wristbands/texts';
import { nfcFailureText } from '@/features/wristbands/texts';
import type { Locale, StaticTranslationString } from '@/types/types';

/** The words of the page security and first aid read a band on. `{n}` and the like are filled in. */
export const readerTexts = {
  read: { de: 'Armband lesen', en: 'Read a wristband', fr: 'Lire un bracelet' },
  retry: { de: 'Nochmals versuchen', en: 'Try again', fr: 'Réessayer' },
  close: { de: 'Schliessen', en: 'Close', fr: 'Fermer' },
  uid: { de: 'Band {uid}', en: 'Band {uid}', fr: 'Bracelet {uid}' },
  signInTitle: {
    de: 'Melde dich an, um Armbänder zu sehen.',
    en: 'Log in to see wristbands.',
    fr: 'Connecte-toi pour voir les bracelets.',
  },
  signIn: { de: 'Anmelden mit Cevi.DB', en: 'Login with Cevi.DB', fr: 'Connexion avec Cevi.DB' },
  holdBandHint: {
    de: 'Halte es ruhig, bis das Handy es gelesen hat.',
    en: 'Hold it still until the phone has read it.',
    fr: 'Tiens-le immobile jusqu’à ce que le téléphone l’ait lu.',
  },
  notInAppTitle: {
    de: 'Armbänder liest du in der App',
    en: 'Wristbands are read in the app',
    fr: 'Les bracelets se lisent dans l’app',
  },
  notInAppDescription: {
    // a non-breaking hyphen: the balanced wrap would otherwise split the name after `conveniat27-`
    de: 'Öffne diese Seite in der conveniat27\u2011App auf einem Handy mit NFC.',
    en: 'Open this page in the conveniat27 app on a phone with NFC.',
    fr: 'Ouvre cette page dans l’app conveniat27 sur un téléphone avec NFC.',
  },
  notReaderTitle: {
    de: 'Nur für Sicherheit und Sanität',
    en: 'For security and first aid only',
    fr: 'Réservé à la sécurité et aux samaritains',
  },
  notReaderDescription: {
    de: 'Wer ein Armband trägt, sehen nur die Sicherheit und die Sanität des conveniat27.',
    en: 'Only security and first aid of conveniat27 see who wears a wristband.',
    fr: 'Seuls la sécurité et les samaritains du conveniat27 voient qui porte un bracelet.',
  },
  hof: { de: 'Hof', en: 'Hof', fr: 'Hof' },
  lockedUntilScan: {
    de: 'erst nach nochmaligem Scannen',
    en: 'only after scanning again',
    fr: 'seulement après un nouveau scan',
  },
  quartier: { de: 'Quartier', en: 'Quartier', fr: 'Quartier' },
  noQuartier: { de: 'Kein Quartier', en: 'No Quartier', fr: 'Pas de Quartier' },
  notGenuineTitle: {
    de: 'Kein echtes conveniat27-Armband',
    en: 'Not a genuine conveniat27 wristband',
    fr: 'Pas un vrai bracelet conveniat27',
  },
  notGenuineDescription: {
    de: 'Der Chip dieses Bands trägt keine gültige Signatur. Es ist eine Kopie oder stammt nicht vom conveniat27.',
    en: 'The chip of this band carries no valid signature. It is a copy or not from conveniat27.',
    fr: 'La puce de ce bracelet ne porte pas de signature valide. C’est une copie ou il ne vient pas du conveniat27.',
  },
  revokedTitle: { de: 'Gesperrt', en: 'Blocked', fr: 'Bloqué' },
  revokedDescription: {
    de: 'Dieses Band wurde als verloren gesperrt und nennt niemanden mehr.',
    en: 'This band was blocked as lost and names nobody any more.',
    fr: 'Ce bracelet a été bloqué comme perdu et ne nomme plus personne.',
  },
  unassignedTitle: {
    de: 'Noch niemandem gegeben',
    en: 'Not handed to anyone yet',
    fr: 'Remis à personne encore',
  },
  unassignedDescription: {
    de: 'Der Hof {hof} hat das Band programmiert, aber noch niemandem gegeben.',
    en: 'The Hof {hof} programmed this band but has not handed it to anyone yet.',
    fr: 'Le Hof {hof} a programmé ce bracelet, mais ne l’a encore remis à personne.',
  },
  unassignedNoHofDescription: {
    de: 'Ein Hof hat das Band programmiert, aber noch niemandem gegeben.',
    en: 'A Hof programmed this band but has not handed it to anyone yet.',
    fr: 'Un Hof a programmé ce bracelet, mais ne l’a encore remis à personne.',
  },
  unknownTitle: { de: 'Unbekanntes Band', en: 'Unknown band', fr: 'Bracelet inconnu' },
  unknownDescription: {
    de: 'Dieses Band ist nicht programmiert.',
    en: 'This band has not been programmed.',
    fr: 'Ce bracelet n’est pas programmé.',
  },
  unknownOnRosterDescription: {
    de: 'Dieses Band steht nicht auf der Liste auf dem Handy.',
    en: 'This band is not on the list on the phone.',
    fr: 'Ce bracelet ne figure pas sur la liste du téléphone.',
  },
  notCheckedTitle: {
    de: 'Echtheit nicht geprüft',
    en: 'Authenticity not checked',
    fr: 'Authenticité non vérifiée',
  },
  notCheckedNoSignature: {
    de: 'Dieses Band gibt keine Signatur heraus, seine Echtheit lässt sich nicht prüfen.',
    en: 'This band gives out no signature, so its authenticity cannot be checked.',
    fr: 'Ce bracelet ne livre pas de signature, son authenticité ne peut pas être vérifiée.',
  },
  fromRosterTitle: {
    de: 'Aus der Liste auf dem Handy, Stand {time}',
    en: 'From the list on the phone, as of {time}',
    fr: 'De la liste du téléphone, état au {time}',
  },
  fromRosterDescription: {
    de: 'Keine Verbindung. Was seither gesperrt oder vergeben wurde, fehlt darin.',
    en: 'No connection. Bands blocked or handed out since then are missing.',
    fr: 'Pas de connexion. Ce qui a été bloqué ou remis depuis n’y figure pas.',
  },
  roster: { de: 'Liste auf dem Handy', en: 'List on the phone', fr: 'Liste du téléphone' },
  rosterSummary: {
    de: '{n} Bänder · Stand {time}',
    en: '{n} bands · as of {time}',
    fr: '{n} bracelets · état au {time}',
  },
  rosterLoading: {
    de: 'Liste wird geladen …',
    en: 'Loading the list …',
    fr: 'Chargement de la liste …',
  },
  rosterRefreshing: {
    de: 'Wird aktualisiert …',
    en: 'Updating …',
    fr: 'Mise à jour …',
  },
  rosterMissing: {
    de: 'Noch keine Liste auf dem Handy. Öffne diese Seite einmal mit Verbindung, dann liest du Bänder auch ohne.',
    en: 'No list on the phone yet. Open this page once with a connection, then you can read bands without one.',
    fr: 'Pas encore de liste sur le téléphone. Ouvre cette page une fois avec une connexion, puis tu pourras lire les bracelets sans.',
  },
  rosterHint: {
    de: 'Damit liest du Bänder auch ohne Verbindung. Sie wird jedes Mal aufgefrischt, wenn du diese Seite mit Verbindung öffnest.',
    en: 'With it you read bands without a connection too. It is refreshed whenever you open this page with a connection.',
    fr: 'Elle te permet de lire les bracelets sans connexion. Elle est rafraîchie chaque fois que tu ouvres cette page avec une connexion.',
  },
} satisfies Record<string, StaticTranslationString>;

/** A text of the reader's page in `locale`, with its `{name}` placeholders filled in. */
export const readerText = (
  key: keyof typeof readerTexts,
  locale: Locale,
  values: Record<string, string | number> = {},
): string =>
  readerTexts[key][locale].replaceAll(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );

/** When something happened, in the camp's time, whatever timezone the phone is set to. */
export const formatCampTime = (timestamp: number, locale: Locale): string =>
  new Intl.DateTimeFormat(`${locale}-CH`, {
    timeZone: 'Europe/Zurich',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);

/**
 * Why a read gave no answer: a failed session, no connection and no list on the phone, or no
 * connection and no signature read, without which the list names nobody.
 */
export type ReadFailureCode = NfcFailureCode | 'no-roster' | 'no-signature';

/** A failed read, and whether reading the same band again may work. */
export interface ReadFailureText extends NfcFailureText {
  retry: boolean;
}

const readFailureTexts: Partial<Record<ReadFailureCode, ReadFailureText>> = {
  'no-roster': {
    title: { de: 'Keine Verbindung', en: 'No connection', fr: 'Pas de connexion' },
    description: readerTexts.rosterMissing,
    retry: true,
  },
  'no-signature': {
    title: {
      de: 'Ohne Verbindung nicht lesbar',
      en: 'Cannot be read offline',
      fr: 'Illisible hors connexion',
    },
    description: {
      de: 'Halte das Band nochmals ruhig ans Handy.',
      en: 'Hold the band still to the phone again.',
      fr: 'Tiens à nouveau le bracelet immobile contre le téléphone.',
    },
    retry: true,
  },
  timeout: {
    title: { de: 'Kein Band gefunden', en: 'No band found', fr: 'Aucun bracelet trouvé' },
    description: {
      de: 'Halte das Band an die Rückseite des Handys, gleich nachdem du «Armband lesen» getippt hast.',
      en: 'Hold the band to the back of the phone right after tapping “Read a wristband”.',
      fr: 'Tiens le bracelet contre le dos du téléphone juste après avoir touché « Lire un bracelet ».',
    },
    retry: true,
  },
  unsupported: {
    title: {
      de: 'Dieses Handy hat kein NFC',
      en: 'This phone has no NFC',
      fr: 'Ce téléphone n’a pas de NFC',
    },
    description: {
      de: 'Lies die Bänder mit einem anderen Handy.',
      en: 'Read the bands with another phone.',
      fr: 'Lis les bracelets avec un autre téléphone.',
    },
    retry: false,
  },
};

/** What to tell security and first aid for a read that failed with `code`. */
export const readFailureText = (code: ReadFailureCode): ReadFailureText =>
  // reading writes nothing, so trying the same band again never hurts
  readFailureTexts[code] ?? {
    ...nfcFailureText(code === 'no-roster' || code === 'no-signature' ? 'unknown' : code),
    retry: true,
  };
