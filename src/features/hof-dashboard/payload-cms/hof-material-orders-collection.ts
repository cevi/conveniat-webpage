import { orderTypeOptions } from '@/features/hof-dashboard/payload-cms/options';
import { canReviewHofDashboard } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

/**
 * The material a Hof orders, one entry per Hof and order. Each line keeps the id of the
 * material in the dashboard settings and a copy of its name, so the order still reads when the
 * list is edited after the Hof ordered.
 */
export const HofMaterialOrdersCollection: CollectionConfig = {
  slug: 'hof-material-orders',
  typescript: { interface: 'HofMaterialOrder' },
  labels: {
    singular: { de: 'Hof-Materialbestellung', en: 'Hof material order', fr: 'Commande du Hof' },
    plural: { de: 'Hof-Materialbestellungen', en: 'Hof material orders', fr: 'Commandes des Hofs' },
  },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeHofDashboard.label,
    defaultColumns: ['hof', 'orderType', 'updatedAt'],
  },
  access: {
    read: canReviewHofDashboard,
    create: canReviewHofDashboard,
    update: canReviewHofDashboard,
    delete: isFullAdmin,
  },
  indexes: [{ fields: ['hof', 'orderType'], unique: true }],
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'hof',
          type: 'relationship',
          relationTo: 'hoefe',
          required: true,
          index: true,
          label: { de: 'Hof', en: 'Hof', fr: 'Hof' },
          admin: { width: '50%' },
        },
        {
          name: 'orderType',
          type: 'select',
          required: true,
          options: orderTypeOptions,
          label: { de: 'Bestellung', en: 'Order', fr: 'Commande' },
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: { de: 'Positionen', en: 'Lines', fr: 'Lignes' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'itemId',
              type: 'text',
              required: true,
              label: { de: 'Material-ID', en: 'Material ID', fr: 'ID du matériel' },
              admin: { width: '25%', readOnly: true },
            },
            {
              name: 'name',
              type: 'text',
              required: true,
              label: { de: 'Material', en: 'Material', fr: 'Matériel' },
              admin: { width: '50%' },
            },
            {
              name: 'quantity',
              type: 'number',
              required: true,
              min: 0,
              label: { de: 'Anzahl', en: 'Quantity', fr: 'Quantité' },
              admin: { width: '25%' },
            },
          ],
        },
      ],
    },
    {
      name: 'powerConnection',
      type: 'checkbox',
      label: { de: 'Stromanschluss', en: 'Power connection', fr: 'Raccordement électrique' },
      admin: {
        condition: (data) => data['orderType'] === 'stadtleben',
      },
    },
    {
      name: 'lastEditedBy',
      type: 'relationship',
      relationTo: 'users',
      label: {
        de: 'Zuletzt bearbeitet von',
        en: 'Last edited by',
        fr: 'Dernière modification par',
      },
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
};
