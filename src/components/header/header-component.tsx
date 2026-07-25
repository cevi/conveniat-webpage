import { DynamicAppTitleName } from '@/components/header/dynamic-app-title-name';
import { PreviewModeBannerServerComponent } from '@/components/header/preview-mode-banner-server';
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
import { ForceDynamicOnBuild } from '@/utils/is-pre-rendering';
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
 * Top Navigation Header Layout
 * Full-width top bar with contained logo + title and horizontal megamenu on wide screens (>= 1280px).
 */
const TopNavHeader: React.FC<{
  locale: Locale;
  processedMenu: Awaited<ReturnType<typeof processMenuTree>>;
  actionURL: string;
}> = ({ locale, processedMenu, actionURL }) => {
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
            className="group flex items-center gap-3 focus:outline-hidden"
          >
            {/* Mobile Logo */}
            <ConveniatLogo className="absolute top-[12px] left-[24px] z-[105] xl:hidden" />

            {/* Desktop Contained Logo + Brand Title */}
            <div className="hidden items-center gap-3 xl:flex">
              <ConveniatLogo className="size-10 transition-transform duration-200 group-hover:scale-105" />
              <span className="text-conveniat-green font-['Montserrat'] text-xl font-extrabold tracking-tight">
                conveniat27
              </span>
            </div>
          </LinkComponent>

          {/* Mobile Title */}
          <span className="absolute top-[16px] left-0 flex w-full items-center justify-center font-['Montserrat'] text-[24px] leading-normal font-extrabold xl:hidden">
            <DynamicAppTitleName />
          </span>

          {/* Full Width Desktop Top Navigation */}
          <div className="ml-auto flex items-center pr-4">
            <React.Suspense fallback={undefined}>
              <DesktopNav locale={locale} menuItems={processedMenu} actionURL={actionURL} />
            </React.Suspense>
          </div>

          {/* Mobile Drawer */}
          <React.Suspense fallback={<div className="h-[60px] xl:hidden" />}>
            <NavComponent showDesktopSidePanel={false}>
              <ForceDynamicOnBuild>
                <MainMenu locale={locale} inAppDesign={false} />
              </ForceDynamicOnBuild>
            </NavComponent>
          </React.Suspense>
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

            <span className="absolute top-[16px] left-0 flex w-full items-center justify-center font-['Montserrat'] text-[24px] leading-normal font-extrabold xl:hidden">
              <DynamicAppTitleName />
            </span>

            <React.Suspense fallback={<div className="h-[60px] xl:hidden" />}>
              <NavComponent showDesktopSidePanel>
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

export const HeaderComponent: React.FC<HeaderComponentProperties> = async ({
  locale,
  inAppDesign,
  navigationMode = 'side-nav',
}) => {
  const actionURL = specialPagesTable['search']?.alternatives[locale] ?? '/suche';
  const publishedMenuRaw = await getMainMenuFromPayloadCached(locale, false);
  const publishedMenu = Array.isArray(publishedMenuRaw) ? publishedMenuRaw : [];
  const processedMenu = await processMenuTree(publishedMenu, locale, false);

  if (navigationMode === 'top-nav') {
    return <TopNavHeader locale={locale} processedMenu={processedMenu} actionURL={actionURL} />;
  }

  return <SideNavHeader locale={locale} inAppDesign={inAppDesign} />;
};
