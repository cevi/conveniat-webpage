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
];

export const widgetDefaultLayout = (): WidgetInstance[] => {
  /*

  // Example restriction for default widgets, make this function async and import auth if needed
  const session = await auth();
  // import { isValidNextAuthUser } from '@/utils/auth-helpers';
  const user = isValidNextAuthUser(session?.user) ? session.user : undefined;

  if (user?.group_ids.includes(541)) {
    return [{ widgetSlug: 'emergency-alerts', width: 'small' }];
  }

  */
  return [
    { widgetSlug: 'emergency-alerts', width: 'small' },
    { widgetSlug: 'user-count', width: 'small' },
    { widgetSlug: 'collections', width: 'full' },
  ];
};
