'use client';

import { AppErrorFallback } from '@/components/error-boundary/app-error-fallback';
import { FooterClientWrapper } from '@/components/footer/footer-client-wrapper';
import { DynamicAppTitleProvider } from '@/components/header/dynamic-app-title-name';
import { HeaderClientWrapper } from '@/components/header/header-client-wrapper';
import { HideHeaderProvider } from '@/components/header/hide-header-context';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import { PostHogProvider } from '@/providers/post-hog-provider';
import { TRPCProvider } from '@/trpc/client';
import type { ReactNode } from 'react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

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
export const AppShell: React.FC<AppShellProperties> = ({ children, header, footer }) => {
  return (
    <PostHogProvider>
      <TRPCProvider>
        <HideHeaderProvider>
          <DynamicAppTitleProvider>
            <HeaderClientWrapper>{header}</HeaderClientWrapper>

            {/* Background Logo */}
            <div className="absolute top-0 z-[-999] h-screen w-full p-[56px] xl:pl-[480px]">
              <CeviLogo className="mx-auto h-full max-h-[60vh] w-full max-w-[384px] opacity-10 blur-md" />
            </div>

            {/* Main Content Area */}
            <div className="wco-content-wrapper mt-[62px] h-[calc(100dvh-62px)] xl:ml-[480px]">
              <main className="flex min-h-full flex-col justify-between">
                <div className="flex-1">
                  <ErrorBoundary FallbackComponent={AppErrorFallback}>{children}</ErrorBoundary>
                </div>
                {footer && <FooterClientWrapper>{footer}</FooterClientWrapper>}
              </main>
            </div>
          </DynamicAppTitleProvider>
        </HideHeaderProvider>
      </TRPCProvider>
    </PostHogProvider>
  );
};
