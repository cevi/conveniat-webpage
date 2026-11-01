'use client';

import { labels } from '@/features/material/components/material-labels';
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
 * The depot's screens as a row of tabs at the top, the active one underlined in brand green,
 * never a second bar at the bottom, which belongs to the app. It sticks below the app's header.
 * The material team gets the counter's four screens, which fit side by side down to 320 px;
 * everybody else their overview and the catalogue.
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
        'border-line sticky top-(--app-header-height) z-30 -mx-4 border-b bg-white px-4',
        inAppDesign ? 'pt-1' : 'pt-8 xl:pt-2',
      )}
    >
      {role === undefined ? (
        // holds the room until the role is known, so the page does not jump
        <div className="-mb-px h-11" aria-hidden />
      ) : (
        <div
          className={cn('mx-auto grid max-w-xl', tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-2')}
        >
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  // the underline sits on the nav's divider line
                  'relative -mb-px flex h-11 min-w-0 items-center justify-center border-b-2 px-0.5 text-xs font-semibold tracking-tight min-[360px]:px-1 min-[360px]:text-sm min-[360px]:tracking-normal',
                  'focus-visible:focus-ring-inset',
                  active
                    ? 'border-conveniat-green text-green-900'
                    : 'border-transparent text-green-700 hover:text-green-900',
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
