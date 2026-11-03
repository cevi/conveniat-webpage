import type { StaticTranslationString } from '@/types/types';

/**
 * What the material routers tell a user when they refuse a call, by reason. The routers throw
 * the reason with `materialError`, and the components translate it with `userErrorMessage`.
 * `{n}` and `{item}` are filled in from the error's params.
 */
export const materialErrorTexts = {
  unexpected: {
    de: 'Unerwarteter Fehler.',
    en: 'Unexpected error.',
    fr: 'Erreur inattendue.',
  },
  itemNotFound: {
    de: 'Artikel nicht gefunden.',
    en: 'Item not found.',
    fr: 'Article introuvable.',
  },
  loanNotFound: {
    de: 'Ausleihe nicht gefunden.',
    en: 'Loan not found.',
    fr: 'Prêt introuvable.',
  },
  notEnough: {
    de: '{item}: für diesen Zeitraum sind nur noch {n} verfügbar.',
    en: '{item}: only {n} are available for this period.',
    fr: '{item} : seulement {n} disponibles pour cette période.',
  },
  offStep: {
    de: '{item}: nur in {n}er-Schritten.',
    en: '{item}: only in steps of {n}.',
    fr: '{item} : seulement par {n}.',
  },
  overMax: {
    de: '{item}: pro Ausleihe sind höchstens {n} erlaubt.',
    en: '{item}: at most {n} are allowed per loan.',
    fr: '{item} : au maximum {n} par prêt.',
  },
  period: {
    de: 'Die Rückgabe muss nach der Ausleihe liegen.',
    en: 'The return has to be after the start.',
    fr: 'Le retour doit être après le début.',
  },
  disabled: {
    de: '{item} kann zurzeit nicht ausgeliehen werden.',
    en: '{item} cannot be borrowed at the moment.',
    fr: '{item} ne peut pas être emprunté pour le moment.',
  },
  notReservable: {
    de: '{item} gibt es nur direkt am Depot, es kann nicht im Voraus angefragt oder vorbereitet werden.',
    en: '{item} is only handed out at the depot and cannot be requested or prepared ahead.',
    fr: '{item} est remis uniquement au dépôt et ne peut pas être demandé ni préparé à l’avance.',
  },
  notConsumable: {
    de: '{item} ist kein Verbrauchsmaterial und kann nicht verbraucht werden.',
    en: '{item} is not a consumable and cannot be used up.',
    fr: '{item} n’est pas du matériel de consommation.',
  },
  wrongStatus: {
    de: 'Diese Aktion ist im aktuellen Status nicht möglich.',
    en: 'This action is not possible in the current status.',
    fr: 'Cette action n’est pas possible dans le statut actuel.',
  },
  notOnShelf: {
    de: '{item}: im Depot liegen nur noch {n} brauchbare Stück.',
    en: '{item}: only {n} usable pieces are left in the depot.',
    fr: '{item} : il ne reste que {n} pièces utilisables au dépôt.',
  },
  personNotFound: {
    de: 'Person nicht gefunden.',
    en: 'Person not found.',
    fr: 'Personne introuvable.',
  },
  notOwnHof: {
    de: 'Du kannst nur für deinen eigenen Hof anfragen. Für andere wende dich ans Materialteam.',
    en: 'You can only request for your own Hof. Ask the material team for others.',
    fr: 'Tu ne peux faire une demande que pour ton propre Hof. Pour les autres, adresse-toi à l’équipe matériel.',
  },
  notSelf: {
    de: 'Als Einzelperson kannst du nur auf dich selbst anfragen.',
    en: 'As a single person you can only request for yourself.',
    fr: 'En tant que personne, tu ne peux faire une demande que pour toi.',
  },
  tooManyRequests: {
    de: 'Du hast schon {n} offene Anfragen. Warte, bis das Materialteam sie bestätigt.',
    en: 'You already have {n} open requests. Wait until the material team confirms them.',
    fr: 'Tu as déjà {n} demandes ouvertes. Attends que l’équipe matériel les confirme.',
  },
  noHolder: {
    de: 'Wähle einen Hof oder eine Person.',
    en: 'Choose a Hof or a person.',
    fr: 'Choisis un Hof ou une personne.',
  },
  hofNotFound: {
    de: 'Hof nicht gefunden.',
    en: 'Hof not found.',
    fr: 'Hof introuvable.',
  },
  quantity: {
    de: 'Die Menge passt nicht zum Bestand.',
    en: 'The quantity does not match the stock.',
    fr: 'La quantité ne correspond pas au stock.',
  },
  duplicate: {
    de: 'Dieser Code oder Name ist bereits vergeben.',
    en: 'This code or name is already taken.',
    fr: 'Ce code ou ce nom est déjà utilisé.',
  },
} satisfies Record<string, StaticTranslationString>;
