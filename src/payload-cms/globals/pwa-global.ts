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
    },
    {
      name: 'appShortName',
      label: 'App Short Name',
      type: 'text',
      required: true,
      defaultValue: 'Conveniat',
    },
    {
      name: 'appDescription',
      label: 'App Description',
      type: 'textarea',
      required: true,
      defaultValue: 'Conveniat 2027 - MIR SIND CEVI',
    },
  ],
};
