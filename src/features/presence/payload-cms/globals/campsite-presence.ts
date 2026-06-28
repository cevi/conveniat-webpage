import { environmentVariables } from '@/config/environment-variables';
import { shouldHideInAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { GlobalConfig } from 'payload';

export const CampsitePresenceGlobal: GlobalConfig = {
  slug: 'campsite-presence',
  label: {
    en: 'Campsite Presence',
    de: 'Personen auf dem Lagerplatz',
    fr: 'Présence sur le terrain de camp',
  },
  access: {
    read: () => true,
  },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeAppFeatures,
    hideAPIURL: true,
    components: {
      views: {
        edit: {
          default: {
            Component: '@/features/presence/payload-cms/views/campsite-presence-view',
          },
        },
      },
    },
    hidden: (args): boolean => {
      if (!environmentVariables.FEATURE_ENABLE_PRESENCE_TRACKING) {
        return true;
      }
      return shouldHideInAdminPanel(args);
    },
  },
  fields: [
    {
      name: 'dummy',
      type: 'text',
      hidden: true,
    },
  ],
};
export default CampsitePresenceGlobal;
