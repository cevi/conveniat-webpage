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
    // for translation and program team -> only collections
    return [{ widgetSlug: 'collections', width: 'full' }];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layout: WidgetInstance<any>[] = [{ widgetSlug: 'emergency-alerts', width: 'small' }];

  if (environmentVariables.FEATURE_ENABLE_PRESENCE_TRACKING) {
    layout.push({ widgetSlug: 'presence-count', width: 'small' });
  }

  layout.push(
    { widgetSlug: 'user-count', width: 'small' },
    { widgetSlug: 'email-stats', width: 'small' },
    { widgetSlug: 'collections', width: 'full' },
  );

  return layout;
};
