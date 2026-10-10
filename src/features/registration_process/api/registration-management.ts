import { environmentVariables } from '@/config/environment-variables';
import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  browserCookieProblemMessages,
  CLEAR_COOKIE_KEYWORD,
  findBrowserCookieProblem,
} from '@/features/registration_process/api/cevidb-browser-cookie';
import type { GlobalConfig } from 'payload';

export const RegistrationManagement: GlobalConfig = {
  slug: 'registration-management',
  label: {
    en: 'Helper Registration',
    de: 'Helfer Anmeldung',
    fr: 'Inscription des assistants',
  },
  access: {
    read: (args) => {
      if (!environmentVariables.FEATURE_ENABLE_REGISTRATION_MANAGEMENT) return false;
      return hasAdminOrWebAccess(args);
    },
    update: (args) => {
      if (!environmentVariables.FEATURE_ENABLE_REGISTRATION_MANAGEMENT) return false;
      return hasAdminOrWebAccess(args);
    },
  },
  admin: {
    hidden: () => !environmentVariables.FEATURE_ENABLE_REGISTRATION_MANAGEMENT,
    group: AdminPanelDashboardGroups.WebpageHelpers.label,
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
      label: 'Cevi.DB Browser Cookie',
      validate: (
        value: unknown,
        { req }: { req: { i18n: { language: string } } },
      ): string | true => {
        const problem = findBrowserCookieProblem(value);
        if (problem === undefined) return true;
        const language = req.i18n.language;
        const locale = language === 'fr' || language === 'en' ? language : 'de';
        return browserCookieProblemMessages[problem][locale];
      },
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
            if (value === CLEAR_COOKIE_KEYWORD) {
              return '';
            }
            return value;
          },
        ],
      },
      admin: {
        description: {
          en: 'Session cookie of a signed-in Cevi.DB browser. Highly sensitive, write-only: the value is never shown after saving. Sign in with "Remember me" ticked and paste the whole Cookie header, including remember_person_token. The app uses the session every ten minutes to keep it alive, but signing out of Cevi.DB in that browser ends it for good. Leave empty to keep the current value. Type "CLEAR" to delete the cookie.',
          de: 'Session-Cookie eines in der Cevi.DB angemeldeten Browsers. Hochsensibel und nur schreibbar: der Wert wird nach dem Speichern nie angezeigt. Mit «Angemeldet bleiben» anmelden und den ganzen Cookie-Header einfügen, inklusive remember_person_token. Die App verwendet die Sitzung alle zehn Minuten, damit sie nicht abläuft; ein Abmelden von der Cevi.DB in diesem Browser beendet sie aber endgültig. Leer lassen, um den aktuellen Wert zu behalten. «CLEAR» eingeben, um das Cookie zu löschen.',
          fr: "Cookie de session d'un navigateur connecté à Cevi.DB. Très sensible, en écriture seule : la valeur n'est jamais affichée après l'enregistrement. Se connecter en cochant « Se souvenir de moi » et coller tout l'en-tête Cookie, y compris remember_person_token. L'application utilise la session toutes les dix minutes pour la maintenir, mais une déconnexion de Cevi.DB dans ce navigateur y met fin définitivement. Laisser vide pour conserver la valeur actuelle. Saisir « CLEAR » pour supprimer le cookie.",
        },
      },
    },
  ],
};
