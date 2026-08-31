import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import {
  canAccessBillingField,
  canUserAccessBilling,
} from '@/features/payload-cms/payload-cms/access-rules/can-access-billing';
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
    hidden: ({ user }): boolean => !canUserAccessBilling(user),
    hideAPIURL: true,
    group: {
      en: 'Billing',
      de: 'Rechnungen',
      fr: 'Facturation',
    },
    useAsTitle: 'fullName',
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
  access: {
    read: canAccessAdminPanel,
    // Only allow create/update/delete from internal API calls (billing services),
    // not from the admin panel UI.
    create: ({ req }): boolean => req.context['internal'] === true,
    update: ({ req }): boolean => req.context['internal'] === true,
    delete: ({ req }): boolean => req.context['internal'] === true,
  },
  fields: [
    // Identity fields
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
    {
      name: 'eventName',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      type: 'text',
      label: {
        en: 'Event Name',
        de: 'Anlass-Name',
        fr: "Nom de l'événement",
      },
    },

    // Person info
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
          en: 'Hitobito event role type (e.g. Event::Camp::Role::Participant)',
          de: 'Hitobito Anlass-Rollentyp (z.B. Event::Camp::Role::Participant)',
          fr: "Type de rôle d'événement Hitobito",
        },
      },
    },
    {
      name: 'street',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      type: 'text',
      label: { en: 'Street', de: 'Strasse', fr: 'Rue' },
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
      name: 'zipCode',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      type: 'text',
      label: { en: 'Zip Code', de: 'PLZ', fr: 'NPA' },
      admin: { disableGroupBy: true },
    },
    {
      name: 'town',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      type: 'text',
      label: { en: 'Town', de: 'Ort', fr: 'Localité' },
      admin: { disableGroupBy: true },
    },
    {
      name: 'email',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      type: 'text',
      label: { en: 'Email', de: 'E-Mail', fr: 'E-mail' },
      admin: { disableGroupBy: true },
    },
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
    {
      name: 'active',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      type: 'checkbox',
      label: { en: 'Active', de: 'Aktiv', fr: 'Actif' },
      admin: { disableGroupBy: true },
      defaultValue: true,
    },

    // Date tracking
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
        description: {
          en: 'Free text carried into the finance overview export. Never touched by a Cevi.DB sync.',
          de: 'Freitext, der in den Rechnungsübersicht-Export übernommen wird. Wird von einem Cevi.DB-Abgleich nie überschrieben.',
          fr: "Texte libre repris dans l'export de synthèse. Jamais écrasé par une synchronisation Cevi.DB.",
        },
        disableGroupBy: true,
      },
    },
    {
      name: 'removedDate',
      access: { read: canAccessBillingField, update: canAccessBillingField },
      type: 'date',
      label: {
        en: 'Removed Date',
        de: 'Entfernt am',
        fr: 'Date de suppression',
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

    // Invoice details
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
        { name: 'label', type: 'text', label: { en: 'Label', de: 'Bezeichnung', fr: 'Libellé' } },
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

    // Status
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
          label: { en: 'Bill Created', de: 'Rechnung erstellt', fr: 'Facture créée' },
          value: 'bill_created',
        },
        {
          label: { en: 'Bill Sent', de: 'Rechnung gesendet', fr: 'Facture envoyée' },
          value: 'bill_sent',
        },
        { label: { en: 'Removed', de: 'Entfernt', fr: 'Supprimé' }, value: 'removed' },
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
      ],
      label: {
        en: 'Status',
        de: 'Status',
        fr: 'Statut',
      },
      admin: {
        components: {
          Cell: '@/features/billing/components/billing-status-cell',
        },
      },
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

    // Audit trail
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

    // Related Emails (Join field)
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

    // Virtual field for per-row actions in the list view
    {
      name: 'hitobitoLink',
      type: 'ui',
      admin: {
        components: {
          Cell: '@/features/billing/components/hitobito-link-cell',
        },
      },
    },

    // Virtual field for actions (PDF, Resend, etc.)
    {
      name: 'actions',
      type: 'ui',
      admin: {
        components: {
          Cell: '@/features/billing/components/billing-actions-cell',
        },
      },
    },
  ],
};

export default BillParticipantsCollection;
