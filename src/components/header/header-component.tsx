import { StreamedPart } from '@/components/error-boundary/streamed-part';
import { GetTheAppButton } from '@/components/get-the-app';
import { AppHeaderTitle } from '@/components/header/header-actions';
import { PageTitle } from '@/components/header/page-title';
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
import { getAppLandingPageCached } from '@/features/payload-cms/api/cached-globals';
import { specialPagesTable } from '@/features/payload-cms/special-pages-table';
import { getLanguagePrefix } from '@/features/payload-cms/utils/get-language-prefix';
import type { Locale, NavigationMode, StaticTranslationString } from '@/types/types';
import { isAdminSession } from '@/utils/is-admin-session';
import { ForceDynamicOnBuild } from '@/utils/is-pre-rendering';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

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

/** Home's title as an editor's draft has it, for the live preview of the App Landing Page. */
const PageTitleForEditors: React.FC<{ locale: Locale; dashboardTitle: string }> = async ({
  locale,
  dashboardTitle,
}) => {
  const draft = (await isAdminSession()) ? await getAppLandingPageCached(locale, true) : undefined;
  return (
    <PageTitle locale={locale} dashboardTitle={dashboardTitle} dashboardDraftTitle={draft?.title} />
  );
};

/**
 * The page's title, part of the prerendered shell with Home's published title. The session read
 * for an editor's draft streams in behind it, the way the desktop menu does it.
 */
const HeaderPageTitle: React.FC<{ locale: Locale }> = async ({ locale }) => {
  const { title } = await getAppLandingPageCached(locale);
  return (
    <StreamedPart fallback={<PageTitle locale={locale} dashboardTitle={title} />}>
      <PageTitleForEditors locale={locale} dashboardTitle={title} />
    </StreamedPart>
  );
};

/**
 * The title for `AppHeaderTitle`. Its own boundary because the route's segments are unknown
 * while prerendering a route with a param, a block of the programme or a chat: the title then
 * streams in, and the rest of the header stays in the shell.
 */
const pageTitle = (locale: Locale): React.ReactNode => (
  <StreamedPart fallback={<></>}>
    <HeaderPageTitle locale={locale} />
  </StreamedPart>
);

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
      {/* room for the status bar, see --app-top-inset */}
      <div aria-hidden="true" className="h-(--status-bar-height) bg-white/95 backdrop-blur-md" />
      <StreamedPart fallback={<div className="bg-gray-900" />}>
        <PreviewModeBannerServerComponent />
      </StreamedPart>

      {/* No backdrop filter here: it would make this bar the containing block of the fixed menu
          below it, which then sits the preview banner's height too low. */}
      <div className="mb-[32px] border-b-2 border-gray-200 bg-white">
        {/* Full-width container spanning full screen width */}
        <div className="text-conveniat-green relative flex h-[60px] w-full items-center justify-between px-6 xl:h-16 xl:px-12">
          {/* Logo & Brand Title */}
          <LinkComponent
            href={`/${languagePrefix}`}
            aria-label={landingPageAreaLinktText[locale]}
            prefetch
            className={cn(
              'group flex shrink-0 items-center gap-3 focus:outline-hidden',
              // in the app the logo shows on a desktop only; on a phone the link would be an
              // empty stop for the keyboard
              inAppDesign &&
                'focus-visible:focus-surface -m-1.5 hidden rounded-[14px] p-1.5 pr-3.5 xl:-mr-3.5 xl:flex',
            )}
          >
            {/* Mobile Logo */}
            {!inAppDesign && (
              <ConveniatLogo className="absolute top-[12px] left-[24px] z-[105] xl:hidden" />
            )}

            {/* Desktop Contained Logo + Brand Title; the app names the page there instead, as
                its users know which app they are in */}
            <div className="hidden items-center gap-3 xl:flex">
              <ConveniatLogo className="size-10 transition-transform duration-200 group-hover:scale-105" />
              {!inAppDesign && (
                <span className="text-conveniat-green font-['Montserrat'] text-xl font-extrabold tracking-tight">
                  conveniat27
                </span>
              )}
            </div>
          </LinkComponent>

          {/* Mobile Title; in the app also the page's title and buttons on a desktop */}
          {inAppDesign ? (
            <AppHeaderTitle title={pageTitle(locale)} inAppDesign inlineOnDesktop />
          ) : (
            <AppHeaderTitle title={pageTitle(locale)} inAppDesign={false} hiddenOnDesktop />
          )}

          {/* Full Width Desktop Top Navigation, taking whatever width the logo leaves */}
          <div className="flex min-w-0 flex-1 items-center justify-end pr-4">
            {/* The published bar is part of the prerendered shell and stays there when the
                session read below cannot run, offline for one. */}
            <StreamedPart fallback={<TopNavContent locale={locale} inAppDesign={inAppDesign} />}>
              <TopNavContent locale={locale} inAppDesign={inAppDesign} withDraftForEditors />
            </StreamedPart>
            {/* on the app's pages in a browser; below xl it sits with the page's buttons */}
            <GetTheAppButton className="ml-2 hidden xl:flex" />
          </div>

          {/* Mobile Drawer, opened from the left in the app */}
          <div className={cn(inAppDesign && 'order-first')}>
            <StreamedPart fallback={<div className="h-[60px] xl:hidden" />}>
              <NavComponent showDesktopSidePanel={false} locale={locale}>
                <ForceDynamicOnBuild>
                  <MainMenu locale={locale} inAppDesign={inAppDesign} />
                </ForceDynamicOnBuild>
              </NavComponent>
            </StreamedPart>
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
      {/* room for the status bar, see --app-top-inset */}
      <div aria-hidden="true" className="h-(--status-bar-height) bg-white" />
      <StreamedPart fallback={<div className="bg-gray-900" />}>
        <PreviewModeBannerServerComponent />
      </StreamedPart>

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

            <AppHeaderTitle title={pageTitle(locale)} inAppDesign={inAppDesign} />

            <StreamedPart fallback={<div className="h-[60px] xl:hidden" />}>
              <NavComponent showDesktopSidePanel locale={locale}>
                <ForceDynamicOnBuild>
                  <MainMenu locale={locale} inAppDesign={inAppDesign} />
                </ForceDynamicOnBuild>
              </NavComponent>
            </StreamedPart>
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
