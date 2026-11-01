import '@/app/globals.scss';
import { ServiceWorkerManager } from '@/components/service-worker/service-worker-manager';
import { sharedFontClassName } from '@/utils/fonts';
import { cn } from '@/utils/tailwindcss-override';
import type { ReactNode } from 'react';

/**
 * Root layout for the offline fallback page.
 *
 */
export default function OfflineLayout({ children }: { children: ReactNode }): React.ReactNode {
  return (
    <html className={sharedFontClassName} lang="de" suppressHydrationWarning>
      <body className={cn('bg-page flex h-dvh w-dvw flex-col overflow-x-hidden')}>
        <ServiceWorkerManager>{children}</ServiceWorkerManager>
      </body>
    </html>
  );
}
