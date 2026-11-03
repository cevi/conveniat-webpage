/** What the payment import made of one payment of a bank file. */
export type PaymentOutcome =
  /** The reference matches an open bill and the amount pays it; the import marks it paid. */
  | 'booked'
  /** The same bank transaction is already booked on this bill: the file was imported before. */
  | 'already_booked'
  /**
   * The bill is already paid by another transaction. The payment is linked to the bill
   * anyway and the bill is flagged, so finance can refund it or assign it to another bill.
   */
  | 'double_payment'
  | 'amount_mismatch'
  | 'unknown_reference'
  | 'invalid_reference'
  /** The reference belongs to a bill that was replaced or cancelled since. */
  | 'superseded_bill'
  /** The registration was cancelled, so the money may have to go back. */
  | 'cancelled'
  /** The registration is in a status no open bill belongs to. */
  | 'not_payable'
  | 'wrong_currency'
  | 'invalid_amount'
  /** Without the bank's transaction id a booking could not be traced back to the payment. */
  | 'missing_transaction_reference';

/** How each outcome reads where finance sees it, on a stored payment. */
export const PAYMENT_OUTCOME_LABELS: Record<
  PaymentOutcome,
  { de: string; en: string; fr: string }
> = {
  booked: { de: 'Verbucht', en: 'Booked', fr: 'Comptabilisé' },
  already_booked: { de: 'Bereits importiert', en: 'Already imported', fr: 'Déjà importé' },
  double_payment: { de: 'Doppelzahlung', en: 'Double payment', fr: 'Double paiement' },
  amount_mismatch: { de: 'Betrag passt nicht', en: 'Amount mismatch', fr: 'Montant différent' },
  unknown_reference: {
    de: 'Unbekannte Referenz',
    en: 'Unknown reference',
    fr: 'Référence inconnue',
  },
  invalid_reference: {
    de: 'Ungültige Referenz',
    en: 'Invalid reference',
    fr: 'Référence invalide',
  },
  superseded_bill: {
    de: 'Ersetzte Rechnung',
    en: 'Replaced bill',
    fr: 'Facture remplacée',
  },
  cancelled: { de: 'Anmeldung storniert', en: 'Registration cancelled', fr: 'Inscription annulée' },
  not_payable: { de: 'Keine offene Rechnung', en: 'No open bill', fr: 'Aucune facture ouverte' },
  wrong_currency: { de: 'Andere Währung', en: 'Other currency', fr: 'Autre devise' },
  invalid_amount: { de: 'Kein Zahlungseingang', en: 'Not a credit', fr: 'Pas un crédit' },
  missing_transaction_reference: {
    de: 'Ohne Transaktionsreferenz',
    en: 'No transaction reference',
    fr: 'Sans référence de transaction',
  },
};
