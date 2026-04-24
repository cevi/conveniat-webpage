import { canAccessBilling } from '@/features/payload-cms/payload-cms/access-rules/can-access-billing';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

export const BillPdfsCollection: CollectionConfig = {
  slug: 'bill-pdfs',
  upload: {
    staticDir: 'bill-pdfs',
    mimeTypes: ['application/pdf'],
  },
  labels: {
    singular: {
      en: 'Bill PDF',
      de: 'Rechnungs-PDF',
      fr: 'PDF de facture',
    },
    plural: {
      en: 'Bill PDFs',
      de: 'Rechnungs-PDFs',
      fr: 'PDFs de factures',
    },
  },
  admin: {
    group: AdminPanelDashboardGroups.InternalCollections,
    useAsTitle: 'filename',
  },
  access: {
    read: canAccessBilling,
    create: canAccessBilling,
    update: canAccessBilling,
    delete: () => false,
  },
  fields: [],
};
