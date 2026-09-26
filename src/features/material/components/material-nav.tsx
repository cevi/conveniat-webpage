'use client';

import { labels } from '@/features/material/components/material-labels';
import { focusRing } from '@/features/material/components/material-ui';
import { materialQueryOptions, useMaterialLocale } from '@/features/material/hooks/use-material';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';

const TABS: { href: string; label: StaticTranslationString }[] = [
  { href: '/app/material', label: labels.navOverview },
  { href: '/app/material/ausgeben', label: labels.navHandOut },
  { href: '/app/material/zurueck', label: labels.navTakeBack },
  { href: '/app/material/inventar', label: labels.navInventory },
];

/**
 * The counter's four screens as one segmented control at the top, never a second bar at the
 * bottom, which belongs to the app. It sticks below the app's 60 px header. Four fit next to each other down to 320 px, so nothing
 * scrolls sideways. Participants have one screen only and see no tabs.
 */
export const MaterialNav: React.FC = () => {
  const locale = useMaterialLocale();
  // the locale prefix and the design segment come before `/app`
  const pathname = usePathname().replace(/^.*?(?=\/app\/)/, '');
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  if (me.data?.isMaterialTeam !== true) return <></>;

  return (
    <nav
      aria-label={labels.sections[locale]}
      className="sticky top-[60px] z-30 -mx-4 border-b border-gray-200 bg-gray-50/95 px-4 py-2 backdrop-blur xl:top-16"
    >
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-1 rounded-xl bg-gray-200/70 p-1">
        {TABS.map((tab) => {
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
    </nav>
  );
};
