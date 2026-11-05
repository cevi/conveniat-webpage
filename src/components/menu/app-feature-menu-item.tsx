import { AppFeatureLink } from '@/components/menu/app-feature-link';
import type { LucideIcon } from 'lucide-react';
import type React from 'react';

/** in the menu drawer of a phone, or as a column of the menu the desktop's header opens */
export type AppFeaturesVariant = 'drawer' | 'column';

interface AppFeatureMenuItemProperties {
  href: string;
  Icon: LucideIcon;
  text: string;
  openInNewTab?: boolean;
  prefetch?: boolean;
}

const itemClassName: Record<AppFeaturesVariant, string> = {
  drawer:
    'closeNavOnClick -mx-3 flex items-center gap-2 rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-700 hover:bg-gray-50',
  // like the links of the website's columns next to it
  column:
    'hover:bg-tint text-heading flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-[16px] leading-snug font-semibold [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-green-500 group-aria-[current=page]/feature:bg-conveniat-green group-aria-[current=page]/feature:text-white group-aria-[current=page]/feature:[&_svg]:text-white',
};

/** One link of the app's features in the menu. */
export const AppFeatureMenuItem: React.FC<
  AppFeatureMenuItemProperties & { variant: AppFeaturesVariant }
> = ({ href, Icon, text, openInNewTab = false, prefetch, variant }) => {
  return (
    <AppFeatureLink
      href={href}
      openInNewTab={openInNewTab}
      {...(prefetch === undefined ? {} : { prefetch })}
    >
      <span className={itemClassName[variant]}>
        <Icon aria-hidden="true" className="size-5" />
        {text}
      </span>
    </AppFeatureLink>
  );
};
