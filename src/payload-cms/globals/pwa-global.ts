import { GlobalConfig } from 'payload';

export const PWAGlobals: GlobalConfig = {
  slug: 'PWA',
  label: 'PWA Settings',
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
