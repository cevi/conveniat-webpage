'use client';

import { labels } from '@/features/material/components/material-labels';
import { materialQueryOptions, useMaterialLocale } from '@/features/material/hooks/use-material';
import { trpc } from '@/trpc/client';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ScanLine } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type React from 'react';

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

/**
 * The material depot's own tabs. They scroll sideways on a phone rather than wrap, so the
 * page content starts at the same height on every tab.
 */
export const MaterialNav: React.FC = () => {
  const locale = useMaterialLocale();
  // the locale prefix and the design segment come before `/app`
  const pathname = usePathname().replace(/^.*?(?=\/app\/)/, '');
  const me = trpc.material.getMe.useQuery(undefined, materialQueryOptions);
  const isMaterialTeam = me.data?.isMaterialTeam ?? false;

  return (
    <nav className="sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b border-gray-200 bg-gray-50/95 px-4 py-2 backdrop-blur">
      <div className="flex flex-1 [scrollbar-width:none] gap-1 overflow-x-auto">
        {TABS.filter((tab) => isMaterialTeam || tab.teamOnly !== true).map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap',
                active ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-600',
              )}
            >
              {tab.label[locale]}
            </Link>
          );
        })}
      </div>
      <Link
        href="/app/material/scan"
        aria-label={labels.navScan[locale]}
        className="bg-conveniat-green flex size-10 shrink-0 items-center justify-center rounded-lg text-white"
      >
        <ScanLine className="size-5" aria-hidden />
      </Link>
    </nav>
  );
};
