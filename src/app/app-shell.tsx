'use client';

import { BackgroundLogo } from '@/components/background-logo';
import { AppErrorFallback } from '@/components/error-boundary/app-error-fallback';
import { FooterClientWrapper } from '@/components/footer/footer-client-wrapper';
import { GetTheAppProvider } from '@/components/get-the-app';
import { HeaderActionsProvider } from '@/components/header/header-actions';
import { HeaderClientWrapper } from '@/components/header/header-client-wrapper';
import { HideHeaderProvider } from '@/components/header/hide-header-context';
import { PageBar, PageBarProvider } from '@/components/header/page-bar';
import { NativePushProvider } from '@/components/native-push-provider';
import { OfflineBanner } from '@/components/offline-banner';
import { useHideBackgroundLogo } from '@/components/ui/hide-background-logo-context';
import { Toaster } from '@/components/ui/toast';
import { ClientProviders } from '@/context/client-providers';
import { ForumStatusOutboxSync } from '@/features/chat/components/forum/use-forum-status-outbox';
import { OfflineQueueSync } from '@/features/chat/hooks/use-offline-queue-processor';
import { OnboardingRecheck } from '@/features/onboarding/components/onboarding-recheck';
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
          <ForumStatusOutboxSync />
          <OnboardingRecheck />
          <NativePushProvider>
            <HideHeaderProvider>
              <HeaderActionsProvider>
                <PageBarProvider>
                  <GetTheAppProvider>
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
                    anything positioned with `fixed`: side-nav has a panel, the app in top-nav its
                    rail of tabs, and the top-nav header grows on wide screens. All three include
                    --app-top-inset, the status bar and the preview banner above the header.
                    --app-tab-bar-height is the room the app's tab bar takes at the bottom, none
                    once it is the rail, and none in a browser. The wrapper itself starts
                    at --app-content-top too: the top-nav header is sized in rem, taller than 62px
                    and taller still with a larger browser font. */}
                    <div
                      className={cn(
                        'wco-content-wrapper mt-(--app-content-top) h-[calc(100dvh-var(--app-content-top))] [--app-content-left:0px] [--app-content-top:calc(62px+var(--app-top-inset))] [--app-header-height:calc(60px+var(--app-top-inset))]',
                        // a browser keeps no bar at the bottom of the app's pages, the app its tab bar
                        inAppDesign ? '[--app-tab-bar-height:5rem]' : '[--app-tab-bar-height:0px]',
                        isTopNavMode
                          ? 'xl:[--app-content-top:calc(4rem+2px+var(--app-top-inset))] xl:[--app-header-height:calc(4rem+var(--app-top-inset))]'
                          : 'xl:ml-[480px] xl:[--app-content-left:480px]',
                        isTopNavMode &&
                          inAppDesign &&
                          'xl:ml-20 xl:[--app-content-left:5rem] xl:[--app-tab-bar-height:0px]',
                      )}
                    >
                      <main className="flex min-h-full flex-col justify-between">
                        {/* below xl the website's round logo hangs out of the header, over the
                      banner's start; the app's header has none */}
                        <OfflineBanner
                          locale={locale}
                          className={cn(
                            'sticky top-(--app-header-height) z-40',
                            !inAppDesign && 'pl-28 xl:pl-5',
                          )}
                        />
                        <PageBar inAppDesign={inAppDesign} />
                        <div className="flex-1">
                          <ErrorBoundary FallbackComponent={AppErrorFallback}>
                            {children}
                          </ErrorBoundary>
                        </div>
                        {footer !== null && footer !== undefined && (
                          <FooterClientWrapper>{footer}</FooterClientWrapper>
                        )}
                      </main>
                      <Toaster locale={locale} />
                    </div>
                  </GetTheAppProvider>
                </PageBarProvider>
              </HeaderActionsProvider>
            </HideHeaderProvider>
          </NativePushProvider>
        </ClientProviders>
      </TRPCProvider>
    </PostHogProvider>
  );
};
