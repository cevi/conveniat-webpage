import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { GlobalConfig } from 'payload';

export const RegistrationManagement: GlobalConfig = {
  slug: 'registration-management',
  label: {
    en: 'Helper Registration',
    de: 'Helfer Anmeldung',
    fr: 'Inscription des assistants',
  },
  access: {
    read: () => true, // Access controlled by canUserAccessAdminPanel in router as well
    update: () => true,
  },
  admin: {
    group: AdminPanelDashboardGroups.HelferAnmeldung,
    hideAPIURL: true,
    components: {
      views: {
        edit: {
          default: {
            Component: '@/features/registration_process/components/management-view',
            tab: {
              label: 'Management',
              href: '',
            },
          },
          enrollment: {
            path: '/enrollment',
            Component: '@/features/registration_process/components/enrollment-view',
            tab: {
              label: 'New Enrollment',
              href: '/enrollment',
            },
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
