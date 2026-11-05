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
    de: 'Öffne diese Seite in der conveniat27-App auf einem Handy mit NFC. Zurücknehmen, weitergeben und sperren geht auch hier.',
    en: 'Open this page in the conveniat27 app on a phone with NFC. Taking back, passing on and blocking work here too.',
    fr: 'Ouvre cette page dans l’app conveniat27 sur un téléphone avec NFC. Reprendre, transmettre et bloquer fonctionnent aussi ici.',
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
  spareCountOne: {
    de: '1 Ersatzband',
    en: '1 spare band',
    fr: '1 bracelet de réserve',
  },
  spareCount: {
    de: '{n} Ersatzbänder',
    en: '{n} spare bands',
    fr: '{n} bracelets de réserve',
  },
  modes: { de: 'Ablauf', en: 'Mode', fr: 'Mode' },
  modeHandOut: { de: 'Vergeben', en: 'Hand out', fr: 'Remettre' },
  modeProgram: { de: 'Nur programmieren', en: 'Program only', fr: 'Programmer seulement' },
  nowUp: { de: 'Jetzt dran', en: 'Up now', fr: 'Au tour de' },
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
  skip: { de: 'Überspringen', en: 'Skip', fr: 'Passer' },
  choosePerson: { de: 'Person wählen', en: 'Choose a person', fr: 'Choisir une personne' },
  choosePersonTitle: {
    de: 'Wer bekommt das nächste Band?',
    en: 'Who gets the next band?',
    fr: 'Qui reçoit le prochain bracelet ?',
  },
  after: { de: 'Danach', en: 'Next', fr: 'Ensuite' },
  skipped: { de: 'Übersprungen', en: 'Skipped', fr: 'Passés' },
  bringBack: { de: 'Jetzt drannehmen', en: 'Take now', fr: 'Prendre maintenant' },
  bringBackLabel: {
    de: '{name} jetzt drannehmen',
    en: 'Take {name} now',
    fr: 'Prendre {name} maintenant',
  },
  everyoneHasBand: {
    de: 'Alle im Hof tragen ein Band.',
    en: 'Everybody in the Hof wears a band.',
    fr: 'Tout le monde dans le Hof porte un bracelet.',
  },
  everyoneFilteredHasBand: {
    de: 'Alle in dieser Auswahl tragen ein Band.',
    en: 'Everybody in this selection wears a band.',
    fr: 'Tout le monde dans cette sélection porte un bracelet.',
  },
  filters: { de: 'Auswahl', en: 'Selection', fr: 'Sélection' },
  abteilungFilter: { de: 'Abteilung', en: 'Abteilung', fr: 'Abteilung' },
  roleFilter: { de: 'Rolle', en: 'Role', fr: 'Rôle' },
  allAbteilungen: { de: 'Alle Abteilungen', en: 'All Abteilungen', fr: 'Toutes les Abteilungen' },
  allRoles: { de: 'Alle', en: 'All', fr: 'Tous' },
  participants: { de: 'Teilnehmende', en: 'Participants', fr: 'Participant·e·s' },
  leaders: { de: 'Leitende', en: 'Leaders', fr: 'Responsables' },
  assigned: { de: 'Band → {name}', en: 'Band → {name}', fr: 'Bracelet → {name}' },
  undo: { de: 'Rückgängig', en: 'Undo', fr: 'Annuler' },
  programmedCountOne: {
    de: '1 Band programmiert',
    en: '1 band programmed',
    fr: '1 bracelet programmé',
  },
  programmedCount: {
    de: '{n} Bänder programmiert',
    en: '{n} bands programmed',
    fr: '{n} bracelets programmés',
  },
  programHint: {
    de: 'Halte ein Band nach dem anderen ans Handy. Jedes wird ein Ersatzband deines Hofs; vergeben kannst du es später unter «Vergeben», ohne es nochmals zu schreiben.',
    en: 'Hold one band after the other to the phone. Each becomes a spare band of your Hof; hand it out later under “Hand out” without writing it again.',
    fr: 'Tiens un bracelet après l’autre contre le téléphone. Chacun devient un bracelet de réserve de ton Hof ; remets-le plus tard sous « Remettre » sans le réécrire.',
  },
  recentBands: { de: 'Zuletzt', en: 'Latest', fr: 'Derniers' },
  bandNumber: { de: 'Band {n}', en: 'Band {n}', fr: 'Bracelet {n}' },
  bandDone: { de: 'fertig', en: 'done', fr: 'terminé' },
  bandAgain: { de: 'Nochmals anhalten', en: 'Hold it again', fr: 'Retiens-le encore' },
  bandRefused: { de: 'nicht brauchbar', en: 'not usable', fr: 'inutilisable' },
  people: { de: 'Personen', en: 'People', fr: 'Personnes' },
  noPeople: {
    de: 'In diesem Hof ist noch niemand angemeldet.',
    en: 'Nobody is registered with this Hof yet.',
    fr: 'Personne n’est encore inscrit dans ce Hof.',
  },
  noMatch: {
    de: 'Niemand in dieser Auswahl.',
    en: 'Nobody in this selection.',
    fr: 'Personne dans cette sélection.',
  },
  searchPerson: { de: 'Name suchen', en: 'Search name', fr: 'Chercher un nom' },
  bandStatus: { de: 'Band', en: 'Band', fr: 'Bracelet' },
  withoutBand: { de: 'Ohne Band', en: 'Without a band', fr: 'Sans bracelet' },
  withBandFilter: { de: 'Mit Band', en: 'With a band', fr: 'Avec bracelet' },
  allBands: { de: 'Alle', en: 'All', fr: 'Tous' },
  hasBand: { de: 'Band', en: 'Band', fr: 'Bracelet' },
  noBand: { de: 'kein Band', en: 'no band', fr: 'pas de bracelet' },
  bandActions: {
    de: 'Band von {name}',
    en: 'Band of {name}',
    fr: 'Bracelet de {name}',
  },
  reassign: {
    de: 'Anderer Person geben',
    en: 'Give to someone else',
    fr: 'Donner à quelqu’un d’autre',
  },
  unassign: { de: 'Zurücknehmen', en: 'Take back', fr: 'Reprendre' },
  revoke: {
    de: 'Als verloren sperren',
    en: 'Block as lost',
    fr: 'Bloquer comme perdu',
  },
  revokeAsk: {
    de: 'Das Band von {name} sperren? Es nennt danach niemanden mehr. In der App lässt sich das nicht rückgängig machen, nur die Admins geben ein Band wieder frei.',
    en: 'Block the band of {name}? It names nobody afterwards. This cannot be undone in the app; only the admins release a band again.',
    fr: 'Bloquer le bracelet de {name} ? Il ne nomme plus personne ensuite. Ce n’est pas réversible dans l’app ; seuls les admins débloquent un bracelet.',
  },
  revokeYes: { de: 'Ja, sperren', en: 'Yes, block', fr: 'Oui, bloquer' },
  whom: {
    de: 'Wem gibst du das Band?',
    en: 'Who gets the band?',
    fr: 'À qui donnes-tu le bracelet ?',
  },
  wearingBand: {
    de: 'Tragen schon ein Band',
    en: 'Already wear a band',
    fr: 'Portent déjà un bracelet',
  },
  replaceAsk: {
    de: '{name} trägt schon ein Band. Jede Person trägt nur eines: Sperre das alte als verloren, dann bekommt {name} dieses. Die Sperre lässt sich in der App nicht rückgängig machen.',
    en: '{name} already wears a band. Everyone wears one band only: block the old one as lost, then {name} gets this one. The block cannot be undone in the app.',
    fr: '{name} porte déjà un bracelet. Chacun n’en porte qu’un : bloque l’ancien comme perdu, puis {name} reçoit celui-ci. Le blocage n’est pas réversible dans l’app.',
  },
  replaceYes: {
    de: 'Altes sperren und dieses geben',
    en: 'Block the old one and give this one',
    fr: 'Bloquer l’ancien et donner celui-ci',
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
      de: 'Nimm es vom Handy und halte das nächste an. Soll jemand anderes es tragen, gib es in der Liste weiter.',
      en: 'Take it off the phone and hold the next one. To give it to someone else, pass it on in the list.',
      fr: 'Retire-le du téléphone et tiens le suivant. Pour le donner à quelqu’un d’autre, transmets-le dans la liste.',
    },
  },
  alreadyProgrammed: {
    title: {
      de: 'Dieses Band ist schon fertig',
      en: 'This band is done already',
      fr: 'Ce bracelet est déjà prêt',
    },
    description: {
      de: 'Leg es zu den fertigen und halte das nächste an.',
      en: 'Put it with the finished ones and hold the next one.',
      fr: 'Mets-le avec ceux qui sont prêts et tiens le suivant.',
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
export const nfcFailureText = (
  code: NfcFailureCode,
  reason: NfcAbortReason | undefined,
): NfcFailureText => {
  if (code === 'aborted') return refusalTexts[reason ?? 'other'];
  return failureTexts[code] ?? somethingWrong;
};
