import { environmentVariables } from '@/config/environment-variables';
import { HOF_ORDER_TYPE_LABELS } from '@/features/hof-dashboard/constants';
import { hofTitle, hofTitleField } from '@/features/hof-dashboard/payload-cms/hof-title';
import { orderTypeOptions } from '@/features/hof-dashboard/payload-cms/options';
import { canReviewHofDashboard } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { HofMaterialOrder } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';

const setTitle: CollectionBeforeChangeHook<HofMaterialOrder> = async ({
  data,
  originalDoc,
  req,
}) => {
  const type = data.orderType ?? originalDoc?.orderType;
  if (type === undefined) return data;
  const title = await hofTitle(req, data.hof ?? originalDoc?.hof, HOF_ORDER_TYPE_LABELS[type].de);
  if (title !== undefined) data.title = title;
  return data;
};

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
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.BackofficeHofDashboard.label,
    defaultColumns: ['title', 'lastEditedAt', 'lastEditedBy'],
    hidden: (): boolean => !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
    description: {
      en: 'The material the Höfe order on the dashboard. Material names are kept in German, as they were when the Hof ordered.',
      de: 'Das Material, das die Höfe auf dem Dashboard bestellen. Die Namen stehen auf Deutsch, so wie sie bei der Bestellung hiessen.',
      fr: 'Le matériel commandé par les Hofs sur le tableau de bord. Les noms sont conservés en allemand, tels qu’ils étaient lors de la commande.',
    },
  },
  access: {
    read: canReviewHofDashboard,
    // only the dashboard's tRPC procedures create these, through the local API
    create: () => false,
    update: canReviewHofDashboard,
    delete: isFullAdmin,
  },
  indexes: [{ fields: ['hof', 'orderType'], unique: true }],
  hooks: { beforeChange: [setTitle] },
  fields: [
    hofTitleField,
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
          admin: { width: '50%', readOnly: true },
        },
        {
          name: 'orderType',
          type: 'select',
          required: true,
          options: orderTypeOptions,
          label: { de: 'Bestellung', en: 'Order', fr: 'Commande' },
          admin: { width: '50%', readOnly: true },
        },
      ],
    },
    {
      name: 'items',
      type: 'array',
      label: { de: 'Positionen', en: 'Lines', fr: 'Lignes' },
      labels: {
        singular: { de: 'Position', en: 'Line', fr: 'Ligne' },
        plural: { de: 'Positionen', en: 'Lines', fr: 'Lignes' },
      },
      admin: {
        components: {
          RowLabel: {
            path: '@/features/hof-dashboard/payload-cms/components/fields-row-label#FieldsRowLabel',
            clientProps: { fields: ['quantity', 'name'] },
          },
        },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'itemId',
              type: 'text',
              required: true,
              label: { de: 'Material-ID', en: 'Material ID', fr: 'ID du matériel' },
              // links the line to the list in the settings; nothing an editor needs to see
              admin: { hidden: true },
            },
            {
              name: 'name',
              type: 'text',
              required: true,
              label: { de: 'Material', en: 'Material', fr: 'Matériel' },
              admin: { width: '70%' },
            },
            {
              name: 'quantity',
              type: 'number',
              required: true,
              min: 0,
              label: { de: 'Anzahl', en: 'Quantity', fr: 'Quantité' },
              admin: { width: '30%' },
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
    {
      // the Hof's own last save, which a title refresh or a reviewer's edit leaves alone
      name: 'lastEditedAt',
      type: 'date',
      label: {
        de: 'Zuletzt gespeichert vom Hof',
        en: 'Last saved by the Hof',
        fr: 'Dernier enregistrement par le Hof',
      },
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
};
