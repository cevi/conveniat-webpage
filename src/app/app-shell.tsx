'use client';

import { BackgroundLogo } from '@/components/background-logo';
import { AppErrorFallback } from '@/components/error-boundary/app-error-fallback';
import { FooterClientWrapper } from '@/components/footer/footer-client-wrapper';
import { DynamicAppTitleProvider } from '@/components/header/dynamic-app-title-name';
import { HeaderActionsProvider } from '@/components/header/header-actions';
import { HeaderClientWrapper } from '@/components/header/header-client-wrapper';
import { HideHeaderProvider } from '@/components/header/hide-header-context';
import { LoginHistoryRewind } from '@/components/login-history-rewind';
import { NativePushProvider } from '@/components/native-push-provider';
import { OfflineBanner } from '@/components/offline-banner';
import { useHideBackgroundLogo } from '@/components/ui/hide-background-logo-context';
import { ClientProviders } from '@/context/client-providers';
import { OfflineQueueSync } from '@/features/chat/hooks/use-offline-queue-processor';
import { PostHogProvider } from '@/providers/post-hog-provider';
import { TRPCProvider } from '@/trpc/client';
import type { Locale, NavigationMode } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type { ReactNode } from 'react';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface AppShellProperties {
  children: ReactNode;
  header: ReactNode;
  footer?: ReactNode;
  inAppDesign: boolean;
  locale: Locale;
  swUrl?: string;
  navigationMode?: NavigationMode;
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
  locale,
  navigationMode = 'side-nav',
}) => {
  const { hideBackgroundLogo } = useHideBackgroundLogo();
  const isTopNavMode = navigationMode === 'top-nav';

  return (
    <PostHogProvider>
      <TRPCProvider>
        <ClientProviders>
          <OfflineQueueSync />
          <LoginHistoryRewind />
          <NativePushProvider>
            <HideHeaderProvider>
              <DynamicAppTitleProvider>
                <HeaderActionsProvider>
                  <HeaderClientWrapper>{header}</HeaderClientWrapper>

                  {/* Background Logo, on the website only: in the app it shows through the content */}
                  {!hideBackgroundLogo && !inAppDesign && (
                    <div
                      className={cn(
                        'absolute top-0 z-[-999] h-screen w-full p-[56px]',
                        isTopNavMode ? 'lg:hidden' : 'xl:pl-[480px]',
                      )}
                    >
                      <BackgroundLogo className="max-h-[60vh]" />
                    </div>
                  )}

                  {/* Main Content Area */}
                  {/* --app-header-height is the height of the fixed header above, for anything
                    that sticks right below it. --app-content-top and --app-content-left are the
                    corner of the free area under the header and right of the side panel, for
                    anything positioned with `fixed`: only side-nav has a panel, and the top-nav
                    header grows on wide screens. All three include the preview banner above the header. */}
                  <div
                    className={cn(
                      'wco-content-wrapper mt-[calc(62px+var(--preview-banner-height))] h-[calc(100dvh-62px-var(--preview-banner-height))] [--app-content-left:0px] [--app-content-top:calc(62px+var(--preview-banner-height))] [--app-header-height:calc(60px+var(--preview-banner-height))]',
                      isTopNavMode
                        ? 'xl:[--app-content-top:calc(4rem+2px+var(--preview-banner-height))] xl:[--app-header-height:calc(4rem+var(--preview-banner-height))]'
                        : 'xl:ml-[480px] xl:[--app-content-left:480px]',
                    )}
                  >
                    <main className="flex min-h-full flex-col justify-between">
                      {/* below xl the round logo hangs out of the header, over the banner's start */}
                      <OfflineBanner
                        locale={locale}
                        className="sticky top-(--app-header-height) z-40 pl-28 xl:pl-4"
                      />
                      <div className="flex-1">
                        <ErrorBoundary FallbackComponent={AppErrorFallback}>
                          {children}
                        </ErrorBoundary>
                      </div>
                      {footer !== null && footer !== undefined && (
                        <FooterClientWrapper>{footer}</FooterClientWrapper>
                      )}
                    </main>
                  </div>
                </HeaderActionsProvider>
              </DynamicAppTitleProvider>
            </HideHeaderProvider>
          </NativePushProvider>
        </ClientProviders>
      </TRPCProvider>
    </PostHogProvider>
  );
};
