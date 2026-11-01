import {
  reconcileAfterPaymentChange,
  validatePaymentChange,
} from '@/features/billing/collections/bill-payment-hooks';
import { PAYMENT_OUTCOME_LABELS } from '@/features/billing/services/payment-matching';
import {
  BILLING_ROLES,
  canAccessBilling,
  canAccessBillingField,
  getUserGroups,
  hasAccessToThisUser,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig, FieldAccess } from 'payload';

/** What the bank sent is a fact: only the import writes it, nobody edits it afterwards. */
const writtenByImport: FieldAccess = () => false;

const bankFact = {
  access: { read: canAccessBillingField, create: writtenByImport, update: writtenByImport },
  admin: { readOnly: true },
} as const;

/**
 * One incoming payment from a bank file, and the bills it pays.
 *
 * The import writes one row per bank transaction, whether or not it could assign it, so a
 * payment it could not book is still on record for finance to assign by hand. The bill its
 * reference named stays in `matchedParticipant`; `allocations` say which bills it pays, and
 * finance may move or split them. A bill is paid when its allocations reach its amount.
 */
export const BillPaymentsCollection: CollectionConfig = {
  slug: 'bill-payments',
  labels: {
    singular: { en: 'Payment', de: 'Zahlung', fr: 'Paiement' },
    plural: { en: 'Payments', de: 'Zahlungen', fr: 'Paiements' },
  },
  admin: {
    hidden: ({ user }): boolean =>
      !hasAccessToThisUser({ user: { groups: getUserGroups(user) }, requiredRoles: BILLING_ROLES }),
    hideAPIURL: true,
    group: AdminPanelDashboardGroups.BackofficeBilling.label,
    useAsTitle: 'transactionReference',
    listSearchableFields: ['transactionReference', 'reference', 'payer'],
    defaultColumns: [
      'transactionReference',
      'bookingDate',
      'amount',
      'payer',
      'matchedParticipant',
      'importOutcome',
      'refundedDate',
    ],
    description: {
      en: 'Every payment from an imported bank file. Assign a payment the import could not book, move a double payment to the bill it was meant for, or split one payment across several bills.',
      de: 'Alle Zahlungen aus importierten Bankdateien. Hier lassen sich Zahlungen, die der Import nicht verbuchen konnte, von Hand zuordnen, Doppelzahlungen auf die gemeinte Rechnung verschieben oder eine Zahlung auf mehrere Rechnungen aufteilen.',
      fr: 'Tous les paiements des fichiers bancaires importés. Attribuez un paiement que l’import n’a pas pu comptabiliser, déplacez un double paiement vers la facture visée ou répartissez un paiement sur plusieurs factures.',
    },
  },
  access: {
    read: canAccessBilling,
    // Only the payment import creates payments. A payment that came in some other way is
    // not on any bank file, and booking it would leave nothing to reconcile it against.
    create: () => false,
    update: canAccessBilling,
    // A bank transaction does not stop having happened. A refund is recorded instead.
    delete: () => false,
  },
  hooks: {
    beforeChange: [validatePaymentChange],
    afterChange: [reconcileAfterPaymentChange],
  },
  fields: [
    {
      name: 'transactionReference',
      type: 'text',
      required: true,
      unique: true,
      label: {
        en: 'Bank Transaction Reference',
        de: 'Transaktionsreferenz der Bank',
        fr: 'Référence de transaction bancaire',
      },
      ...bankFact,
      admin: {
        ...bankFact.admin,
        description: {
          en: 'Identifies the payment: importing the same bank file again adds nothing.',
          de: 'Kennzeichnet die Zahlung: ein erneuter Import derselben Bankdatei fügt nichts hinzu.',
          fr: 'Identifie le paiement : un nouvel import du même fichier bancaire n’ajoute rien.',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'amount',
          type: 'number',
          required: true,
          label: { en: 'Amount', de: 'Betrag', fr: 'Montant' },
          ...bankFact,
        },
        {
          name: 'currency',
          type: 'text',
          label: { en: 'Currency', de: 'Währung', fr: 'Devise' },
          ...bankFact,
        },
        {
          name: 'bookingDate',
          type: 'date',
          label: { en: 'Booked on', de: 'Buchungsdatum', fr: 'Date de comptabilisation' },
          ...bankFact,
        },
      ],
    },
    {
      name: 'reference',
      type: 'text',
      label: { en: 'Paid Reference', de: 'Bezahlte Referenz', fr: 'Référence payée' },
      ...bankFact,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'payer',
          type: 'text',
          label: { en: 'Payer', de: 'Zahlungspflichtiger', fr: 'Débiteur' },
          ...bankFact,
        },
        {
          name: 'message',
          type: 'text',
          label: { en: 'Message', de: 'Mitteilung', fr: 'Communication' },
          ...bankFact,
        },
      ],
    },
    {
      name: 'matchedParticipant',
      type: 'relationship',
      relationTo: 'bill-participants',
      label: {
        en: 'Matched by Reference',
        de: 'Per Referenz erkannt',
        fr: 'Reconnu par la référence',
      },
      ...bankFact,
      admin: {
        ...bankFact.admin,
        description: {
          en: 'The registration whose bill carries the paid reference. Kept when the payment is assigned elsewhere.',
          de: 'Die Anmeldung, deren Rechnung die bezahlte Referenz trägt. Bleibt erhalten, wenn die Zahlung einer anderen Rechnung zugeordnet wird.',
          fr: 'L’inscription dont la facture porte la référence payée. Conservée lorsque le paiement est attribué ailleurs.',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'importOutcome',
          type: 'select',
          label: { en: 'Import Result', de: 'Ergebnis des Imports', fr: 'Résultat de l’import' },
          options: Object.entries(PAYMENT_OUTCOME_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
          ...bankFact,
        },
        {
          name: 'importedBy',
          type: 'text',
          label: { en: 'Imported by', de: 'Importiert von', fr: 'Importé par' },
          ...bankFact,
        },
      ],
    },
    {
      name: 'importMessage',
      type: 'textarea',
      label: { en: 'Import Note', de: 'Hinweis des Imports', fr: 'Remarque de l’import' },
      ...bankFact,
    },
    {
      name: 'allocations',
      type: 'array',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      label: { en: 'Assigned to', de: 'Zugeordnet zu', fr: 'Attribué à' },
      labels: {
        singular: { en: 'Bill', de: 'Rechnung', fr: 'Facture' },
        plural: { en: 'Bills', de: 'Rechnungen', fr: 'Factures' },
      },
      admin: {
        description: {
          en: 'The bills this payment pays. A bill counts as paid once its assigned amounts reach its total. To split one payment for two children, add both bills with their amounts.',
          de: 'Die Rechnungen, die diese Zahlung begleicht. Eine Rechnung gilt als bezahlt, sobald die zugeordneten Beträge ihren Betrag erreichen. Für eine Zahlung für zwei Kinder beide Rechnungen mit ihrem Betrag eintragen.',
          fr: 'Les factures que ce paiement règle. Une facture est payée dès que les montants attribués atteignent son total. Pour un paiement couvrant deux enfants, ajoutez les deux factures avec leur montant.',
        },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'participant',
              type: 'relationship',
              relationTo: 'bill-participants',
              required: true,
              label: { en: 'Registration', de: 'Anmeldung', fr: 'Inscription' },
            },
            {
              name: 'amount',
              type: 'number',
              required: true,
              min: 0.01,
              label: { en: 'Amount (CHF)', de: 'Betrag (CHF)', fr: 'Montant (CHF)' },
            },
          ],
        },
      ],
    },
    {
      name: 'refundedDate',
      type: 'date',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      label: { en: 'Refunded on', de: 'Zurückerstattet am', fr: 'Remboursé le' },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Set once the money went back. The payment then counts for no bill, and a double payment is no longer flagged.',
          de: 'Setzen, sobald das Geld zurücküberwiesen ist. Die Zahlung zählt dann für keine Rechnung mehr, und eine Doppelzahlung ist nicht mehr markiert.',
          fr: 'À renseigner une fois l’argent rendu. Le paiement ne compte alors plus pour aucune facture et un double paiement n’est plus signalé.',
        },
      },
    },
    {
      name: 'note',
      type: 'textarea',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      label: { en: 'Finance Note', de: 'Notiz Finanzen', fr: 'Note finances' },
      admin: { position: 'sidebar' },
    },
  ],
};
