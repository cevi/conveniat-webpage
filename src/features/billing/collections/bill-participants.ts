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
    defaultColumns: [
      'fullName',
      'eventId',
      'status',
      'invoiceNumber',
      'invoiceAmount',
      'billCreatedDate',
      'billSentDate',
      'hitobitoLink',
      'actions',
    ],
    description: {
      en: 'Synced from Cevi.DB. Use the toolbar above the table to sync, generate, and send bills.',
      de: 'Synchronisiert von der Cevi.DB. Nutze die Aktionsleiste über der Tabelle zum Synchronisieren, Generieren und Versenden.',
      fr: "Synchronisé depuis Cevi.DB. Utilisez la barre d'outils au-dessus du tableau pour synchroniser, générer et envoyer.",
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
    },
    {
      name: 'lastName',
      type: 'text',
      label: {
        en: 'Last Name',
        de: 'Nachname',
        fr: 'Nom de famille',
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
        description: {
          en: 'Hitobito event role type (e.g. Event::Camp::Role::Participant)',
          de: 'Hitobito Anlass-Rollentyp (z.B. Event::Camp::Role::Participant)',
          fr: "Type de rôle d'événement Hitobito",
        },
      },
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
        { label: { en: 'New', de: 'Neu', fr: 'Nouveau' }, value: 'new' },
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
