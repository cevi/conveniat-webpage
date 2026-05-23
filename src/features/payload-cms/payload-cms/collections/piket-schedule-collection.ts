import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { CollectionConfig, DateFieldValidation } from 'payload';

const EndAfterStartTimeValidation: DateFieldValidation = (value, { siblingData, req }) => {
  const localeString = req.i18n.language;
  const startTimeRaw = (siblingData as { startTime?: string }).startTime;
  if (startTimeRaw === undefined || startTimeRaw === '') {
    return getValidationMessage(localeString, {
      en: 'Start time is required.',
      de: 'Startzeit ist erforderlich.',
      fr: 'L’heure de début est requise.',
    });
  }
  const startTime = new Date(startTimeRaw);
  const endTime = new Date(value as unknown as string);
  if (endTime <= startTime) {
    return getValidationMessage(localeString, {
      en: 'End time must be later than start time.',
      de: 'Endzeit muss nach der Startzeit liegen.',
      fr: 'L’heure de fin doit être postérieure à l’heure de début.',
    });
  }
  return true;
};

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
    read: hasAdminOrWebAccess,
    create: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
    delete: hasAdminOrWebAccess,
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
      validate: EndAfterStartTimeValidation,
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
