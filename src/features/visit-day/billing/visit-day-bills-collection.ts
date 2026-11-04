import { environmentVariables } from '@/config/environment-variables';
import {
  BILLING_ROLES,
  canAccessBilling,
  getUserGroups,
  hasAccessToThisUser,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { visitDayBillEndpoints } from '@/features/visit-day/billing/visit-day-bill-endpoints';
import {
  VISIT_DAY_BILL_STATUS_LABELS,
  VISIT_DAY_MAIL_STATUS_LABELS,
} from '@/features/visit-day/billing/visit-day-bill-status';
import type { CollectionConfig, Field } from 'payload';

/** Written by the server only: by the registration, the payment import and the bill actions. */
const serverOnly = { admin: { readOnly: true } } as const;

const chf = { en: 'CHF', de: 'CHF', fr: 'CHF' };

const issuedBillFields: Field[] = [
  {
    type: 'row',
    fields: [
      {
        name: 'invoiceNumber',
        type: 'text',
        required: true,
        label: { en: 'Bill number', de: 'Rechnungsnummer', fr: 'Numéro de facture' },
      },
      {
        name: 'referenceNumber',
        type: 'text',
        required: true,
        index: true,
        label: { en: 'QR reference', de: 'QR-Referenz', fr: 'Référence QR' },
      },
    ],
  },
  {
    type: 'row',
    fields: [
      {
        name: 'amount',
        type: 'number',
        required: true,
        label: { en: 'Amount (CHF)', de: 'Betrag (CHF)', fr: 'Montant (CHF)' },
      },
      {
        name: 'persons',
        type: 'number',
        label: { en: 'Persons', de: 'Personen', fr: 'Personnes' },
      },
      {
        name: 'issuedAt',
        type: 'date',
        required: true,
        label: { en: 'Issued', de: 'Ausgestellt', fr: 'Émise' },
      },
      {
        name: 'supersededAt',
        type: 'date',
        label: { en: 'Replaced', de: 'Ersetzt', fr: 'Remplacée' },
      },
    ],
  },
  {
    name: 'pdf',
    type: 'upload',
    relationTo: 'bill-pdfs',
    label: { en: 'PDF', de: 'PDF', fr: 'PDF' },
  },
];

/**
 * One Besuchstag registration's bill, paid by QR bill into the same account as the camp bills.
 *
 * Created when the registration is saved, so it lives as long as the registration. Nobody edits
 * it by hand: the registration writes it, the payment import books it, and the actions in the
 * sidebar issue it again, cancel it or reduce its persons, each recorded in its history. The
 * registration's answers stay a form submission; this keeps what the bill and the ticket need.
 */
export const VisitDayBillsCollection: CollectionConfig = {
  slug: 'visit-day-bills',
  labels: {
    singular: {
      de: 'Besuchstag · Rechnung',
      en: 'Visiting day · Bill',
      fr: 'Journée des visites · Facture',
    },
    plural: {
      de: 'Besuchstag · Rechnungen',
      en: 'Visiting day · Bills',
      fr: 'Journée des visites · Factures',
    },
  },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeBilling.label,
    hidden: ({ user }): boolean =>
      !environmentVariables.FEATURE_ENABLE_VISIT_DAY ||
      !hasAccessToThisUser({ user: { groups: getUserGroups(user) }, requiredRoles: BILLING_ROLES }),
    hideAPIURL: true,
    useAsTitle: 'registrationNumber',
    listSearchableFields: [
      'registrationNumber',
      'fullName',
      'email',
      'invoiceNumber',
      'referenceNumber',
      'issuedBills.referenceNumber',
    ],
    defaultColumns: [
      'registrationNumber',
      'fullName',
      'visitDate',
      'persons',
      'withLunch',
      'invoiceAmount',
      'status',
      'mailStatus',
    ],
    description: {
      en: 'One bill per Besuchstag registration, created when the registration is saved. Payments come in through the bank import under «Payments».',
      de: 'Eine Rechnung pro Besuchstag-Anmeldung, erstellt beim Speichern der Anmeldung. Zahlungen kommen über den Bankimport unter «Zahlungen».',
      fr: 'Une facture par inscription, créée à l’enregistrement de l’inscription. Les paiements arrivent par l’import bancaire sous « Paiements ».',
    },
    components: {
      beforeListTable: ['@/features/visit-day/billing/components/visit-day-bills-toolbar'],
    },
  },
  endpoints: visitDayBillEndpoints,
  access: {
    read: canAccessBilling,
    // the registration, the import and the bill actions write with the internal context
    create: ({ req }): boolean => req.context['internal'] === true,
    update: ({ req }): boolean => req.context['internal'] === true,
    // a bill is cancelled, never deleted: its payments and its history point to it
    delete: () => false,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          type: 'select',
          required: true,
          index: true,
          defaultValue: 'open',
          options: Object.entries(VISIT_DAY_BILL_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
          label: { en: 'Status', de: 'Status', fr: 'Statut' },
          admin: {
            readOnly: true,
            components: {
              Cell: '@/features/visit-day/billing/components/visit-day-bill-status-cell#VisitDayBillStatusCell',
            },
          },
        },
        {
          name: 'mailStatus',
          type: 'select',
          required: true,
          defaultValue: 'pending',
          options: Object.entries(VISIT_DAY_MAIL_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
          label: { en: 'Bill email', de: 'Rechnungs-E-Mail', fr: 'E-mail de facture' },
          admin: {
            readOnly: true,
            components: {
              Cell: '@/features/visit-day/billing/components/visit-day-bill-status-cell#VisitDayMailStatusCell',
            },
          },
        },
      ],
    },
    {
      name: 'actions',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field:
            '@/features/visit-day/billing/components/visit-day-bill-actions#VisitDayBillActions',
        },
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Registration', de: 'Anmeldung', fr: 'Inscription' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'registrationNumber',
                  type: 'text',
                  required: true,
                  unique: true,
                  label: {
                    en: 'Registration number',
                    de: 'Anmeldenummer',
                    fr: 'Numéro d’inscription',
                  },
                  ...serverOnly,
                },
                {
                  name: 'submission',
                  type: 'relationship',
                  relationTo: 'form-submissions',
                  required: true,
                  label: { en: 'Form entry', de: 'Formular-Eintrag', fr: 'Entrée du formulaire' },
                  ...serverOnly,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'visitDate',
                  type: 'date',
                  required: true,
                  index: true,
                  label: { en: 'Visiting day', de: 'Besuchstag', fr: 'Journée' },
                  admin: {
                    readOnly: true,
                    date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
                  },
                },
                {
                  name: 'hof',
                  type: 'relationship',
                  relationTo: 'hoefe',
                  label: { en: 'Hof', de: 'Hof', fr: 'Hof' },
                  admin: {
                    readOnly: true,
                    description: {
                      en: 'Empty for a visitor without a Hof.',
                      de: 'Leer bei Besuchenden ohne Bezug zu einem Hof.',
                      fr: 'Vide pour un visiteur sans lien avec un Hof.',
                    },
                  },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'persons',
                  type: 'number',
                  required: true,
                  min: 1,
                  label: { en: 'Persons', de: 'Personen', fr: 'Personnes' },
                  ...serverOnly,
                },
                {
                  name: 'withLunch',
                  type: 'checkbox',
                  label: { en: 'With lunch', de: 'Mit Mittagessen', fr: 'Avec repas de midi' },
                  ...serverOnly,
                },
                {
                  name: 'locale',
                  type: 'select',
                  required: true,
                  defaultValue: 'de',
                  options: [
                    { value: 'de', label: 'Deutsch' },
                    { value: 'fr', label: 'Français' },
                    { value: 'en', label: 'English' },
                  ],
                  label: { en: 'Language', de: 'Sprache', fr: 'Langue' },
                  ...serverOnly,
                },
              ],
            },
            {
              name: 'travelPasses',
              type: 'array',
              label: { en: 'Travel passes', de: 'ÖV-Abos', fr: 'Abonnements' },
              admin: {
                readOnly: true,
                description: {
                  en: 'Per person, for the rail tickets sent by letter.',
                  de: 'Pro Person, für die SBB-Billette, die per Brief verschickt werden.',
                  fr: 'Par personne, pour les billets CFF envoyés par lettre.',
                },
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'personNumber',
                      type: 'number',
                      required: true,
                      label: { en: 'Person', de: 'Person', fr: 'Personne' },
                    },
                    {
                      name: 'pass',
                      type: 'text',
                      label: { en: 'Pass', de: 'Abo', fr: 'Abonnement' },
                    },
                  ],
                },
              ],
            },
            {
              name: 'registrationId',
              type: 'text',
              required: true,
              unique: true,
              label: {
                en: 'Registration in Postgres',
                de: 'Anmeldung in Postgres',
                fr: 'Inscription dans Postgres',
              },
              admin: { readOnly: true, hidden: true },
            },
            {
              name: 'billNumber',
              type: 'number',
              required: true,
              unique: true,
              admin: { readOnly: true, hidden: true },
            },
          ],
        },
        {
          label: { en: 'Payer', de: 'Rechnungsadresse', fr: 'Adresse de facturation' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'firstName',
                  type: 'text',
                  label: { en: 'First name', de: 'Vorname', fr: 'Prénom' },
                  ...serverOnly,
                },
                {
                  name: 'lastName',
                  type: 'text',
                  label: { en: 'Last name', de: 'Nachname', fr: 'Nom' },
                  ...serverOnly,
                },
              ],
            },
            {
              name: 'fullName',
              type: 'text',
              index: true,
              label: { en: 'Name', de: 'Name', fr: 'Nom' },
              admin: { readOnly: true, hidden: true },
            },
            {
              name: 'email',
              type: 'email',
              label: { en: 'Email', de: 'E-Mail', fr: 'E-mail' },
              ...serverOnly,
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'street',
                  type: 'text',
                  label: { en: 'Street', de: 'Strasse', fr: 'Rue' },
                  admin: { readOnly: true, width: '50%' },
                },
                {
                  name: 'postalCode',
                  type: 'text',
                  label: { en: 'Postal code', de: 'PLZ', fr: 'NPA' },
                  admin: { readOnly: true, width: '20%' },
                },
                {
                  name: 'city',
                  type: 'text',
                  label: { en: 'City', de: 'Ort', fr: 'Localité' },
                  admin: { readOnly: true, width: '30%' },
                },
              ],
            },
          ],
        },
        {
          label: { en: 'Bill', de: 'Rechnung', fr: 'Facture' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'invoiceNumber',
                  type: 'text',
                  required: true,
                  unique: true,
                  label: { en: 'Bill number', de: 'Rechnungsnummer', fr: 'Numéro de facture' },
                  ...serverOnly,
                },
                {
                  name: 'referenceNumber',
                  type: 'text',
                  required: true,
                  index: true,
                  label: { en: 'QR reference', de: 'QR-Referenz', fr: 'Référence QR' },
                  ...serverOnly,
                },
                {
                  name: 'issue',
                  type: 'number',
                  required: true,
                  defaultValue: 1,
                  admin: { readOnly: true, hidden: true },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'invoiceAmount',
                  type: 'number',
                  required: true,
                  label: { en: 'Amount (CHF)', de: 'Betrag (CHF)', fr: 'Montant (CHF)' },
                  ...serverOnly,
                },
                {
                  name: 'vatAmount',
                  type: 'number',
                  label: {
                    en: 'Included VAT (CHF)',
                    de: 'Enthaltene MWST (CHF)',
                    fr: 'TVA incluse (CHF)',
                  },
                  ...serverOnly,
                },
                {
                  name: 'vatRate',
                  type: 'number',
                  label: { en: 'VAT (%)', de: 'MWST (%)', fr: 'TVA (%)' },
                  ...serverOnly,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'issuedAt',
                  type: 'date',
                  required: true,
                  label: { en: 'Issued', de: 'Ausgestellt', fr: 'Émise' },
                  ...serverOnly,
                },
                {
                  name: 'dueDate',
                  type: 'date',
                  required: true,
                  label: { en: 'Due', de: 'Fällig', fr: 'Échéance' },
                  admin: {
                    readOnly: true,
                    date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
                  },
                },
              ],
            },
            {
              name: 'lines',
              type: 'array',
              label: { en: 'Lines', de: 'Positionen', fr: 'Lignes' },
              ...serverOnly,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    { name: 'quantity', type: 'number', required: true },
                    { name: 'unitPrice', type: 'number', required: true, label: chf },
                    { name: 'amount', type: 'number', required: true, label: chf },
                  ],
                },
              ],
            },
            {
              name: 'pdf',
              type: 'upload',
              relationTo: 'bill-pdfs',
              label: { en: 'Current PDF', de: 'Aktuelles PDF', fr: 'PDF actuel' },
              ...serverOnly,
            },
            {
              name: 'issuedBills',
              type: 'array',
              label: {
                en: 'Bills issued',
                de: 'Ausgestellte Rechnungen',
                fr: 'Factures émises',
              },
              admin: {
                readOnly: true,
                description: {
                  en: 'Every bill this registration received. A replaced bill keeps its reference, so a payment against it is still recognised.',
                  de: 'Alle Rechnungen dieser Anmeldung. Eine ersetzte Rechnung behält ihre Referenz, damit eine Zahlung darauf weiterhin erkannt wird.',
                  fr: 'Toutes les factures de cette inscription. Une facture remplacée garde sa référence, pour qu’un paiement soit encore reconnu.',
                },
              },
              fields: issuedBillFields,
            },
          ],
        },
        {
          label: { en: 'Payments', de: 'Zahlungen', fr: 'Paiements' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'paidDate',
                  type: 'date',
                  label: { en: 'Paid on', de: 'Bezahlt am', fr: 'Payé le' },
                  ...serverOnly,
                },
                {
                  name: 'paidAmount',
                  type: 'number',
                  label: { en: 'Paid (CHF)', de: 'Bezahlt (CHF)', fr: 'Payé (CHF)' },
                  ...serverOnly,
                },
                {
                  name: 'paymentTransactionReference',
                  type: 'text',
                  label: { en: 'Transaction', de: 'Transaktion', fr: 'Transaction' },
                  ...serverOnly,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'doublePayment',
                  type: 'checkbox',
                  index: true,
                  label: { en: 'Paid twice', de: 'Doppelt bezahlt', fr: 'Payée deux fois' },
                  ...serverOnly,
                },
                {
                  name: 'refundDue',
                  type: 'number',
                  label: {
                    en: 'Refund due (CHF)',
                    de: 'Rückerstattung offen (CHF)',
                    fr: 'Remboursement dû (CHF)',
                  },
                  admin: {
                    readOnly: true,
                    description: {
                      en: 'More was paid than the bill asks for. Refund it by hand and record the date on the payment.',
                      de: 'Es wurde mehr bezahlt, als die Rechnung verlangt. Von Hand zurückerstatten und das Datum bei der Zahlung eintragen.',
                      fr: 'Plus que le montant a été payé. Rembourser à la main et noter la date sur le paiement.',
                    },
                  },
                },
              ],
            },
            {
              name: 'payments',
              type: 'join',
              collection: 'bill-payments',
              on: 'allocations.bill',
              label: { en: 'Bookings', de: 'Buchungen', fr: 'Écritures' },
              admin: {
                defaultColumns: [
                  'transactionReference',
                  'bookingDate',
                  'amount',
                  'payer',
                  'refundedDate',
                ],
              },
            },
            {
              name: 'matchedPayments',
              type: 'join',
              collection: 'bill-payments',
              on: 'matchedBill',
              label: {
                en: 'Payments with this reference',
                de: 'Zahlungen mit dieser Referenz',
                fr: 'Paiements avec cette référence',
              },
              admin: {
                defaultColumns: ['transactionReference', 'bookingDate', 'amount', 'importOutcome'],
              },
            },
          ],
        },
        {
          label: { en: 'History', de: 'Verlauf', fr: 'Historique' },
          fields: [
            {
              name: 'events',
              type: 'join',
              collection: 'visit-day-bill-events',
              on: 'bill',
              defaultSort: '-createdAt',
              label: { en: 'History', de: 'Verlauf', fr: 'Historique' },
              admin: { defaultColumns: ['createdAt', 'actor', 'action', 'details'] },
            },
            {
              name: 'emails',
              type: 'join',
              collection: 'outgoing-emails',
              on: 'visitDayBill',
              label: { en: 'Emails', de: 'E-Mails', fr: 'E-mails' },
              admin: { defaultColumns: ['subject', 'to', 'deliveryStatus', 'createdAt'] },
            },
          ],
        },
      ],
    },
  ],
};
