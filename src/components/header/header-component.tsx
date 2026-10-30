import { DynamicAppTitleName } from '@/components/header/dynamic-app-title-name';
import { AppHeaderTitle } from '@/components/header/header-actions';
import { PreviewModeBannerServerComponent } from '@/components/header/preview-mode-banner-server';
import { AppFeatures } from '@/components/menu/app-features';
import { DesktopNav } from '@/components/menu/desktop-nav';
import {
  getMainMenuFromPayloadCached,
  MainMenu,
  processMenuTree,
} from '@/components/menu/main-menu';
import { NavComponent } from '@/components/menu/nav-component';
import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import { LinkComponent } from '@/components/ui/link-component';
import { specialPagesTable } from '@/features/payload-cms/special-pages-table';
import { getLanguagePrefix } from '@/features/payload-cms/utils/get-language-prefix';
import type { Locale, NavigationMode, StaticTranslationString } from '@/types/types';
import { isAdminSession } from '@/utils/is-admin-session';
import { ForceDynamicOnBuild } from '@/utils/is-pre-rendering';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

interface HeaderComponentProperties {
  locale: Locale;
  inAppDesign: boolean;
  navigationMode?: NavigationMode;
}

const landingPageAreaLinktText: StaticTranslationString = {
  de: 'conveniat27 Startseite',
  fr: "Page d'accueil de conveniat27",
  en: 'conveniat27 landingpage',
};

/**
 * The desktop header bar with the published menu, and for an editor the draft menu as well, which
 * it shows in preview mode (`?preview=true`), so the live preview of the header global and page
 * previews show the menu being edited.
 */
const TopNavContent: React.FC<{
  locale: Locale;
  inAppDesign: boolean;
  withDraftForEditors?: boolean;
}> = async ({ locale, inAppDesign, withDraftForEditors = false }) => {
  const actionURL = specialPagesTable['search']?.alternatives[locale] ?? '/suche';
  // the published read starts before the session read, for the reason given in `MainMenu`
  const publishedMenu = await getMainMenuFromPayloadCached(locale, false);
  const menuItems = await processMenuTree(publishedMenu, locale, false);

  const draftMenuItems =
    withDraftForEditors && (await isAdminSession())
      ? await processMenuTree(await getMainMenuFromPayloadCached(locale, true), locale, true)
      : undefined;

  return (
    <DesktopNav
      locale={locale}
      menuItems={menuItems}
      draftMenuItems={draftMenuItems}
      actionURL={actionURL}
      appFeatures={
        inAppDesign ? (
          <ForceDynamicOnBuild>
            <AppFeatures locale={locale} variant="column" />
          </ForceDynamicOnBuild>
        ) : undefined
      }
    />
  );
};

/**
 * Top Navigation Header Layout
 * Full-width top bar with contained logo + title and horizontal megamenu on wide screens (>= 1280px).
 * Below that, the app keeps its own header: the menu on the left, the page's title next to it.
 */
const TopNavHeader: React.FC<{
  locale: Locale;
  inAppDesign: boolean;
}> = ({ locale, inAppDesign }) => {
  const languagePrefix = getLanguagePrefix(locale);

  return (
    <header className="fixed top-0 left-0 z-[100] h-[60px] w-full xl:h-16">
      <React.Suspense fallback={<div className="bg-gray-900" />}>
        <PreviewModeBannerServerComponent />
      </React.Suspense>

      <div className="mb-[32px] border-b-2 border-gray-200 bg-white/95 backdrop-blur-md">
        {/* Full-width container spanning full screen width */}
        <div className="text-conveniat-green relative flex h-[60px] w-full items-center justify-between px-6 xl:h-16 xl:px-12">
          {/* Logo & Brand Title */}
          <LinkComponent
            href={`/${languagePrefix}`}
            aria-label={landingPageAreaLinktText[locale]}
            prefetch
            className="group flex shrink-0 items-center gap-3 focus:outline-hidden"
          >
            {/* Mobile Logo */}
            {!inAppDesign && (
              <ConveniatLogo className="absolute top-[12px] left-[24px] z-[105] xl:hidden" />
            )}

            {/* Desktop Contained Logo + Brand Title */}
            <div className="hidden items-center gap-3 xl:flex">
              <ConveniatLogo className="size-10 transition-transform duration-200 group-hover:scale-105" />
              <span className="text-conveniat-green font-['Montserrat'] text-xl font-extrabold tracking-tight">
                conveniat27
              </span>
            </div>
          </LinkComponent>

          {/* Mobile Title; in the app also the page's title and buttons on a desktop */}
          {inAppDesign ? (
            <AppHeaderTitle inAppDesign inlineOnDesktop />
          ) : (
            <span className="absolute top-[16px] left-0 flex w-full items-center justify-center font-['Montserrat'] text-[24px] leading-normal font-extrabold xl:hidden">
              <DynamicAppTitleName />
            </span>
          )}

          {/* Full Width Desktop Top Navigation, taking whatever width the logo leaves */}
          <div className="flex min-w-0 flex-1 items-center justify-end pr-4">
            {/* The published bar is part of the prerendered shell and stays there when the
                session read below cannot run, offline for one. */}
            <React.Suspense fallback={<TopNavContent locale={locale} inAppDesign={inAppDesign} />}>
              <TopNavContent locale={locale} inAppDesign={inAppDesign} withDraftForEditors />
            </React.Suspense>
          </div>

          {/* Mobile Drawer, opened from the left in the app */}
          <div className={cn(inAppDesign && 'order-first')}>
            <React.Suspense fallback={<div className="h-[60px] xl:hidden" />}>
              <NavComponent showDesktopSidePanel={false} locale={locale}>
                <ForceDynamicOnBuild>
                  <MainMenu locale={locale} inAppDesign={inAppDesign} />
                </ForceDynamicOnBuild>
              </NavComponent>
            </React.Suspense>
          </div>
        </div>
      </div>
    </header>
  );
};

/**
 * Classic Side Navigation Header Layout
 * Matches origin/dev header layout with left offset for fixed side panel.
 */
const SideNavHeader: React.FC<{
  locale: Locale;
  inAppDesign: boolean;
}> = ({ locale, inAppDesign }) => {
  const languagePrefix = getLanguagePrefix(locale);

  return (
    <header className="fixed top-0 left-0 z-[100] h-[60px] w-full">
      <React.Suspense fallback={<div className="bg-gray-900" />}>
        <PreviewModeBannerServerComponent />
      </React.Suspense>

      <div className="mb-[32px] border-b-2 border-gray-200 bg-white">
        <div className="text-conveniat-green relative mx-auto h-[60px] w-full max-w-2xl xl:ml-4">
          <div className="flex h-full items-center justify-between px-6">
            {!inAppDesign && (
              <LinkComponent
                href={`/${languagePrefix}`}
                aria-label={landingPageAreaLinktText[locale]}
                prefetch
              >
                <ConveniatLogo className="absolute top-[12px] left-[24px] z-[105]" />
              </LinkComponent>
            )}

            <AppHeaderTitle inAppDesign={inAppDesign} />

            <React.Suspense fallback={<div className="h-[60px] xl:hidden" />}>
              <NavComponent showDesktopSidePanel locale={locale}>
                <ForceDynamicOnBuild>
                  <MainMenu locale={locale} inAppDesign={inAppDesign} />
                </ForceDynamicOnBuild>
              </NavComponent>
            </React.Suspense>
          </div>
        </div>
      </div>
    </header>
  );
};

export const HeaderComponent: React.FC<HeaderComponentProperties> = ({
  locale,
  inAppDesign,
  navigationMode = 'side-nav',
}) => {
  if (navigationMode === 'top-nav') {
    return <TopNavHeader locale={locale} inAppDesign={inAppDesign} />;
  }

  return <SideNavHeader locale={locale} inAppDesign={inAppDesign} />;
};
