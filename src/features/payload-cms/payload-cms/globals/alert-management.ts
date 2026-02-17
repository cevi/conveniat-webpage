import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { GlobalConfig } from 'payload';

export const AlertManagement: GlobalConfig = {
  slug: 'alert-management',
  label: {
    en: 'Emergency Alerts',
    de: 'Notfall Alarme',
    fr: "Alertes d'urgence",
  },
  access: {
    read: () => true,
  },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeAppFeatures,
    hideAPIURL: true,
    components: {
      views: {
        edit: {
          default: {
            Component: '@/features/payload-cms/payload-cms/views/alert-management',
          },
        },
      },
    },
  },
  fields: [
    {
      name: 'dummy',
      type: 'text',
      hidden: true,
    },
  ],
};
