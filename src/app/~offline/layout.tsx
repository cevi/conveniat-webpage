import { sharedFontClassName } from '@/utils/fonts';
import { cn } from '@/utils/tailwindcss-override';
import type { ReactNode } from 'react';

/**
 * Root layout for the offline fallback page.
 *
 * Since other root layouts are inside localized route groups,
 * we need a standalone root layout here to ensure the /~offline
 * route is correctly recognized and rendered by Next.js.
 */
export default function OfflineLayout({ children }: { children: ReactNode }): React.ReactNode {
  return (
    <html className={sharedFontClassName} lang="de" suppressHydrationWarning>
      <body className={cn('flex h-dvh w-dvw flex-col overflow-x-hidden bg-[#f8fafc]')}>
        {children}
      </body>
    </html>
  );
}
