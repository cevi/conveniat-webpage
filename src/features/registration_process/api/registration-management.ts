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
    group: {
      en: 'Backoffice App Features',
      de: 'Backoffice App Funktionen',
      fr: 'Fonctionnalités Backoffice',
    },
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
