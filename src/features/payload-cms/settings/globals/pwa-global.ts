import type { GlobalConfig } from 'payload';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/settings/admin-panel-dashboard-groups';
import { localizedDefaultValue } from '@/features/payload-cms/settings/utils/localized-default-value';

export const PWAGlobal: GlobalConfig = {
  slug: 'PWA',
  label: 'PWA Settings',
  admin: {
    group: AdminPanelDashboardGroups.GlobalSettings,
    description: {
      en: 'Settings for the Progressive Web App',
      de: 'Einstellungen für die Progressive Web App',
      fr: "Paramètres pour l'application web progressive",
    },
  },
  fields: [
    {
      name: 'appName',
      label: 'App Name',
      type: 'text',
      required: true,
      defaultValue: 'conveniat27',
      admin: {
        readOnly: true,
        description:
          'Once deployed as an PWA App to the App Store, this name will be used ' +
          'as the App Name. A change will require a new deployment to the App Store.',
      },
    },
    {
      name: 'appShortName',
      label: 'App Short Name',
      type: 'text',
      required: true,
      defaultValue: 'conveniat27',
      admin: {
        readOnly: true,
        description:
          'Once deployed as an PWA App to the App Store, this name will be used ' +
          'as the App Name. A change will require a new deployment to the App Store.',
      },
    },
    {
      name: 'appDescription',
      label: 'App Description',
      type: 'textarea',
      required: true,
      defaultValue: localizedDefaultValue({
        de: 'conveniat27 - MIR SIND CEVI',
        en: 'conveniat27 - WE ARE CEVI',
        fr: 'conveniat27 - NOUS SOMMES LES UCS',
      }),
      admin: {
        readOnly: true,
        description:
          'Once deployed as an PWA App to the App Store, this description will be used ' +
          'as the App Description. A change will require a new deployment to the App Store.',
      },
    },
  ],
};
