import type { NfcAbortReason, NfcFailureCode } from '@/features/wristbands/native-nfc';
import type { Locale, StaticTranslationString } from '@/types/types';

/**
 * The words of the AVP's wristband page. `{n}`, `{name}` and the like are filled in. The page
 * never shows a band's UID: an AVP tells bands apart by who wears them, not by a number.
 */
export const wristbandTexts = {
  notInAppTitle: {
    de: 'Bänder programmierst du in der App',
    en: 'Bands are programmed in the app',
    fr: 'Les bracelets se programment dans l’app',
  },
  notInAppDescription: {
    de: 'Öffne diese Seite in der conveniat27-App auf einem Handy mit NFC.',
    en: 'Open this page in the conveniat27 app on a phone with NFC.',
    fr: 'Ouvre cette page dans l’app conveniat27 sur un téléphone avec NFC.',
  },
  noHofTitle: {
    de: 'Kein Hof',
    en: 'No Hof',
    fr: 'Pas de Hof',
  },
  noHofDescription: {
    de: 'Nur die AVP eines Hofs programmiert und vergibt die Armbänder ihres Hofs.',
    en: 'Only the AVP of a Hof programs and hands out its wristbands.',
    fr: 'Seule l’AVP d’un Hof programme et remet les bracelets de son Hof.',
  },
  searchStation: {
    de: 'Name oder Ceviname',
    en: 'Name or Ceviname',
    fr: 'Nom ou Ceviname',
  },
  withoutBandIn: {
    de: '{abteilung} · {n} ohne Band',
    en: '{abteilung} · {n} without a band',
    fr: '{abteilung} · {n} sans bracelet',
  },
  withoutBandCount: {
    de: 'Noch ohne Band · {n}',
    en: 'Still without a band · {n}',
    fr: 'Encore sans bracelet · {n}',
  },
  found: { de: 'Gefunden · {n}', en: 'Found · {n}', fr: 'Trouvé·e·s · {n}' },
  nobodyFound: {
    de: 'Niemand mit diesem Namen in deinem Hof.',
    en: 'Nobody of this name in your Hof.',
    fr: 'Personne de ce nom dans ton Hof.',
  },
  everyoneDone: {
    de: 'Alle {n} tragen ein Band',
    en: 'All {n} wear a band',
    fr: 'Les {n} portent un bracelet',
  },
  everyoneDoneHint: {
    de: 'Ist ein Band verloren gegangen? Such den Namen oben.',
    en: 'Was a band lost? Search the name above.',
    fr: 'Un bracelet a été perdu ? Cherche le nom ci-dessus.',
  },
  wearsBand: { de: 'hat Band', en: 'has a band', fr: 'a un bracelet' },
  wearsBandSince: {
    de: 'Trägt ein Band.',
    en: 'Wears a band.',
    fr: 'Porte un bracelet.',
  },
  giveNewBand: { de: 'Neues Band geben', en: 'Give a new band', fr: 'Donner un nouveau bracelet' },
  giveNewBandHint: {
    de: 'Das alte ist verloren oder kaputt',
    en: 'The old one is lost or broken',
    fr: 'L’ancien est perdu ou cassé',
  },
  newBand: { de: 'Neues Band', en: 'New band', fr: 'Nouveau bracelet' },
  holdNewBand: {
    de: 'Neues Band ans Handy halten',
    en: 'Hold the new band to the phone',
    fr: 'Tiens le nouveau bracelet contre le téléphone',
  },
  holdBandShort: {
    de: 'An die Rückseite, bis es vibriert.',
    en: 'To the back, until the phone vibrates.',
    fr: 'Contre le dos, jusqu’à ce que le téléphone vibre.',
  },
  oldBandBlocked: {
    de: 'Das alte Band wird gesperrt und nennt danach niemanden mehr. Nur die Admins geben es wieder frei.',
    en: 'The old band is blocked and names nobody afterwards. Only the admins release it again.',
    fr: 'L’ancien bracelet est bloqué et ne nomme plus personne. Seuls les admins le débloquent.',
  },
  bandIsNow: {
    de: 'Band gehört jetzt {name}',
    en: 'The band is now {name}’s',
    fr: 'Le bracelet est maintenant à {name}',
  },
  bandIsNowHint: {
    de: 'Ans Handgelenk, dann die nächste Person.',
    en: 'Onto the wrist, then the next person.',
    fr: 'Au poignet, puis la personne suivante.',
  },
  nextPerson: { de: 'Nächste Person', en: 'Next person', fr: 'Personne suivante' },
  undoing: { de: 'Wird rückgängig gemacht …', en: 'Undoing …', fr: 'Annulation …' },
  close: { de: 'Schliessen', en: 'Close', fr: 'Fermer' },
  helpers: { de: 'Helfende', en: 'Helpers', fr: 'Aides' },
  manageHelpers: {
    de: 'Helfende an den Stationen',
    en: 'Helpers at the stations',
    fr: 'Aides aux postes',
  },
  helpersHint: {
    de: 'Helfende vergeben und ersetzen an ihrer eigenen Station Bänder deines Hofs, bis du sie wieder entfernst.',
    en: 'Helpers give and replace bands of your Hof at their own station, until you remove them.',
    fr: 'Les aides remettent et remplacent les bracelets de ton Hof à leur propre poste, jusqu’à ce que tu les retires.',
  },
  noHelpers: {
    de: 'Noch niemand hilft.',
    en: 'Nobody helps yet.',
    fr: 'Personne n’aide encore.',
  },
  removeHelper: { de: 'Entfernen', en: 'Remove', fr: 'Retirer' },
  removeHelperLabel: {
    de: '{name} als Helfer/in entfernen',
    en: 'Remove {name} as a helper',
    fr: 'Retirer {name} des aides',
  },
  addHelper: { de: 'Hinzufügen', en: 'Add', fr: 'Ajouter' },
  addHelperLabel: {
    de: '{name} als Helfer/in hinzufügen',
    en: 'Add {name} as a helper',
    fr: 'Ajouter {name} aux aides',
  },
  addHelpers: {
    de: 'Aus deinem Hof hinzufügen',
    en: 'Add from your Hof',
    fr: 'Ajouter depuis ton Hof',
  },
  youHelp: {
    de: 'Du hilfst an einer Station',
    en: 'You help at a station',
    fr: 'Tu aides à un poste',
  },
  loading: { de: 'Lädt …', en: 'Loading …', fr: 'Chargement …' },
  loadFailed: {
    de: 'Die Armbänder konnten nicht geladen werden.',
    en: 'The wristbands could not be loaded.',
    fr: 'Les bracelets n’ont pas pu être chargés.',
  },
  reload: { de: 'Nochmals laden', en: 'Load again', fr: 'Recharger' },
  chooseHof: { de: 'Hof wählen', en: 'Choose Hof', fr: 'Choisir le Hof' },
  withBand: {
    de: '{n} / {total} mit Band',
    en: '{n} / {total} with a band',
    fr: '{n} / {total} avec bracelet',
  },
  holdBand: {
    de: 'Band ans Handy halten',
    en: 'Hold a band to the phone',
    fr: 'Tiens un bracelet contre le téléphone',
  },
  holdBandHint: {
    de: 'An die Rückseite, immer nur ein Band aufs Mal, und liegen lassen, bis es vibriert.',
    en: 'To the back, one band at a time, and keep it there until the phone vibrates.',
    fr: 'Contre le dos, un seul bracelet à la fois, et laisse-le jusqu’à ce que le téléphone vibre.',
  },
  checking: {
    de: 'Band wird geprüft …',
    en: 'Checking the band …',
    fr: 'Vérification du bracelet …',
  },
  writing: {
    de: 'Band wird geschrieben, nicht wegnehmen …',
    en: 'Writing the band, keep it there …',
    fr: 'Écriture du bracelet, ne le retire pas …',
  },
  saving: { de: 'Wird gespeichert …', en: 'Saving …', fr: 'Enregistrement …' },
  resume: { de: 'Weiter scannen', en: 'Scan on', fr: 'Continuer à scanner' },
  filters: { de: 'Auswahl', en: 'Selection', fr: 'Sélection' },
  leaders: { de: 'Leitende', en: 'Leaders', fr: 'Responsables' },
  undo: { de: 'Rückgängig', en: 'Undo', fr: 'Annuler' },
  noPeople: {
    de: 'In diesem Hof ist noch niemand angemeldet.',
    en: 'Nobody is registered with this Hof yet.',
    fr: 'Personne n’est encore inscrit dans ce Hof.',
  },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
} satisfies Record<string, StaticTranslationString>;

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replaceAll(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );

/** A text of the page in `locale`, with its `{name}` placeholders filled in. */
export const translate = (
  key: keyof typeof wristbandTexts,
  locale: Locale,
  values: Record<string, string | number> = {},
): string => fill(wristbandTexts[key][locale], values);

/** What the page says when a band could not be used, and what to do. */
export interface NfcFailureText {
  title: StaticTranslationString;
  description: StaticTranslationString;
}

const tapAgain: NfcFailureText = {
  title: {
    de: 'Nochmals anhalten',
    en: 'Hold it again',
    fr: 'Retiens-le encore',
  },
  description: {
    de: 'Die Verbindung zu diesem Band ist abgerissen. Halte es ruhig an die Rückseite des Handys, bis es vibriert.',
    en: 'The connection to this band broke off. Hold it still to the back of the phone until it vibrates.',
    fr: 'La connexion à ce bracelet a été interrompue. Tiens-le immobile contre le dos du téléphone jusqu’à ce qu’il vibre.',
  },
};

const somethingWrong: NfcFailureText = {
  title: {
    de: 'Das hat nicht geklappt',
    en: 'That did not work',
    fr: 'Cela n’a pas fonctionné',
  },
  description: {
    de: 'Halte dieses Band nochmals an. Klappt es wieder nicht, nimm ein anderes.',
    en: 'Hold this band again. If it fails again, take another one.',
    fr: 'Retiens ce bracelet. Si cela échoue encore, prends-en un autre.',
  },
};

const refusalTexts: Record<NfcAbortReason, NfcFailureText> = {
  'not-genuine': {
    title: {
      de: 'Kein echtes conveniat27-Armband',
      en: 'Not a genuine conveniat27 wristband',
      fr: 'Pas un vrai bracelet conveniat27',
    },
    description: {
      de: 'Dieses Band trägt keine gültige Signatur. Leg es weg und nimm ein Armband aus der Lieferung des conveniat27.',
      en: 'This band carries no valid signature. Put it aside and take a wristband from the conveniat27 delivery.',
      fr: 'Ce bracelet ne porte pas de signature valide. Mets-le de côté et prends un bracelet de la livraison du conveniat27.',
    },
  },
  'assigned-to-other': {
    title: {
      de: 'Gehört einem anderen Hof',
      en: 'Belongs to another Hof',
      fr: 'Appartient à un autre Hof',
    },
    description: {
      de: 'Ein anderer Hof hat dieses Band schon programmiert. Gib es ihm zurück und nimm ein anderes.',
      en: 'Another Hof already programmed this band. Give it back and take another one.',
      fr: 'Un autre Hof a déjà programmé ce bracelet. Rends-le et prends-en un autre.',
    },
  },
  revoked: {
    title: { de: 'Gesperrt', en: 'Blocked', fr: 'Bloqué' },
    description: {
      de: 'Dieses Band wurde als verloren gesperrt. Leg es weg und nimm ein anderes; nur die Admins geben es wieder frei.',
      en: 'This band was blocked as lost. Put it aside and take another one; only the admins release it again.',
      fr: 'Ce bracelet a été bloqué comme perdu. Mets-le de côté et prends-en un autre ; seuls les admins le débloquent.',
    },
  },
  network: {
    title: { de: 'Keine Verbindung', en: 'No connection', fr: 'Pas de connexion' },
    description: {
      de: 'Für dieses Band braucht das Handy Internet. Halte es nochmals an, sobald du Empfang hast.',
      en: 'The phone needs internet for this band. Hold it again once you have signal.',
      fr: 'Le téléphone a besoin d’internet pour ce bracelet. Retiens-le dès que tu as du réseau.',
    },
  },
  other: somethingWrong,
};

const failureTexts: Partial<Record<NfcFailureCode, NfcFailureText>> = {
  'tag-lost': tapAgain,
  'tap-again': tapAgain,
  'write-failed': tapAgain,
  'verification-failed': tapAgain,
  'unsupported-tag': {
    title: tapAgain.title,
    description: {
      de: 'Dieses Band hat nicht richtig geantwortet. Halte es nochmals ruhig ans Handy. Klappt es immer wieder nicht, ist es kein conveniat27-Armband.',
      en: 'This band did not answer properly. Hold it still to the phone again. If it keeps failing, it is not a conveniat27 wristband.',
      fr: 'Ce bracelet n’a pas répondu correctement. Retiens-le immobile contre le téléphone. Si cela échoue toujours, ce n’est pas un bracelet conveniat27.',
    },
  },
  timeout: {
    title: { de: 'Scanner angehalten', en: 'Scanner stopped', fr: 'Scanner arrêté' },
    description: {
      de: 'Eine Minute lang kam kein Band. So spart das Handy Akku.',
      en: 'No band came for a minute. This saves the phone’s battery.',
      fr: 'Aucun bracelet pendant une minute. Cela ménage la batterie.',
    },
  },
  'credentials-timeout': {
    title: { de: 'Zu langsam', en: 'Too slow', fr: 'Trop lent' },
    description: {
      de: 'Die Antwort des Servers kam nicht rechtzeitig, dieses Band ist unverändert. Halte es nochmals an.',
      en: 'The server did not answer in time; this band is unchanged. Hold it again.',
      fr: 'Le serveur n’a pas répondu à temps ; ce bracelet est inchangé. Retiens-le encore.',
    },
  },
  disabled: {
    title: { de: 'NFC ist aus', en: 'NFC is off', fr: 'Le NFC est désactivé' },
    description: {
      de: 'Schalte NFC in den Einstellungen des Handys ein und tippe auf «Weiter scannen».',
      en: 'Turn on NFC in the phone’s settings and tap “Scan on”.',
      fr: 'Active le NFC dans les réglages du téléphone et touche « Continuer à scanner ».',
    },
  },
  unsupported: {
    title: {
      de: 'Dieses Handy hat kein NFC',
      en: 'This phone has no NFC',
      fr: 'Ce téléphone n’a pas de NFC',
    },
    description: {
      de: 'Programmiere die Bänder mit einem anderen Handy.',
      en: 'Program the bands with another phone.',
      fr: 'Programme les bracelets avec un autre téléphone.',
    },
  },
  busy: {
    title: {
      de: 'Das Handy ist noch beschäftigt',
      en: 'The phone is still busy',
      fr: 'Le téléphone est encore occupé',
    },
    description: {
      de: 'Einen Moment, der Scanner startet gleich wieder.',
      en: 'One moment, the scanner starts again shortly.',
      fr: 'Un instant, le scanner redémarre tout de suite.',
    },
  },
  'wrong-password': {
    title: {
      de: 'Anderswo programmiert',
      en: 'Programmed elsewhere',
      fr: 'Programmé ailleurs',
    },
    description: {
      de: 'Dieses Band ist mit einem fremden Passwort geschützt und lässt sich hier nicht programmieren. Nimm ein anderes.',
      en: 'This band is protected with a foreign password and cannot be programmed here. Take another one.',
      fr: 'Ce bracelet est protégé par un mot de passe étranger et ne peut pas être programmé ici. Prends-en un autre.',
    },
  },
  'tag-locked': {
    title: {
      de: 'Dieses Band ist schreibgeschützt',
      en: 'This band is write-protected',
      fr: 'Ce bracelet est protégé en écriture',
    },
    description: {
      de: 'Dieses Band ist für immer gesperrt und lässt sich nicht programmieren. Nimm ein anderes.',
      en: 'This band is locked for good and cannot be programmed. Take another one.',
      fr: 'Ce bracelet est verrouillé pour toujours et ne peut pas être programmé. Prends-en un autre.',
    },
  },
  'tag-too-small': {
    title: {
      de: 'Dieses Band ist zu klein',
      en: 'This band is too small',
      fr: 'Ce bracelet est trop petit',
    },
    description: {
      de: 'Auf diesem Band hat der Link keinen Platz. Nimm ein conveniat27-Armband.',
      en: 'The link does not fit on this band. Take a conveniat27 wristband.',
      fr: 'Le lien ne tient pas sur ce bracelet. Prends un bracelet conveniat27.',
    },
  },
  'password-unusable': {
    title: {
      de: 'Dieses Band ist unbrauchbar',
      en: 'This band is unusable',
      fr: 'Ce bracelet est inutilisable',
    },
    description: {
      de: 'Dieses Band lässt sich nach dem Schreiben nicht mehr öffnen. Leg es zur Seite und gib es niemandem.',
      en: 'This band cannot be opened after writing. Put it aside and give it to nobody.',
      fr: 'Ce bracelet ne s’ouvre plus après l’écriture. Mets-le de côté et ne le donne à personne.',
    },
  },
};

/** What the page says when it refuses a band itself, before the server is asked. */
export const localRefusalTexts = {
  wornBy: {
    title: {
      de: 'Dieses Band trägt schon {name}',
      en: 'This band is already worn by {name}',
      fr: 'Ce bracelet est déjà porté par {name}',
    },
    description: {
      de: 'Leg es zur Seite und halte ein anderes Band ans Handy.',
      en: 'Put it aside and hold another band to the phone.',
      fr: 'Mets-le de côté et tiens un autre bracelet contre le téléphone.',
    },
  },
  oldBand: {
    title: {
      de: 'Das ist das alte Band von {name}',
      en: 'This is the old band of {name}',
      fr: 'C’est l’ancien bracelet de {name}',
    },
    description: {
      de: 'Halte das neue Band ans Handy.',
      en: 'Hold the new band to the phone.',
      fr: 'Tiens le nouveau bracelet contre le téléphone.',
    },
  },
} satisfies Record<string, NfcFailureText>;

/** A failure text in `locale`, with its `{name}` placeholders filled in. */
export const failureNotice = (
  text: NfcFailureText,
  locale: Locale,
  values: Record<string, string | number> = {},
): { title: string; description: string } => ({
  title: fill(text.title[locale], values),
  description: fill(text.description[locale], values),
});

/** What to tell the AVP for a session that failed with `code`, refused for `reason`. */
export const nfcFailureText = (code: NfcFailureCode, reason?: NfcAbortReason): NfcFailureText => {
  if (code === 'aborted') return refusalTexts[reason ?? 'other'];
  return failureTexts[code] ?? somethingWrong;
};
