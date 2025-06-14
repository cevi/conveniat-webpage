import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { localizedDefaultValue } from '@/features/payload-cms/payload-cms/utils/localized-default-value';
import { revalidateTag } from 'next/cache';
import type { GlobalConfig } from 'payload';

export const PWAGlobal: GlobalConfig = {
  slug: 'PWA',

  hooks: {
    afterChange: [
      (): void => {
        console.log('PWA Global afterChange hook triggered --> revalidating manifest');
        revalidateTag('manifest');
      },
    ],
  },

  label: {
    en: 'Progressive Web App Settings',
    de: 'Einstellungen für die Progressive Web App',
    fr: 'Paramètres de l’application web progressive',
  },
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
