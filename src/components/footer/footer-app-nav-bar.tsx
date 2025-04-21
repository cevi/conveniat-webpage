'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Map as MapIcon, MessageCircle, Newspaper, Siren } from 'lucide-react';
import { cn } from '@/utils/tailwindcss-override';
import { usePathname } from 'next/navigation';
import type { Config } from '@/features/payload-cms/payload-types';

const navItems = [
  {
    icon: MessageCircle,
    label: {
      de: 'Chats',
      en: 'Chats',
      fr: 'Chats',
    },
    href: '/app/chat',
  },
  {
    icon: Siren,
    label: {
      de: 'Notfall',
      en: 'Emergency',
      fr: 'Urgence',
    },
    href: '/app/emergency',
    color: 'red',
  },
  {
    icon: Newspaper,
    label: {
      de: 'Webseite',
      en: 'Website',
      fr: 'Site web',
    },
    href: '/',
  },
  {
    icon: MapIcon,
    label: {
      de: 'Lagerplatz',
      en: 'Campsite',
      fr: 'Carte',
    },
    href: '/app/map',
  },
  {
    icon: Calendar,
    label: {
      de: 'Programm',
      en: 'Program',
      fr: 'Programme',
    },
    href: '/app/program',
  },
];

export const FooterAppNavBar: React.FC<{
  locale: Config['locale'];
}> = ({ locale }) => {
  const pathname = usePathname();
  const [longestMatch, setLongestMatch] = React.useState<string>('');

  useEffect(() => {
    const pathnameWithoutLocale = pathname.replace(/^\/(de|en|fr)\/(.*)/, '/$2');
    const _longestMatch = navItems.reduce((accumulator, item) => {
      if (pathnameWithoutLocale.startsWith(item.href) && item.href.length > accumulator.length) {
        return item.href;
      }
      return accumulator;
    }, '');
    setLongestMatch(_longestMatch);
  }, [pathname]);

  return (
    <>
      <div className="fixed bottom-0 flex h-20 w-full border-t-2 border-gray-200 bg-[#f8fafc]">
        <nav className="flex w-full items-center justify-around px-4">
          {navItems.map((item) => {
            const isActive = longestMatch === item.href;

            return (
              <Link
                key={item.label[locale]}
                href={item.href}
                className={cn(
                  'flex h-full flex-1 flex-col items-center justify-center space-y-1 py-2',
                  {
                    'text-blue-600': isActive,
                  },
                )}
              >
                <item.icon
                  className={cn('h-9 w-12 rounded-xl px-3 py-1 text-gray-300', {
                    'bg-green-200 text-conveniat-green': isActive,
                    'text-cevi-red': item.color === 'red',
                    'bg-red-200 text-cevi-red': isActive && item.color === 'red',
                  })}
                />
                <span
                  className={cn('mt-1 text-xs font-semibold text-gray-400', {
                    'font-bold text-conveniat-green': isActive,
                    'text-cevi-red': item.color === 'red',
                  })}
                >
                  {item.label[locale]}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};
