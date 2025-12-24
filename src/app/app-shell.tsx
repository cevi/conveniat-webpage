'use client';

import { DynamicAppTitleProvider } from '@/components/header/dynamic-app-title-name';
import { HeaderClientWrapper } from '@/components/header/header-client-wrapper';
import { HideHeaderProvider } from '@/components/header/hide-header-context';
import { PrefetchOfflinePages } from '@/components/service-worker/prefetch-offline-pages';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { PostHogProvider } from '@/providers/post-hog-provider';
import { TRPCProvider } from '@/trpc/client';
import { cn } from '@/utils/tailwindcss-override';
import type { ReactNode } from 'react';
import React from 'react';

interface AppShellProperties {
  children: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
  inAppDesign: boolean;
  swUrl?: string;
}

/**
 * Unified App Shell component that provides all necessary providers
 * and layout structure for both online and offline versions.
 */
export const AppShell: React.FC<AppShellProperties> = ({
  children,
  header,
  footer,
  inAppDesign,
}) => {
  return (
    <PostHogProvider>
      <TRPCProvider>
        <HideHeaderProvider>
          <DynamicAppTitleProvider>
            <HeaderClientWrapper>{header}</HeaderClientWrapper>

            <PrefetchOfflinePages />

            {/* Background Logo */}
            <div
              className={cn('absolute top-0 z-[-999] h-screen w-full p-[56px] xl:pl-[480px]', {
                'xl:pl-0': !inAppDesign,
              })}
            >
              <CeviLogo className="mx-auto h-full max-h-[60vh] w-full max-w-[384px] opacity-10 blur-md" />
            </div>

            {/* Main Content Area */}
            <div
              className={cn('wco-content-wrapper mt-[62px] h-[calc(100dvh-62px)]', {
                'xl:ml-[480px]': inAppDesign,
              })}
            >
              <main className="flex min-h-full flex-col justify-between">
                <div className="flex-1">{children}</div>
                {footer}
              </main>
            </div>
          </DynamicAppTitleProvider>
        </HideHeaderProvider>
      </TRPCProvider>
    </PostHogProvider>
  );
};
