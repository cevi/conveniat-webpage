import { GlobalConfig } from 'payload';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';

export const HeaderGlobal: GlobalConfig = {
  slug: 'header',
  label: 'Header Navigation',
  fields: [],
  admin: {
    group: AdminPanelDashboardGroups.GlobalSettings,
    description: 'Settings for the header navigation',
  },
};
