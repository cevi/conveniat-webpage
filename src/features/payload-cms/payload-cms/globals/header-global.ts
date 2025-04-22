import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { Field, GlobalConfig } from 'payload';

const MainMenu: Field = {
  name: 'mainMenu',
  label: 'Main Menu',
  type: 'array',
  localized: true,
  labels: {
    singular: 'Menu Item',
    plural: 'Menu Items',
  },
  fields: [
    {
      name: 'label',
      label: 'Label',
      type: 'text',
      required: true,
    },
    {
      name: 'link',
      label: 'Link',
      type: 'text',
      required: true,
    },
  ],
};

export const HeaderGlobal: GlobalConfig = {
  slug: 'header',
  label: 'Header Navigation',
  fields: [MainMenu],
  admin: {
    group: AdminPanelDashboardGroups.GlobalSettings,
    description: 'Settings for the header navigation',
  },
};
