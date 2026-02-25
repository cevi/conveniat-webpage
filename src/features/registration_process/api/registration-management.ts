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
          // @ts-expect-error Payload falls back to default Document View when Component is omitted
          config: {
            path: '/config',
            tab: {
              label: 'Settings',
              href: '/config',
            },
          },
        },
      },
    },
  },
  fields: [
    {
      name: 'temporaryConfirmationEmail',
      type: 'richText',
      localized: true,
      label: {
        en: 'Temporary Confirmation Email',
        de: 'Temporäre Bestätigungs-E-Mail',
        fr: 'E-mail de confirmation temporaire',
      },
      admin: {
        description: {
          en: 'Email sent to the helper after registration. This email confirms a provisional registration. The final confirmation is sent by the responsible department.',
          de: 'E-Mail an den Helfer nach der Anmeldung. Diese Mail bestätigt eine profisorische Anmeldung. Die definitive Bestätigung erfolgt durch das entsprechende Ressort.',
          fr: "E-mail envoyé à l'assistant après l'inscription. Cet e-mail confirme une inscription provisoire. La confirmation définitive est envoyée par le département responsable.",
        },
      },
    },
  ],
};
