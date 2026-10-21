import { decodeStoredEventName } from '@/features/billing/collections/decode-stored-event-name';
import { recordIssuedBills } from '@/features/billing/collections/record-issued-bills';
import {
  refreshHoefeAfterRegistrationChange,
  refreshHoefeAfterRegistrationDelete,
} from '@/features/billing/collections/refresh-registered-hoefe';
import {
  canTransition,
  describeRefusedTransition,
} from '@/features/billing/services/billing-status';
import {
  BILLING_ROLES,
  canAccessBillingField,
  getUserGroups,
  hasAccessToThisUser,
  hasBillingOrAdminOrWebAccess,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

/**
 * Payload Collection for tracking billing state of event participants.
 *
 * Each record represents one event participation synced from the Cevi.DB.
 * The participationUuid changes on re-enrollment, while userId stays stable.
 */
export const BillParticipantsCollection: CollectionConfig = {
  slug: 'bill-participants',
  labels: {
    singular: {
      en: 'Billing',
      de: 'Rechnungsverwaltung',
      fr: 'Gestion des factures',
    },
    plural: {
      en: 'Billing',
      de: 'Rechnungsverwaltung',
      fr: 'Gestion des factures',
    },
  },
  admin: {
    hidden: ({ user }): boolean =>
      !hasAccessToThisUser({ user: { groups: getUserGroups(user) }, requiredRoles: BILLING_ROLES }),
    hideAPIURL: true,
    group: AdminPanelDashboardGroups.BackofficeBilling.label,
    useAsTitle: 'fullName',
    // The reference is what finance has in hand from a bank statement. The issued bills are
    // searched too, so a payment against a replaced bill still finds its registration, the
    // same two places the payment import matches on. The Anmeldenummer is what a participant
    // quotes from their bill.
    listSearchableFields: [
      'fullName',
      'referenceNumber',
      'issuedBills.referenceNumber',
      'registrationNumber',
    ],
    groupBy: true,
    defaultColumns: [
      'fullName',
      'status',
      'billSentDate',
      'hitobitoLink',
      'eventName',
      'relatedEmails',
      'actions',
    ],
    description: {
      en: 'Participants synced from Cevi.DB, and the bills raised for them.',
      de: 'Von Cevi.DB abgeglichene Teilnehmende und die dazu erstellten Rechnungen.',
      fr: 'Participants synchronisés depuis Cevi.DB et les factures établies pour eux.',
    },
    components: {
      beforeListTable: ['@/features/billing/components/billing-list-toolbar'],
    },
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }): Record<string, unknown> => {
        // The one place every status write passes through. The transitions used to be
        // implied by whichever branch happened to run, so nothing stopped the per-row
        // "Neu generieren" action from moving a `removed` participation back to `new` —
        // which resurrected a registration the Cevi.DB no longer has and left the sync
        // reporting the same irreconcilable event on every run.
        const next = (data as { status?: unknown }).status;
        const previous = (originalDoc as { status?: unknown } | undefined)?.status;

        if (
          operation === 'update' &&
          typeof next === 'string' &&
          typeof previous === 'string' &&
          !canTransition(previous, next)
        ) {
          throw new Error(describeRefusedTransition(previous, next));
        }

        // Two imports reading the same open bill at once would both book it, and the
        // second would overwrite the transaction of the first. A booked payment is never
        // replaced, so the second one surfaces as a payment for a human to look at.
        const bookedTransaction = (
          originalDoc as { paymentTransactionReference?: unknown } | undefined
        )?.paymentTransactionReference;
        const nextTransaction = (data as { paymentTransactionReference?: unknown })
          .paymentTransactionReference;
        if (
          operation === 'update' &&
          typeof bookedTransaction === 'string' &&
          bookedTransaction !== '' &&
          nextTransaction !== undefined &&
          nextTransaction !== bookedTransaction
        ) {
          throw new Error(
            `Die Anmeldung ist bereits mit der Transaktion ${bookedTransaction} bezahlt.`,
          );
        }

        return data as Record<string, unknown>;
      },
      recordIssuedBills,
    ],
    afterChange: [refreshHoefeAfterRegistrationChange],
    afterDelete: [refreshHoefeAfterRegistrationDelete],
  },
  access: {
    // Admin and web read the names, which the Höfe and the outgoing emails point at; everything
    // else is narrowed to the billing team on the field.
    read: hasBillingOrAdminOrWebAccess,
    // Only allow create/update/delete from internal API calls (billing services),
    // not from the admin panel UI.
    create: ({ req }): boolean => req.context['internal'] === true,
    update: ({ req }): boolean => req.context['internal'] === true,
    delete: ({ req }): boolean => req.context['internal'] === true,
  },
  // The sidebar holds what is read and done on every visit: the state of the registration, the
  // actions on it and the way to its Cevi.DB entry. The tabs below hold the rest.
  fields: [
    {
      name: 'status',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        {
          label: { en: 'Fully captured', de: 'Vollständig erfasst', fr: 'Complètement saisi' },
          value: 'new',
        },
        {
          label: {
            en: 'Mandatory fields missing',
            de: 'Pflichtangaben fehlen',
            fr: 'Données obligatoires manquantes',
          },
          value: 'pflichtangaben_missing',
        },
        {
          label: {
            en: 'Invalid registration details',
            de: 'Anmeldeangaben ungültig',
            fr: "Détails d'inscription invalides",
          },
          value: 'invalid_anmeldeangaben',
        },
        {
          label: {
            en: 'Needs manual review',
            de: 'Manuelle Prüfung nötig',
            fr: 'Vérification manuelle requise',
          },
          value: 'needs_manual_review',
        },
        {
          label: { en: 'Bill Created', de: 'Rechnung erstellt', fr: 'Facture créée' },
          value: 'bill_created',
        },
        {
          label: {
            en: 'Bill queued for sending',
            de: 'Rechnung im Versand',
            fr: "Facture en cours d'envoi",
          },
          value: 'bill_mail_pending',
        },
        {
          label: { en: 'Bill Sent', de: 'Rechnung gesendet', fr: 'Facture envoyée' },
          value: 'bill_sent',
        },
        { label: { en: 'Cancelled', de: 'Storniert', fr: 'Annulé' }, value: 'removed' },
        {
          label: { en: 'Re-Added', de: 'Erneut hinzugefügt', fr: 'Ré-ajouté' },
          value: 're_added',
        },
        {
          label: { en: 'Updated', de: 'Aktualisiert', fr: 'Mis à jour' },
          value: 'updated',
        },
        {
          label: { en: 'Reminder Sent', de: 'Mahnung gesendet', fr: 'Rappel envoyé' },
          value: 'reminder_sent',
        },
        {
          label: { en: 'Paid', de: 'Bezahlt', fr: 'Payée' },
          value: 'paid',
        },
      ],
      label: {
        en: 'Status',
        de: 'Status',
        fr: 'Statut',
      },
      admin: {
        position: 'sidebar',
        components: {
          Cell: '@/features/billing/components/billing-status-cell',
        },
      },
    },
    {
      name: 'actions',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Cell: '@/features/billing/components/billing-actions-cell',
          Field: '@/features/billing/components/billing-actions-field',
        },
      },
    },
    {
      name: 'hitobitoLink',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Cell: '@/features/billing/components/hitobito-link-cell',
          Field: '@/features/billing/components/hitobito-link-field',
        },
      },
    },
    {
      name: 'financeNote',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      type: 'textarea',
      label: {
        en: 'Note for finance',
        de: 'Bemerkung für die Finanzen',
        fr: 'Remarque pour les finances',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Free text carried into the finance overview export. Never touched by a Cevi.DB sync.',
          de: 'Freitext, der in den Rechnungsübersicht-Export übernommen wird. Wird von einem Cevi.DB-Abgleich nie überschrieben.',
          fr: "Texte libre repris dans l'export de synthèse. Jamais écrasé par une synchronisation Cevi.DB.",
        },
        disableGroupBy: true,
      },
    },
    // Unnamed tabs and rows only arrange the edit view; the fields stay top-level in the
    // stored document.
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Bill', de: 'Rechnung', fr: 'Facture' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'invoiceNumber',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  unique: true,
                  label: {
                    en: 'Invoice Number',
                    de: 'Rechnungsnummer',
                    fr: 'Numéro de facture',
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
                {
                  // Filled from the Anmeldenummer template when the bill is created and kept, so
                  // the mail and the list search use the number the PDF printed, even after the
                  // template changes.
                  name: 'registrationNumber',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  index: true,
                  label: {
                    en: 'Registration Number',
                    de: 'Anmeldenummer',
                    fr: "Numéro d'inscription",
                  },
                  admin: {
                    disableGroupBy: true,
                    description: {
                      en: 'The Registration Number printed on the bill PDF.',
                      de: 'Die Anmeldenummer, die auf dem Rechnungs-PDF steht.',
                      fr: "Le numéro d'inscription imprimé sur le PDF de la facture.",
                    },
                  },
                },
              ],
            },
            {
              name: 'referenceNumber',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'text',
              label: {
                en: 'QR Reference Number',
                de: 'QR-Referenznummer',
                fr: 'Numéro de référence QR',
              },
              admin: {
                disableGroupBy: true,
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'invoiceAmount',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'number',
                  label: {
                    en: 'Invoice Amount (CHF)',
                    de: 'Rechnungsbetrag (CHF)',
                    fr: 'Montant de la facture (CHF)',
                  },
                  admin: {
                    disableGroupBy: true,
                    description: {
                      en: 'Gross amount, i.e. the net camp fee plus VAT.',
                      de: 'Bruttobetrag, also der Netto-Lagerbeitrag zuzüglich MWST.',
                      fr: 'Montant brut, soit la contribution nette plus la TVA.',
                    },
                  },
                },
                {
                  name: 'netAmount',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'number',
                  label: {
                    en: 'Net Amount (CHF)',
                    de: 'Netto-Betrag (CHF)',
                    fr: 'Montant net (CHF)',
                  },
                  admin: {
                    readOnly: true,
                    disableGroupBy: true,
                    disableListColumn: true,
                  },
                },
                {
                  name: 'vatExempt',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'checkbox',
                  label: {
                    en: 'VAT Exempt (youth)',
                    de: 'MWST-befreit (Jugendliche)',
                    fr: 'Exonéré de TVA (jeunes)',
                  },
                  admin: {
                    readOnly: true,
                    disableGroupBy: true,
                    disableListColumn: true,
                  },
                },
              ],
            },
            {
              // Frozen at generation time on purpose: the settings can change after a bill has gone
              // out, and the finance export has to reproduce the invoice, not the current config.
              name: 'vatBreakdown',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'array',
              label: {
                en: 'VAT Breakdown',
                de: 'MWST-Aufstellung',
                fr: 'Détail de la TVA',
              },
              admin: {
                readOnly: true,
                disableListColumn: true,
                disableListFilter: true,
                disableGroupBy: true,
                description: {
                  en: 'The VAT lines as they were printed on the bill.',
                  de: 'Die MWST-Zeilen, wie sie auf der Rechnung gedruckt wurden.',
                  fr: 'Les lignes de TVA telles quelles ont été imprimées sur la facture.',
                },
              },
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  label: { en: 'Label', de: 'Bezeichnung', fr: 'Libellé' },
                },
                {
                  name: 'share',
                  type: 'number',
                  label: { en: 'Share (%)', de: 'Anteil (%)', fr: 'Part (%)' },
                },
                {
                  name: 'netAmount',
                  type: 'number',
                  label: { en: 'Net (CHF)', de: 'Netto (CHF)', fr: 'Net (CHF)' },
                },
                {
                  name: 'vatCode',
                  type: 'text',
                  label: { en: 'VAT Rate', de: 'MWST-Satz', fr: 'Taux TVA' },
                },
                {
                  name: 'vatAmount',
                  type: 'number',
                  label: { en: 'VAT (CHF)', de: 'MWST (CHF)', fr: 'TVA (CHF)' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'billCreatedDate',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'date',
                  label: {
                    en: 'Bill Created Date',
                    de: 'Rechnung erstellt am',
                    fr: 'Date de création de la facture',
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
                {
                  name: 'billSentDate',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'date',
                  label: {
                    en: 'Bill Sent Date',
                    de: 'Rechnung gesendet am',
                    fr: "Date d'envoi de la facture",
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
              ],
            },
            {
              name: 'billPdfs',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'upload',
              relationTo: 'bill-pdfs',
              hasMany: true,
              label: {
                en: 'Bill PDFs',
                de: 'Rechnungs-PDFs',
                fr: 'PDFs de factures',
              },
              admin: {
                disableListColumn: true,
                disableListFilter: true,
                disableGroupBy: true,
              },
            },
            {
              // The invoice fields above only hold the bill the row carries today, and "Neu
              // generieren" overwrites them. This keeps every bill ever raised, so the finance
              // export can still account for one that was replaced or cancelled. Written by
              // `recordIssuedBills`.
              name: 'issuedBills',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'array',
              label: {
                en: 'Issued Bills',
                de: 'Ausgestellte Rechnungen',
                fr: 'Factures émises',
              },
              admin: {
                readOnly: true,
                disableListColumn: true,
                disableListFilter: true,
                disableGroupBy: true,
                description: {
                  en: 'Every bill raised for this registration, including replaced and cancelled ones.',
                  de: 'Alle Rechnungen, die für diese Anmeldung erstellt wurden, auch ersetzte und stornierte.',
                  fr: 'Toutes les factures établies pour cette inscription, y compris celles remplacées ou annulées.',
                },
              },
              fields: [
                {
                  name: 'invoiceNumber',
                  type: 'text',
                  required: true,
                  label: { en: 'Invoice Number', de: 'Rechnungsnummer', fr: 'Numéro de facture' },
                },
                {
                  name: 'referenceNumber',
                  type: 'text',
                  label: {
                    en: 'QR Reference Number',
                    de: 'QR-Referenznummer',
                    fr: 'Numéro de référence QR',
                  },
                },
                {
                  name: 'invoiceAmount',
                  type: 'number',
                  label: { en: 'Amount (CHF)', de: 'Betrag (CHF)', fr: 'Montant (CHF)' },
                },
                {
                  name: 'billCreatedDate',
                  type: 'date',
                  label: { en: 'Created', de: 'Erstellt am', fr: 'Créée le' },
                },
                {
                  name: 'cancelledDate',
                  type: 'date',
                  label: { en: 'Cancelled', de: 'Storniert am', fr: 'Annulée le' },
                },
                {
                  name: 'cancelReason',
                  type: 'text',
                  label: { en: 'Cancellation Reason', de: 'Stornogrund', fr: "Motif d'annulation" },
                },
              ],
            },
          ],
        },
        {
          label: { en: 'Payments', de: 'Zahlungen', fr: 'Paiements' },
          fields: [
            {
              type: 'row',
              fields: [
                // Written by the payment import, from the bank's camt.054 export. Only a payment
                // that matches the bill's QR reference and pays its amount, or slightly more, lands
                // here; the rest are reported back.
                {
                  name: 'paidDate',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'date',
                  label: {
                    en: 'Paid on',
                    de: 'Bezahlt am',
                    fr: 'Payée le',
                  },
                  admin: {
                    readOnly: true,
                    disableGroupBy: true,
                    description: {
                      en: 'The booking date of the payment in the bank file.',
                      de: 'Das Buchungsdatum der Zahlung in der Bankdatei.',
                      fr: 'La date de comptabilisation du paiement dans le fichier bancaire.',
                    },
                  },
                },
                {
                  name: 'paidAmount',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'number',
                  label: {
                    en: 'Paid Amount (CHF)',
                    de: 'Bezahlter Betrag (CHF)',
                    fr: 'Montant payé (CHF)',
                  },
                  admin: {
                    readOnly: true,
                    disableGroupBy: true,
                  },
                },
              ],
            },
            {
              name: 'paymentTransactionReference',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'text',
              label: {
                en: 'Bank Transaction Reference',
                de: 'Transaktionsreferenz der Bank',
                fr: 'Référence de transaction bancaire',
              },
              // Searched by when the finance team traces a booking back to its bank transaction.
              index: true,
              admin: {
                readOnly: true,
                disableGroupBy: true,
                description: {
                  en: 'The bank transaction (Transaktionsreferenz in the bank file) that paid this bill. Importing the same file again books it only once.',
                  de: 'Die Banktransaktion (Transaktionsreferenz in der Bankdatei), mit der diese Rechnung bezahlt wurde. Ein erneuter Import derselben Datei verbucht sie nur einmal.',
                  fr: 'La transaction bancaire (Transaktionsreferenz dans le fichier bancaire) qui a payé cette facture. Un nouvel import du même fichier ne la comptabilise qu’une fois.',
                },
              },
            },
            // Kept in line with the payments by `reconcileParticipantPayments`; stored rather than
            // derived so the list can be filtered by it.
            {
              name: 'doublePayment',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'checkbox',
              defaultValue: false,
              // The weekly finance mail looks the flagged bills up among every registration.
              index: true,
              label: {
                en: 'Double payment',
                de: 'Doppelzahlung',
                fr: 'Double paiement',
              },
              admin: {
                readOnly: true,
                description: {
                  en: 'More was paid for this bill than it asks for. Refund the payment or assign it to another bill under «Payments».',
                  de: 'Für diese Rechnung wurde mehr bezahlt, als sie verlangt. Die Zahlung zurückerstatten oder unter «Zahlungen» einer anderen Rechnung zuordnen.',
                  fr: 'Cette facture a reçu plus que son montant. Remboursez le paiement ou attribuez-le à une autre facture sous «Paiements».',
                },
              },
            },
            {
              name: 'payments',
              type: 'join',
              collection: 'bill-payments',
              on: 'allocations.participant',
              label: {
                en: 'Payments',
                de: 'Zahlungen',
                fr: 'Paiements',
              },
              admin: {
                defaultColumns: [
                  'transactionReference',
                  'bookingDate',
                  'amount',
                  'payer',
                  'refundedDate',
                ],
                description: {
                  en: 'The payments assigned to this bill.',
                  de: 'Die Zahlungen, die dieser Rechnung zugeordnet sind.',
                  fr: 'Les paiements attribués à cette facture.',
                },
              },
            },
            {
              name: 'matchedPayments',
              type: 'join',
              collection: 'bill-payments',
              on: 'matchedParticipant',
              label: {
                en: 'Payments with this Reference',
                de: 'Zahlungen mit dieser Referenz',
                fr: 'Paiements avec cette référence',
              },
              admin: {
                defaultColumns: [
                  'transactionReference',
                  'bookingDate',
                  'amount',
                  'payer',
                  'importOutcome',
                ],
                description: {
                  en: 'Every payment that came in with this bill’s reference, including ones assigned to another bill or not yet assigned.',
                  de: 'Alle Zahlungen, die mit der Referenz dieser Rechnung eingegangen sind, auch solche, die einer anderen Rechnung oder noch keiner zugeordnet sind.',
                  fr: 'Tous les paiements reçus avec la référence de cette facture, y compris ceux attribués à une autre facture ou pas encore attribués.',
                },
              },
            },
          ],
        },
        {
          label: { en: 'Person', de: 'Person', fr: 'Personne' },
          fields: [
            {
              name: 'fullName',
              type: 'text',
              required: true,
              label: {
                en: 'Full Name',
                de: 'Vollständiger Name',
                fr: 'Nom complet',
              },
              admin: {
                disableGroupBy: true,
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'firstName',
                  type: 'text',
                  label: {
                    en: 'First Name',
                    de: 'Vorname',
                    fr: 'Prénom',
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
                {
                  name: 'lastName',
                  type: 'text',
                  label: {
                    en: 'Last Name',
                    de: 'Nachname',
                    fr: 'Nom de famille',
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
                {
                  name: 'nickname',
                  type: 'text',
                  label: {
                    en: 'Nickname',
                    de: 'Ceviname',
                    fr: 'Surnom',
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
              ],
            },
            {
              name: 'email',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'text',
              label: { en: 'Email', de: 'E-Mail', fr: 'E-mail' },
              admin: { disableGroupBy: true },
            },
            {
              name: 'street',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'text',
              label: { en: 'Street', de: 'Strasse', fr: 'Rue' },
              admin: { disableGroupBy: true },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'zipCode',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  label: { en: 'Zip Code', de: 'PLZ', fr: 'NPA' },
                  admin: { disableGroupBy: true },
                },
                {
                  name: 'zip',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  label: { en: 'Zip', de: 'PLZ (zip)', fr: 'Zip' },
                  admin: { disableGroupBy: true },
                },
                {
                  name: 'town',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  label: { en: 'Town', de: 'Ort', fr: 'Localité' },
                  admin: { disableGroupBy: true },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'birthday',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  label: { en: 'Birthday', de: 'Geburtsdatum', fr: 'Date de naissance' },
                  admin: { disableGroupBy: true },
                },
                {
                  name: 'gender',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  label: { en: 'Gender', de: 'Geschlecht', fr: 'Genre' },
                  admin: { disableGroupBy: true },
                },
              ],
            },
          ],
        },
        {
          label: { en: 'Registration', de: 'Anmeldung', fr: 'Inscription' },
          fields: [
            {
              name: 'eventName',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'text',
              hooks: { afterRead: [decodeStoredEventName] },
              label: {
                en: 'Event Name',
                de: 'Anlass-Name',
                fr: "Nom de l'événement",
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'anmeldestatus',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  label: {
                    en: 'Registration status (Cevi.DB)',
                    de: 'Anmeldestatus',
                    fr: "Statut d'inscription (Cevi.DB)",
                  },
                  admin: {
                    disableGroupBy: true,
                    description: {
                      en: 'The "Administrationsangaben » Anmeldestatus" answer from the Cevi.DB.',
                      de: 'Die Antwort auf «Administrationsangaben » Anmeldestatus» aus der Cevi.DB.',
                      fr: 'La réponse « Administrationsangaben » Anmeldestatus » de la Cevi.DB.',
                    },
                  },
                },
                {
                  name: 'roleType',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  label: {
                    en: 'Role Type',
                    de: 'Rollentyp',
                    fr: 'Type de rôle',
                  },
                  admin: {
                    disableGroupBy: true,
                    description: {
                      en: 'Cevi.DB event role type (e.g. Event::Camp::Role::Participant)',
                      de: 'Cevi.DB-Anlass-Rollentyp (z.B. Event::Camp::Role::Participant)',
                      fr: "Type de rôle d'événement Cevi.DB",
                    },
                  },
                },
              ],
            },
            {
              name: 'active',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'checkbox',
              label: { en: 'Active', de: 'Aktiv', fr: 'Actif' },
              admin: { disableGroupBy: true },
              defaultValue: true,
            },
            {
              name: 'missingStammdaten',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'json',
              label: {
                en: 'Missing Master Data',
                de: 'Fehlende Stammdaten',
                fr: 'Stammdaten manquantes',
              },
              admin: {
                readOnly: true,
                disableGroupBy: true,
                components: {
                  Field: '@/features/billing/components/missing-data-field',
                },
              },
            },
            {
              name: 'missingAnmeldeangaben',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'json',
              label: {
                en: 'Missing Event Registration Answers',
                de: 'Fehlende Anmeldeangaben',
                fr: 'Anmeldeangaben manquantes',
              },
              admin: {
                readOnly: true,
                disableGroupBy: true,
                components: {
                  Field: '@/features/billing/components/missing-data-field',
                },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'enrollmentDate',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'date',
                  label: {
                    en: 'Enrollment Date (Cevi.DB)',
                    de: 'Anmeldedatum (Cevi.DB)',
                    fr: "Date d'inscription (Cevi.DB)",
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
                {
                  name: 'removedDate',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'date',
                  label: {
                    en: 'Cancelled on',
                    de: 'Storniert am',
                    fr: "Date d'annulation",
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
                {
                  name: 'reAddedDate',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'date',
                  label: {
                    en: 'Re-Added Date',
                    de: 'Erneut hinzugefügt am',
                    fr: 'Date de ré-ajout',
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
              ],
            },
            {
              name: 'participationUuid',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'text',
              required: true,
              unique: true,
              index: true,
              label: {
                en: 'Participation UUID',
                de: 'Teilnahme-UUID',
                fr: 'UUID de participation',
              },
              admin: {
                disableGroupBy: true,
                description: {
                  en: 'The UUID of the event_participation object in the Cevi.DB. Changes on re-enrollment.',
                  de: 'Die UUID des event_participation-Objekts in der Cevi.DB. Ändert sich bei erneuter Anmeldung.',
                  fr: "L'UUID de l'objet event_participation dans la Cevi.DB. Change lors d'une réinscription.",
                },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'userId',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  required: true,
                  index: true,
                  label: {
                    en: 'User ID (Person ID)',
                    de: 'Benutzer-ID (Personen-ID)',
                    fr: 'ID utilisateur (ID personne)',
                  },
                  admin: {
                    disableGroupBy: true,
                    description: {
                      en: 'The person ID in the Cevi.DB. Stable across re-enrollments.',
                      de: 'Die Personen-ID in der Cevi.DB. Bleibt bei erneuter Anmeldung gleich.',
                      fr: "L'ID de la personne dans la Cevi.DB. Stable lors de réinscriptions.",
                    },
                  },
                },
                {
                  name: 'eventId',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  required: true,
                  index: true,
                  label: {
                    en: 'Event ID',
                    de: 'Anlass-ID',
                    fr: "ID de l'événement",
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
                {
                  name: 'groupId',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'text',
                  label: {
                    en: 'Group ID',
                    de: 'Gruppen-ID',
                    fr: 'ID du groupe',
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
              ],
            },
          ],
        },
        {
          label: { en: 'Emails', de: 'E-Mails', fr: 'E-mails' },
          fields: [
            {
              name: 'relatedEmails',
              type: 'join',
              collection: 'outgoing-emails',
              on: 'billParticipant',
              label: {
                en: 'Related Emails',
                de: 'Verknüpfte E-Mails',
                fr: 'E-mails liés',
              },
              admin: {
                components: {
                  Cell: '@/features/billing/components/related-emails-cell',
                },
              },
              access: { read: canAccessBillingField },
            },
            // Reminders sent to the Adressverwalter of a Hof list every affected registration,
            // so they hang off the `billParticipants` side of `outgoing-emails`.
            {
              name: 'reminderEmails',
              type: 'join',
              collection: 'outgoing-emails',
              on: 'billParticipants',
              label: {
                en: 'Reminder emails',
                de: 'Erinnerungen an Adressverwalter',
                fr: 'Rappels envoyés',
              },
              admin: {
                disableListColumn: true,
              },
              access: { read: canAccessBillingField },
            },
          ],
        },
        {
          label: { en: 'History', de: 'Verlauf', fr: 'Historique' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'firstSyncDate',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'date',
                  label: {
                    en: 'First Sync Date',
                    de: 'Erstes Sync-Datum',
                    fr: 'Date de première synchronisation',
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
                {
                  name: 'lastSyncDate',
                  access: { read: canAccessBillingField, update: canAccessBillingField },
                  type: 'date',
                  label: {
                    en: 'Last Sync Date',
                    de: 'Letztes Sync-Datum',
                    fr: 'Date de dernière synchronisation',
                  },
                  admin: {
                    disableGroupBy: true,
                  },
                },
              ],
            },
            {
              name: 'syncHistory',
              access: { read: canAccessBillingField, update: canAccessBillingField },
              type: 'json',
              label: {
                en: 'Sync History',
                de: 'Sync-Verlauf',
                fr: 'Historique de synchronisation',
              },
              admin: {
                disableGroupBy: true,
                description: {
                  en: 'Array of { date, action } entries for audit trail.',
                  de: 'Array von { date, action } Einträgen für den Audit-Trail.',
                  fr: "Tableau d'entrées { date, action } pour la piste d'audit.",
                },
                components: {
                  Field: '@/features/billing/components/sync-history-field',
                },
              },
            },
          ],
        },
      ],
    },
  ],
};

export default BillParticipantsCollection;
