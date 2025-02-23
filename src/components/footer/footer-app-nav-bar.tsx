'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Map as MapIcon, MessageCircle, Newspaper, Siren } from 'lucide-react';
import { cn } from '@/utils/tailwindcss-override';
import { usePathname } from 'next/navigation';

const navItems = [
  { icon: MessageCircle, label: 'Chats', href: '/app/chat' },
  { icon: Siren, label: 'Notfall', href: '/app/emergency', color: 'red' },
  { icon: Newspaper, label: 'Webseite', href: '/' },
  { icon: MapIcon, label: 'Lagerplatz', href: '/app/map' },
  { icon: Calendar, label: 'Programm', href: '/app/program' },
];

export const FooterAppNavBar: React.FC = () => {
  const pathname = usePathname();

  const longestMatch = navItems.reduce((accumulator, item) => {
    if (pathname.startsWith(item.href) && item.href.length > accumulator.length) {
      return item.href;
    }
    return accumulator;
  }, '');

  return (
    <>
      <div className="fixed bottom-0 flex h-20 w-full border-t-2 border-gray-200 bg-[#f8fafc]">
        <nav className="flex w-full items-center justify-around px-4">
          {navItems.map((item) => {
            const isActive = longestMatch === item.href;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn('flex flex-col items-center justify-center space-y-1', {
                  'text-blue-600': isActive,
                })}
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
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};
