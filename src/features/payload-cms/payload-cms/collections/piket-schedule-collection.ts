import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import type { CollectionConfig } from 'payload';

export const PiketScheduleCollection: CollectionConfig = {
  slug: 'piket-schedules',
  trash: true,
  labels: {
    singular: {
      en: 'Piket Schedule',
      de: 'Piket-Zeitplan',
      fr: 'Horaire de permanence',
    },
    plural: {
      en: 'Piket Schedules',
      de: 'Piket-Zeitpläne',
      fr: 'Horaires de permanence',
    },
  },
  admin: {
    useAsTitle: 'id',
    group: AdminPanelDashboardGroups.InternalCollections,
    defaultColumns: ['startTime', 'endTime', 'chatTypes'],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  hooks: {
    afterChange: [
      async ({ req }): Promise<void> => {
        try {
          const { syncPiketMembersToOpenChats } =
            await import('@/features/chat/api/utils/piket-service');
          await syncPiketMembersToOpenChats(req.payload);
        } catch (error: unknown) {
          req.payload.logger.error({
            err: error instanceof Error ? error : new Error(String(error)),
            msg: 'Failed to run piket schedule afterChange membership sync',
          });
        }
      },
    ],
  },
  fields: [
    {
      name: 'users',
      label: 'Piket Members',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      required: true,
    },
    {
      name: 'startTime',
      label: 'Start Time',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'endTime',
      label: 'End Time',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'chatTypes',
      label: 'Target Chat Types',
      type: 'select',
      hasMany: true,
      required: true,
      options: [
        { label: 'Emergency', value: 'EMERGENCY' },
        { label: 'Support Group', value: 'SUPPORT_GROUP' },
      ],
    },
    LastEditedByUserField,
  ],
};
