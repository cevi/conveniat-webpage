import type { NfcAbortReason, NfcFailureCode } from '@/features/wristbands/native-nfc';
import type { Locale, StaticTranslationString } from '@/types/types';

/** The words of the AVP's wristband page. `{n}`, `{name}` and the like are filled in. */
export const wristbandTexts = {
  notInAppTitle: {
    de: 'Bänder programmierst du in der App',
    en: 'Bands are programmed in the app',
    fr: 'Les bracelets se programment dans l’app',
  },
  notInAppDescription: {
    de: 'Öffne diese Seite in der conveniat27-App auf einem Handy mit NFC. Vergeben, zurücknehmen und sperren geht auch hier.',
    en: 'Open this page in the conveniat27 app on a phone with NFC. Handing out, taking back and blocking work here too.',
    fr: 'Ouvre cette page dans l’app conveniat27 sur un téléphone avec NFC. Remettre, reprendre et bloquer fonctionnent aussi ici.',
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
  hofLabel: { de: 'Hof', en: 'Hof', fr: 'Hof' },
  withBand: {
    de: '{n} von {total} mit Band',
    en: '{n} of {total} with a band',
    fr: '{n} sur {total} avec bracelet',
  },
  spareCount: {
    de: '{n} Ersatz',
    en: '{n} spare',
    fr: '{n} en réserve',
  },
  program: { de: 'Band programmieren', en: 'Program a band', fr: 'Programmer un bracelet' },
  holdBand: {
    de: 'Halte das Band an die Rückseite des Handys',
    en: 'Hold the band to the back of the phone',
    fr: 'Tiens le bracelet contre le dos du téléphone',
  },
  holdBandHint: {
    de: 'Immer nur ein Band aufs Mal, und liegen lassen, bis es fertig ist.',
    en: 'One band at a time, and keep it there until it is done.',
    fr: 'Un seul bracelet à la fois, et laisse-le jusqu’à la fin.',
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
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
  close: { de: 'Schliessen', en: 'Close', fr: 'Fermer' },
  retry: { de: 'Nochmals versuchen', en: 'Try again', fr: 'Réessayer' },
  programOther: {
    de: 'Anderes Band programmieren',
    en: 'Program another band',
    fr: 'Programmer un autre bracelet',
  },
  people: { de: 'Personen', en: 'People', fr: 'Personnes' },
  noPeople: {
    de: 'In diesem Hof ist noch niemand angemeldet.',
    en: 'Nobody is registered with this Hof yet.',
    fr: 'Personne n’est encore inscrit dans ce Hof.',
  },
  noMatch: {
    de: 'Niemand mit diesem Namen.',
    en: 'Nobody with this name.',
    fr: 'Personne avec ce nom.',
  },
  searchPerson: { de: 'Name suchen', en: 'Search name', fr: 'Chercher un nom' },
  noBand: { de: 'kein Band', en: 'no band', fr: 'pas de bracelet' },
  band: { de: 'Band {uid}', en: 'Band {uid}', fr: 'Bracelet {uid}' },
  bandActions: {
    de: 'Band von {name}',
    en: 'Band of {name}',
    fr: 'Bracelet de {name}',
  },
  spareBands: { de: 'Ersatzbänder', en: 'Spare bands', fr: 'Bracelets de réserve' },
  spareHint: {
    de: 'Programmiert, aber noch niemandem gegeben.',
    en: 'Programmed, but not handed to anyone yet.',
    fr: 'Programmés, mais remis à personne encore.',
  },
  handOut: { de: 'Vergeben', en: 'Hand out', fr: 'Remettre' },
  handOutBand: {
    de: 'Band {uid} vergeben',
    en: 'Hand out band {uid}',
    fr: 'Remettre le bracelet {uid}',
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
    de: 'Band {uid} von {name} sperren? Es nennt danach niemanden mehr. In der App lässt sich das nicht rückgängig machen, nur die Admins geben ein Band wieder frei.',
    en: 'Block band {uid} of {name}? It names nobody afterwards. This cannot be undone in the app; only the admins release a band again.',
    fr: 'Bloquer le bracelet {uid} de {name} ? Il ne nomme plus personne ensuite. Ce n’est pas réversible dans l’app ; seuls les admins débloquent un bracelet.',
  },
  revokeYes: { de: 'Ja, sperren', en: 'Yes, block', fr: 'Oui, bloquer' },
  revoked: {
    de: 'Band {uid} ist gesperrt.',
    en: 'Band {uid} is blocked.',
    fr: 'Le bracelet {uid} est bloqué.',
  },
  unassigned: {
    de: 'Band {uid} ist zurück, es liegt bei den Ersatzbändern.',
    en: 'Band {uid} is back among the spare bands.',
    fr: 'Le bracelet {uid} est de retour dans la réserve.',
  },
  whom: {
    de: 'Wem gibst du das Band?',
    en: 'Who gets the band?',
    fr: 'À qui donnes-tu le bracelet ?',
  },
  later: { de: 'Später vergeben', en: 'Hand out later', fr: 'Remettre plus tard' },
  keptSpare: {
    de: 'Band {uid} liegt bei den Ersatzbändern.',
    en: 'Band {uid} is kept as a spare.',
    fr: 'Le bracelet {uid} est gardé en réserve.',
  },
  withoutBand: { de: 'Ohne Band', en: 'Without a band', fr: 'Sans bracelet' },
  wearingBand: {
    de: 'Tragen schon ein Band',
    en: 'Already wear a band',
    fr: 'Portent déjà un bracelet',
  },
  everyoneHasBand: {
    de: 'Alle im Hof tragen schon ein Band.',
    en: 'Everybody in the Hof already wears a band.',
    fr: 'Tout le monde dans le Hof porte déjà un bracelet.',
  },
  assigned: {
    de: 'Band {uid} gehört jetzt {name}.',
    en: 'Band {uid} now belongs to {name}.',
    fr: 'Le bracelet {uid} appartient maintenant à {name}.',
  },
  alreadyWorn: {
    de: 'Dieses Band gehört schon {name}.',
    en: 'This band already belongs to {name}.',
    fr: 'Ce bracelet appartient déjà à {name}.',
  },
  replaceAsk: {
    de: '{name} trägt schon Band {old}. Jede Person trägt nur ein Band: Sperre das alte als verloren, dann bekommt {name} dieses. Die Sperre lässt sich in der App nicht rückgängig machen.',
    en: '{name} already wears band {old}. Everyone wears one band only: block the old one as lost, then {name} gets this one. The block cannot be undone in the app.',
    fr: '{name} porte déjà le bracelet {old}. Chacun ne porte qu’un bracelet : bloque l’ancien comme perdu, puis {name} reçoit celui-ci. Le blocage n’est pas réversible dans l’app.',
  },
  replaceYes: {
    de: 'Altes sperren und dieses geben',
    en: 'Block the old one and give this one',
    fr: 'Bloquer l’ancien et donner celui-ci',
  },
  failed: {
    de: 'Das hat nicht geklappt.',
    en: 'That did not work.',
    fr: 'Cela n’a pas fonctionné.',
  },
} satisfies Record<string, StaticTranslationString>;

/** A text of the page in `locale`, with its `{name}` placeholders filled in. */
export const translate = (
  key: keyof typeof wristbandTexts,
  locale: Locale,
  values: Record<string, string | number> = {},
): string =>
  wristbandTexts[key][locale].replaceAll(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );

/** What the page says when a band could not be programmed, and whether trying again helps. */
export interface NfcFailureText {
  title: StaticTranslationString;
  description: StaticTranslationString;
  /** the same band again may work; otherwise the way on is another band */
  retry: boolean;
}

const tapAgain: NfcFailureText = {
  title: {
    de: 'Nochmals ans Handy halten',
    en: 'Hold it to the phone again',
    fr: 'Retiens-le contre le téléphone',
  },
  description: {
    de: 'Die Verbindung zum Band ist abgerissen. Halte es ruhig an die Rückseite des Handys, bis es fertig ist.',
    en: 'The connection to the band broke off. Hold it still to the back of the phone until it is done.',
    fr: 'La connexion au bracelet a été interrompue. Tiens-le immobile contre le dos du téléphone jusqu’à la fin.',
  },
  retry: true,
};

const somethingWrong: NfcFailureText = {
  title: {
    de: 'Das hat nicht geklappt',
    en: 'That did not work',
    fr: 'Cela n’a pas fonctionné',
  },
  description: {
    de: 'Versuche es nochmals. Klappt es wieder nicht, nimm ein anderes Band.',
    en: 'Try again. If it fails again, take another band.',
    fr: 'Réessaie. Si cela échoue encore, prends un autre bracelet.',
  },
  retry: true,
};

const refusalTexts: Record<NfcAbortReason, NfcFailureText> = {
  'not-genuine': {
    title: {
      de: 'Kein echtes conveniat27-Armband',
      en: 'Not a genuine conveniat27 wristband',
      fr: 'Pas un vrai bracelet conveniat27',
    },
    description: {
      de: 'Der Chip dieses Bands trägt keine gültige Signatur. Nimm ein Armband aus der Lieferung des conveniat27.',
      en: 'The chip of this band carries no valid signature. Take a wristband from the conveniat27 delivery.',
      fr: 'La puce de ce bracelet ne porte pas de signature valide. Prends un bracelet de la livraison du conveniat27.',
    },
    retry: true,
  },
  'assigned-to-other': {
    title: {
      de: 'Gehört einem anderen Hof',
      en: 'Belongs to another Hof',
      fr: 'Appartient à un autre Hof',
    },
    description: {
      de: 'Ein anderer Hof hat dieses Band schon programmiert. Gib es zurück und nimm ein anderes.',
      en: 'Another Hof already programmed this band. Give it back and take another one.',
      fr: 'Un autre Hof a déjà programmé ce bracelet. Rends-le et prends-en un autre.',
    },
    retry: false,
  },
  revoked: {
    title: { de: 'Gesperrt', en: 'Blocked', fr: 'Bloqué' },
    description: {
      de: 'Dieses Band wurde als verloren gesperrt. Nur die Admins geben es wieder frei.',
      en: 'This band was blocked as lost. Only the admins release it again.',
      fr: 'Ce bracelet a été bloqué comme perdu. Seuls les admins le débloquent.',
    },
    retry: false,
  },
  network: {
    title: { de: 'Keine Verbindung', en: 'No connection', fr: 'Pas de connexion' },
    description: {
      de: 'Zum Programmieren braucht das Handy Internet. Versuche es nochmals, sobald du Empfang hast.',
      en: 'The phone needs internet to program a band. Try again once you have signal.',
      fr: 'Le téléphone a besoin d’internet pour programmer. Réessaie dès que tu as du réseau.',
    },
    retry: true,
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
      de: 'Das Band hat nicht richtig geantwortet. Halte es nochmals ruhig ans Handy. Klappt es immer wieder nicht, ist es kein conveniat27-Armband.',
      en: 'The band did not answer properly. Hold it still to the phone again. If it keeps failing, it is not a conveniat27 wristband.',
      fr: 'Le bracelet n’a pas répondu correctement. Retiens-le immobile contre le téléphone. Si cela échoue toujours, ce n’est pas un bracelet conveniat27.',
    },
    retry: true,
  },
  timeout: {
    title: { de: 'Kein Band gefunden', en: 'No band found', fr: 'Aucun bracelet trouvé' },
    description: {
      de: 'Halte das Band an die Rückseite des Handys, gleich nachdem du «Band programmieren» getippt hast.',
      en: 'Hold the band to the back of the phone right after tapping “Program a band”.',
      fr: 'Tiens le bracelet contre le dos du téléphone juste après avoir touché « Programmer un bracelet ».',
    },
    retry: true,
  },
  'credentials-timeout': {
    title: { de: 'Zu langsam', en: 'Too slow', fr: 'Trop lent' },
    description: {
      de: 'Die Antwort des Servers kam nicht rechtzeitig, das Band ist unverändert. Versuche es nochmals.',
      en: 'The server did not answer in time; the band is unchanged. Try again.',
      fr: 'Le serveur n’a pas répondu à temps ; le bracelet est inchangé. Réessaie.',
    },
    retry: true,
  },
  disabled: {
    title: { de: 'NFC ist aus', en: 'NFC is off', fr: 'Le NFC est désactivé' },
    description: {
      de: 'Schalte NFC in den Einstellungen des Handys ein und versuche es nochmals.',
      en: 'Turn on NFC in the phone’s settings and try again.',
      fr: 'Active le NFC dans les réglages du téléphone et réessaie.',
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
      de: 'Programmiere die Bänder mit einem anderen Handy.',
      en: 'Program the bands with another phone.',
      fr: 'Programme les bracelets avec un autre téléphone.',
    },
    retry: false,
  },
  busy: {
    title: {
      de: 'Das Handy ist noch beschäftigt',
      en: 'The phone is still busy',
      fr: 'Le téléphone est encore occupé',
    },
    description: {
      de: 'Warte einen Moment und versuche es nochmals.',
      en: 'Wait a moment and try again.',
      fr: 'Attends un instant et réessaie.',
    },
    retry: true,
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
    retry: false,
  },
  'tag-locked': {
    title: {
      de: 'Band ist schreibgeschützt',
      en: 'Band is write-protected',
      fr: 'Bracelet protégé en écriture',
    },
    description: {
      de: 'Dieses Band ist für immer gesperrt und lässt sich nicht programmieren. Nimm ein anderes.',
      en: 'This band is locked for good and cannot be programmed. Take another one.',
      fr: 'Ce bracelet est verrouillé pour toujours et ne peut pas être programmé. Prends-en un autre.',
    },
    retry: false,
  },
  'tag-too-small': {
    title: { de: 'Band zu klein', en: 'Band too small', fr: 'Bracelet trop petit' },
    description: {
      de: 'Auf diesem Chip hat der Link keinen Platz. Nimm ein conveniat27-Armband.',
      en: 'The link does not fit on this chip. Take a conveniat27 wristband.',
      fr: 'Le lien ne tient pas sur cette puce. Prends un bracelet conveniat27.',
    },
    retry: false,
  },
  'password-unusable': {
    title: { de: 'Band unbrauchbar', en: 'Band unusable', fr: 'Bracelet inutilisable' },
    description: {
      de: 'Das Band lässt sich nach dem Schreiben nicht mehr öffnen. Leg es zur Seite und gib es niemandem.',
      en: 'The band cannot be opened after writing. Put it aside and give it to nobody.',
      fr: 'Le bracelet ne s’ouvre plus après l’écriture. Mets-le de côté et ne le donne à personne.',
    },
    retry: false,
  },
};

/** What to tell the AVP for a session that failed with `code`, refused for `reason`. */
export const nfcFailureText = (
  code: NfcFailureCode,
  reason: NfcAbortReason | undefined,
): NfcFailureText => {
  if (code === 'aborted') return refusalTexts[reason ?? 'other'];
  return failureTexts[code] ?? somethingWrong;
};
