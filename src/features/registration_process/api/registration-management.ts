import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
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
    read: canAccessAdminPanel,
    update: canAccessAdminPanel,
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
      name: 'confirmationEmail',
      type: 'richText',
      localized: true,
      label: {
        en: 'Confirmation Email',
        de: 'Bestätigungs-E-Mail',
        fr: 'E-mail de confirmation',
      },
      admin: {
        description: {
          en: 'Email sent to the helper after registration. This email confirms a provisional registration. The final confirmation is sent by the responsible department.',
          de: 'E-Mail an den Helfer nach der Anmeldung. Diese Mail bestätigt eine provisorische Anmeldung. Die definitive Bestätigung erfolgt durch das entsprechende Ressort.',
          fr: "E-mail envoyé à l'assistant après l'inscription. Cet e-mail confirme une inscription provisoire. La confirmation définitive est envoyée par le département responsable.",
        },
      },
    },
    {
      name: 'browserCookie',
      type: 'text',
      label: 'Hitobito Browser Cookie',
      hooks: {
        afterRead: [
          ({ req, value }): string => {
            if (req.context['internal'] === true) {
              return typeof value === 'string' ? value : '';
            }
            return '';
          },
        ],
        beforeChange: [
          ({ value, originalDoc }): unknown => {
            if (typeof value !== 'string' || value.trim() === '') {
              // Retain existing value if the submission is empty
              // This is needed because afterRead makes the form appear empty.
              return (originalDoc as Record<string, unknown> | undefined)?.['browserCookie'];
            }
            // Allow manual clearing by inputting a specific placeholder
            if (value === 'CLEAR') {
              return '';
            }
            return value;
          },
        ],
      },
      admin: {
        description:
          'Session cookie for the hitobito API. Highly sensitive, write-only. Value will never be shown after saving. Leave empty to keep the current value. Type "CLEAR" to delete the cookie.',
      },
    },
  ],
};
