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
      name: 'startDate',
      label: {
        en: 'Presence Tracking Start Date',
        de: 'Startdatum der Anwesenheitserfassung',
        fr: 'Date de début du suivi de présence',
      },
      type: 'date',
      required: false,
    },
    {
      name: 'endDate',
      label: {
        en: 'Presence Tracking End Date',
        de: 'Enddatum der Anwesenheitserfassung',
        fr: 'Date de fin du suivi de présence',
      },
      type: 'date',
      required: false,
    },
  ],
};
export default CampsitePresenceGlobal;
