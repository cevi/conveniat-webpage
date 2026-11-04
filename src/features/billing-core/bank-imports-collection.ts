import { canAccessBilling } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

export const BANK_IMPORTS_COLLECTION = 'bank-imports';

/**
 * One row per imported bank file: when it was imported and up to when the bank's data in it
 * reach. A payment reminder may only go to a bill that is unpaid as of the latest bank data, so
 * that time is kept apart from the import time; a file can be imported days after its export,
 * and an older file after a newer one.
 *
 * Written by the import alone. Out of the sidebar: the payments list shows the latest import.
 */
export const BankImportsCollection: CollectionConfig = {
  slug: BANK_IMPORTS_COLLECTION,
  labels: {
    singular: { en: 'Bank import', de: 'Bankimport', fr: 'Import bancaire' },
    plural: { en: 'Bank imports', de: 'Bankimporte', fr: 'Imports bancaires' },
  },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeBilling.label,
    hidden: true,
    useAsTitle: 'filename',
    defaultColumns: ['createdAt', 'bankExportedAt', 'importedBy', 'paymentCount', 'bookedCount'],
  },
  access: {
    read: canAccessBilling,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'bankExportedAt',
      type: 'date',
      required: true,
      index: true,
      label: {
        en: 'Bank data as of',
        de: 'Stand der Bankdaten',
        fr: 'Données bancaires au',
      },
      admin: {
        description: {
          en: 'When the file was exported from the e-banking: every payment up to then is in it.',
          de: 'Wann die Datei aus dem E-Banking exportiert wurde: Alle Zahlungen bis dahin sind darin.',
          fr: 'Quand le fichier a été exporté de l’e-banking : tous les paiements jusque-là y figurent.',
        },
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm' },
      },
    },
    {
      name: 'importedBy',
      type: 'text',
      required: true,
      label: { en: 'Imported by', de: 'Importiert von', fr: 'Importé par' },
    },
    {
      name: 'filename',
      type: 'text',
      label: { en: 'File', de: 'Datei', fr: 'Fichier' },
    },
    {
      name: 'paymentCount',
      type: 'number',
      required: true,
      label: { en: 'Payments', de: 'Zahlungen', fr: 'Paiements' },
    },
    {
      name: 'bookedCount',
      type: 'number',
      required: true,
      label: { en: 'Booked', de: 'Verbucht', fr: 'Comptabilisés' },
    },
  ],
};
