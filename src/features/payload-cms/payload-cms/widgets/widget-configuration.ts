import { environmentVariables } from '@/config/environment-variables';
import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import type { Widget, WidgetInstance } from 'payload';

export const enabledWidgets: Widget[] = [
  {
    slug: 'emergency-alerts',
    Component: '@/features/payload-cms/payload-cms/widgets/emergency-widget#default',
  },
  {
    slug: 'presence-count',
    Component: '@/features/presence/payload-cms/widgets/presence-count-widget#default',
  },
  {
    slug: 'user-count',
    Component: '@/features/payload-cms/payload-cms/widgets/user-count-widget#default',
  },
  {
    slug: 'email-stats',
    Component: '@/features/payload-cms/payload-cms/widgets/email-stats-widget#default',
  },
  {
    slug: 'admin-areas',
    label: { de: 'Bereiche', en: 'Areas', fr: 'Domaines' },
    Component: '@/features/payload-cms/payload-cms/widgets/admin-areas-widget#default',
    minWidth: 'medium',
  },
  {
    slug: 'access-overview',
    label: { de: 'Zugriff nach Gruppe', en: 'Access by group', fr: 'Accès par groupe' },
    Component: '@/features/payload-cms/payload-cms/widgets/access-overview-widget#default',
    minWidth: 'medium',
  },
];

export const widgetDefaultLayout = async (): Promise<WidgetInstance[]> => {
  const session = await auth();
  const user = isValidNextAuthUser(session?.user) ? session.user : undefined;

  const userGroups = user?.group_ids ?? [];

  const hasAccessToWidgets = hasAccessToThisUser({
    user: { group_ids: userGroups },
    requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam],
  });

  if (!hasAccessToWidgets) {
    // translation and program team get the areas and the access overview, no statistics
    return [
      { widgetSlug: 'admin-areas', width: 'full' },
      { widgetSlug: 'access-overview', width: 'full' },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layout: WidgetInstance<any>[] = [{ widgetSlug: 'emergency-alerts', width: 'small' }];

  if (environmentVariables.FEATURE_ENABLE_PRESENCE_TRACKING) {
    layout.push({ widgetSlug: 'presence-count', width: 'small' });
  }

  layout.push(
    { widgetSlug: 'user-count', width: 'small' },
    { widgetSlug: 'email-stats', width: 'small' },
    { widgetSlug: 'admin-areas', width: 'full' },
    { widgetSlug: 'access-overview', width: 'full' },
  );

  return layout;
};
