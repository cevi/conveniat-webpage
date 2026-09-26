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
export const MaterialNav: React.FC = () => {
  const locale = useMaterialLocale();
  // the locale prefix and the design segment come before `/app`
  const pathname = usePathname().replace(/^.*?(?=\/app\/)/, '');
  const role = useMaterialRole();
  const tabs = role === 'team' ? TEAM_TABS : PARTICIPANT_TABS;

  return (
    <nav
      aria-label={labels.sections[locale]}
      // on a phone the app's round logo hangs below its 60 px header; the tabs start under it,
      // also while they stick
      className="sticky top-[60px] z-30 -mx-4 border-b border-gray-200 bg-gray-50/95 px-4 pt-8 pb-2 backdrop-blur xl:top-16 xl:pt-2"
    >
      {role === undefined ? (
        // holds the room until the role is known, so the page does not jump
        <div className="h-[52px]" aria-hidden />
      ) : (
        <div
          className={cn(
            'mx-auto grid max-w-xl gap-1 rounded-xl bg-gray-200/70 p-1',
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
                  'flex min-h-11 min-w-0 items-center justify-center rounded-lg px-0.5 text-xs font-semibold tracking-tight min-[360px]:px-1 min-[360px]:text-sm min-[360px]:tracking-normal',
                  focusRing,
                  active
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900',
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
