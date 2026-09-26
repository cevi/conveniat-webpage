'use client';

import { labels } from '@/features/material/components/material-labels';
import { focusRing } from '@/features/material/components/material-ui';
import { materialQueryOptions, useMaterialLocale } from '@/features/material/hooks/use-material';
import { useActiveInView, useScrollOverflow } from '@/features/material/hooks/use-scroll-overflow';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronLeft, ChevronRight, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';
import { useRef } from 'react';

interface Tab {
  href: string;
  label: StaticTranslationString;
  teamOnly?: boolean;
}

const TABS: Tab[] = [
  { href: '/app/material', label: labels.navOverview },
  { href: '/app/material/catalog', label: labels.navMaterial },
  { href: '/app/material/loans', label: labels.navLoans },
  { href: '/app/material/reservations', label: labels.navReservations },
  { href: '/app/material/returns', label: labels.navReturns },
  { href: '/app/material/departments', label: labels.navDepartments },
  { href: '/app/material/people', label: labels.navPeople, teamOnly: true },
  { href: '/app/material/team', label: labels.navTeam, teamOnly: true },
];

const SCAN_HREF = '/app/material/scan';

/** How far one arrow press moves the strip: most of it, keeping one tab for orientation. */
const scrollStep = (element: HTMLElement): number => Math.max(element.clientWidth * 0.75, 120);

/**
 * The material depot's own tabs. Every section stays one tap away: the strip scrolls sideways
 * rather than wrap or hide tabs in a menu, fades at an edge that hides more, and keeps the
 * active tab in view. On a phone the scanner moves from the strip to a round button in thumb
 * reach, above the app's bottom bar.
 */
export const MaterialNav: React.FC = () => {
  const locale = useMaterialLocale();
  // the locale prefix and the design segment come before `/app`
  const pathname = usePathname().replace(/^.*?(?=\/app\/)/, '');
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const isMaterialTeam = me.data?.isMaterialTeam ?? false;
  const tabs = TABS.filter((tab) => isMaterialTeam || tab.teamOnly !== true);

  const strip = useRef<HTMLDivElement>(null);
  const { canScrollBack, canScrollForward } = useScrollOverflow(strip, String(tabs.length));
  useActiveInView(strip, `${pathname}-${tabs.length}`);

  const scrollBy = (direction: 1 | -1): void => {
    const element = strip.current;
    if (element) element.scrollBy({ left: direction * scrollStep(element), behavior: 'smooth' });
  };

  const arrowClass = cn(
    'absolute top-1/2 z-[2] hidden size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 pointer-fine:flex',
    focusRing,
  );

  return (
    <>
      <nav
        aria-label={labels.sections[locale]}
        className="sticky top-0 z-10 -mx-4 flex h-15 items-center gap-2 border-b border-gray-200 bg-gray-50/95 px-2 backdrop-blur sm:px-4"
      >
        <div className="relative min-w-0 flex-1">
          <div
            ref={strip}
            className="relative flex [scrollbar-width:none] gap-1 overflow-x-auto scroll-smooth px-1 py-1 [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap',
                    focusRing,
                    active
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                      : 'text-gray-600 hover:bg-white/70 hover:text-gray-900',
                  )}
                >
                  {tab.label[locale]}
                </Link>
              );
            })}
          </div>
          {/* the fades say "there is more this way" on every device; arrows only with a mouse */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-gray-50 to-transparent transition-opacity',
              canScrollBack ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-gray-50 to-transparent transition-opacity',
              canScrollForward ? 'opacity-100' : 'opacity-0',
            )}
          />
          {canScrollBack && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={labels.scrollTabsBack[locale]}
              className={cn(arrowClass, 'left-0')}
              onClick={() => scrollBy(-1)}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          )}
          {canScrollForward && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={labels.scrollTabsForward[locale]}
              className={cn(arrowClass, 'right-0')}
              onClick={() => scrollBy(1)}
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <Link
          href={SCAN_HREF}
          aria-label={labels.navScan[locale]}
          aria-current={pathname === SCAN_HREF ? 'page' : undefined}
          className={cn(
            'bg-conveniat-green hidden size-11 shrink-0 items-center justify-center rounded-lg text-white sm:flex',
            focusRing,
          )}
        >
          <ScanLine className="size-5" aria-hidden />
        </Link>
      </nav>
      {pathname !== SCAN_HREF && (
        <Link
          href={SCAN_HREF}
          aria-label={labels.navScan[locale]}
          className={cn(
            // above the app's 5rem bottom bar; out of the way of a page's own bottom action
            'bg-conveniat-green fixed right-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full text-white shadow-lg sm:hidden [body:has([data-material-thumb-action])_&]:hidden',
            focusRing,
          )}
        >
          <ScanLine className="size-6" aria-hidden />
        </Link>
      )}
    </>
  );
};
