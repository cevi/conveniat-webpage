import type { BillKind } from '@/features/billing-core/bill-kind';
import {
  allocatedBillIds,
  allocationBill,
  billReferenceOf,
  CAMP_BILL_COLLECTION,
  describeAllocationProblem,
  relationId,
} from '@/features/billing-core/payment-allocation';
import { PAYMENT_OUTCOME_LABELS } from '@/features/billing-core/payment-outcome';
import {
  BILLING_ROLES,
  canAccessBilling,
  canAccessBillingField,
  getUserGroups,
  hasAccessToThisUser,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { BillPayment } from '@/features/payload-cms/payload-types';
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  CollectionSlug,
  FieldAccess,
} from 'payload';
import { APIError } from 'payload';

/** What the bank sent is a fact: only the import writes it, nobody edits it afterwards. */
const writtenByImport: FieldAccess = () => false;

const bankFact = {
  access: { read: canAccessBillingField, create: writtenByImport, update: writtenByImport },
  admin: { readOnly: true },
} as const;

type Allocation = NonNullable<BillPayment['allocations']>[number];

/**
 * Keeps the legacy camp fields and the polymorphic ones saying the same, while both exist.
 *
 * A payment stored before the Besuchstag names its camp bill only in `participant` and
 * `matchedParticipant`, and the replica of the previous release still reads and writes only
 * those during a rolling deploy. So a payment saved here gets `bill` from `participant` where
 * it lacks one, and `participant` follows `bill` for a camp bill and is emptied for any other.
 */
export const syncLegacyBillFields: CollectionBeforeValidateHook<BillPayment> = ({ data }) => {
  if (data === undefined) return data;
  if (Array.isArray(data.allocations)) {
    data.allocations = data.allocations.map((allocation: Allocation): Allocation => {
      const bill = allocationBill(allocation);
      if (bill === undefined) return allocation;
      return {
        ...allocation,
        bill: { relationTo: bill.relationTo, value: bill.id } as Allocation['bill'],
        // eslint-disable-next-line unicorn/no-null -- Payload clears a relationship with null
        participant: bill.relationTo === CAMP_BILL_COLLECTION ? bill.id : null,
      };
    });
  }
  if ('matchedBill' in data || 'matchedParticipant' in data) {
    const matched = billReferenceOf(data.matchedBill);
    const legacy = relationId(data.matchedParticipant);
    if (matched === undefined && legacy !== undefined) {
      data.matchedBill = { relationTo: CAMP_BILL_COLLECTION, value: legacy };
    } else if (matched !== undefined) {
      // eslint-disable-next-line unicorn/no-null -- Payload clears a relationship with null
      data.matchedParticipant = matched.relationTo === CAMP_BILL_COLLECTION ? matched.id : null;
    }
  }
  return data;
};

/**
 * One incoming payment from a bank file, and the bills it pays.
 *
 * The import writes one row per bank transaction, whether or not it could assign it, so a
 * payment it could not book is still on record for finance to assign by hand. The bill its
 * reference named stays in `matchedBill`; `allocations` say which bills it pays, and finance
 * may move or split them, also across kinds of bill. A bill is paid when its allocations reach
 * its amount, and each kind books its own bills, see {@link BillKind}.
 *
 * @param kinds the kinds of bill a payment can pay, the camp bills first
 */
export const createBillPaymentsCollection = (kinds: BillKind[]): CollectionConfig => {
  const billCollections: CollectionSlug[] = kinds.map((kind) => kind.collection);

  const validatePaymentChange: CollectionBeforeChangeHook<BillPayment> = async ({
    data,
    originalDoc,
    operation,
    req,
  }) => {
    const refundedDate = 'refundedDate' in data ? data.refundedDate : originalDoc?.refundedDate;
    const next = {
      amount: data.amount ?? originalDoc?.amount ?? 0,
      allocations: data.allocations ?? originalDoc?.allocations ?? [],
      ...(refundedDate === undefined ? {} : { refundedDate }),
    };
    const problem = describeAllocationProblem(next);
    if (problem !== undefined) throw new APIError(problem, 400, undefined, true);
    if (operation !== 'update' || originalDoc === undefined) return data;
    for (const kind of kinds) {
      const billIds = [
        ...new Set([
          ...allocatedBillIds(originalDoc, kind.collection),
          ...allocatedBillIds(next, kind.collection),
        ]),
      ];
      if (billIds.length > 0 && kind.validatePaymentChange !== undefined) {
        await kind.validatePaymentChange({ req, originalDoc, next, billIds });
      }
    }
    return data;
  };

  /** The payment import reconciles every bill of a file in one go and skips this. */
  const reconcileAfterPaymentChange: CollectionAfterChangeHook<BillPayment> = async ({
    doc,
    previousDoc,
    req,
  }) => {
    if (req.context['paymentImport'] === true) return doc;
    for (const kind of kinds) {
      const billIds = [
        ...new Set([
          ...allocatedBillIds(previousDoc, kind.collection),
          ...allocatedBillIds(doc, kind.collection),
        ]),
      ];
      if (billIds.length === 0) continue;
      await kind.reconcileAfterPaymentChange({
        payload: req.payload,
        user: req.user,
        doc,
        billIds,
      });
    }
    return doc;
  };

  return {
    slug: 'bill-payments',
    labels: {
      singular: { en: 'Payment', de: 'Zahlung', fr: 'Paiement' },
      plural: { en: 'Payments', de: 'Zahlungen', fr: 'Paiements' },
    },
    admin: {
      hidden: ({ user }): boolean =>
        !hasAccessToThisUser({
          user: { groups: getUserGroups(user) },
          requiredRoles: BILLING_ROLES,
        }),
      hideAPIURL: true,
      group: AdminPanelDashboardGroups.BackofficeBilling.label,
      useAsTitle: 'transactionReference',
      components: {
        beforeListTable: ['@/features/billing-core/components/bill-payments-toolbar'],
      },
      listSearchableFields: ['transactionReference', 'reference', 'payer'],
      defaultColumns: [
        'transactionReference',
        'bookingDate',
        'amount',
        'payer',
        'matchedBill',
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
      beforeValidate: [syncLegacyBillFields],
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
        name: 'matchedBill',
        type: 'relationship',
        relationTo: billCollections,
        label: {
          en: 'Matched by Reference',
          de: 'Per Referenz erkannt',
          fr: 'Reconnu par la référence',
        },
        ...bankFact,
        admin: {
          ...bankFact.admin,
          description: {
            en: 'The bill that carries the paid reference. Kept when the payment is assigned elsewhere.',
            de: 'Die Rechnung, welche die bezahlte Referenz trägt. Bleibt erhalten, wenn die Zahlung einer anderen Rechnung zugeordnet wird.',
            fr: 'La facture qui porte la référence payée. Conservée lorsque le paiement est attribué ailleurs.',
          },
        },
      },
      {
        // Legacy: the camp bill of a payment from before `matchedBill`, see syncLegacyBillFields.
        name: 'matchedParticipant',
        type: 'relationship',
        relationTo: CAMP_BILL_COLLECTION,
        ...bankFact,
        admin: { ...bankFact.admin, hidden: true },
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
                name: 'bill',
                type: 'relationship',
                relationTo: billCollections,
                required: true,
                label: { en: 'Bill', de: 'Rechnung', fr: 'Facture' },
                admin: { width: '60%' },
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
          {
            // Legacy: the camp bill of an allocation from before `bill`, see syncLegacyBillFields.
            name: 'participant',
            type: 'relationship',
            relationTo: CAMP_BILL_COLLECTION,
            admin: { hidden: true },
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
};
