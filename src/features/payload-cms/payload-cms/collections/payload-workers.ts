import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

export const PayloadWorkersCollection: CollectionConfig = {
  slug: 'payload-workers',
  admin: {
    useAsTitle: 'workerId',
    group: AdminPanelDashboardGroups.GlobalSettings,
    defaultColumns: ['workerId', 'hostname', 'queues', 'lastHeartbeat', 'activeJobId'],
    description: {
      en: 'Registered background worker instances and their activity heartbeats.',
      de: 'Registrierte Hintergrund-Worker-Instanzen und deren Aktivitäts-Heartbeats.',
      fr: "Instances de workers en arrière-plan enregistrées et leurs signaux d'activité.",
    },
  },
  labels: {
    singular: {
      en: 'Payload Worker',
      de: 'Payload Worker',
      fr: 'Payload Worker',
    },
    plural: {
      en: 'Payload Workers',
      de: 'Payload Workers',
      fr: 'Payload Workers',
    },
  },
  access: {
    read: hasAdminOrWebAccess,
  },
  fields: [
    {
      name: 'workerId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'hostname',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'queues',
      type: 'array',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'lastHeartbeat',
      type: 'date',
      required: true,
      index: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'activeJobId',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
  ],
};

export default PayloadWorkersCollection;
