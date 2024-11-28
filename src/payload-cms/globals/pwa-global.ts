import { GlobalConfig } from 'payload';

export const PWAGlobal: GlobalConfig = {
  slug: 'PWA',
  label: 'PWA Settings',
  admin: {
    group: 'Global Settings',
    description: 'Settings for the Progressive Web App',
  },
  fields: [
    {
      name: 'appName',
      label: 'App Name',
      type: 'text',
      required: true,
      defaultValue: 'Conveniat 2027',
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
      defaultValue: 'Conveniat',
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
      defaultValue: 'Conveniat 2027 - MIR SIND CEVI',
      admin: {
        readOnly: true,
        description:
          'Once deployed as an PWA App to the App Store, this description will be used ' +
          'as the App Description. A change will require a new deployment to the App Store.',
      },
    },
  ],
};
