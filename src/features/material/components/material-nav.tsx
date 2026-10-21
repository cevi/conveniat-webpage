'use client';

import { labels } from '@/features/material/components/material-labels';
import { focusRing } from '@/features/material/components/material-ui';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import { useMaterialRole } from '@/features/material/hooks/use-material-role';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';

interface Tab {
  href: string;
  label: StaticTranslationString;
}

const TEAM_TABS: Tab[] = [
  { href: '/app/material', label: labels.navOverview },
  { href: '/app/material/ausgeben', label: labels.navHandOut },
  { href: '/app/material/zurueck', label: labels.navTakeBack },
  { href: '/app/material/inventar', label: labels.navInventory },
];

const PARTICIPANT_TABS: Tab[] = [
  { href: '/app/material', label: labels.navOverview },
  { href: '/app/material/katalog', label: labels.navCatalog },
];

/**
 * The depot's screens as one segmented control at the top, never a second bar at the bottom,
 * which belongs to the app. It sticks below the app's header. The material team gets the
 * counter's four screens, which fit side by side down to 320 px; everybody else their overview
 * and the catalogue.
 */
export const MaterialNav: React.FC<{ inAppDesign: boolean }> = ({ inAppDesign }) => {
  const locale = useMaterialLocale();
  // the locale prefix and the design segment come before `/app`
  const pathname = usePathname().replace(/^.*?(?=\/app\/)/, '');
  const role = useMaterialRole();
  const tabs = role === 'team' ? TEAM_TABS : PARTICIPANT_TABS;

  return (
    <nav
      aria-label={labels.sections[locale]}
      // sticks right below whichever header the design shows; on a phone the website's round
      // logo hangs below that header, so there the tabs start under it, also while they stick.
      // The app design has no logo there.
      className={cn(
        'border-line bg-page sticky top-(--app-header-height) z-30 -mx-4 border-b px-4 pb-2',
        inAppDesign ? 'pt-3' : 'pt-8 xl:pt-2',
      )}
    >
      {role === undefined ? (
        // holds the room until the role is known, so the page does not jump
        <div className="h-11" aria-hidden />
      ) : (
        <div
          className={cn(
            'bg-quiet mx-auto grid h-11 max-w-xl rounded-xl p-[3px]',
            tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-2',
          )}
        >
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 items-center justify-center rounded-[9px] px-0.5 text-xs font-semibold tracking-tight transition-colors min-[360px]:px-1 min-[360px]:text-sm min-[360px]:tracking-normal',
                  focusRing,
                  active
                    ? 'bg-white text-green-900 shadow-xs'
                    : 'text-green-700 hover:text-green-900',
                )}
              >
                <span className="truncate">{tab.label[locale]}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};
