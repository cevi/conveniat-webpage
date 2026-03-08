import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import type { Widget, WidgetInstance } from 'payload';

export const enabledWidgets: Widget[] = [
  {
    slug: 'emergency-alerts',
    ComponentPath: '@/features/payload-cms/payload-cms/widgets/emergency-widget#default',
  },
  {
    slug: 'user-count',
    ComponentPath: '@/features/payload-cms/payload-cms/widgets/user-count-widget#default',
  },
  {
    slug: 'email-stats',
    ComponentPath: '@/features/payload-cms/payload-cms/widgets/email-stats-widget#default',
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

  return [
    { widgetSlug: 'emergency-alerts', width: 'small' },
    { widgetSlug: 'user-count', width: 'small' },
    { widgetSlug: 'email-stats', width: 'small' },
    { widgetSlug: 'collections', width: 'full' },
  ];
};
