import { DynamicAppTitleName } from '@/components/header/dynamic-app-title-name';
import { MainMenu } from '@/components/menu/main-menu';
import { NavComponent } from '@/components/menu/nav-component';
import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import { LinkComponent } from '@/components/ui/link-component';
import { getLanguagePrefix } from '@/features/payload-cms/utils/get-language-prefix';
import type { Locale, StaticTranslationString } from '@/types/types';
import React from 'react';

export const HeaderComponent: React.FC<{
  locale: Locale;
  inAppDesign: boolean;
}> = async ({ locale, inAppDesign }) => {
  // const session = await auth();
  const languagePrefix = getLanguagePrefix(locale);

  /*const canAccessAdminDashboard = await canUserAccessAdminPanel({
    user: session?.user as HitobitoNextAuthUser,
  });*/

  const landingPageAreaLinktText: StaticTranslationString = {
    de: 'conveniat27 Startseite',
    fr: "Page d'accueil de conveniat27",
    en: 'conveniat27 landingpage',
  };

  return (
    <header className="fixed top-0 left-0 z-50 h-[60px] w-full">
      {/* TODO: fix dynamic rendering */}
      {/* <PreviewModeBanner user={session?.user} canAccessAdmin={canAccessAdminDashboard} /> */}

      <div className="mb-[32px] border-b-2 border-gray-200 bg-white">
        <div className="text-conveniat-green relative mx-auto h-[60px] w-full max-w-2xl xl:ml-4">
          <div className="flex items-center justify-between px-6">
            <LinkComponent
              href={`/${languagePrefix}`}
              aria-label={landingPageAreaLinktText[locale]}
            >
              <ConveniatLogo className="absolute top-[12px] left-[24px] z-[100]" />
            </LinkComponent>
            <span className="absolute top-[16px] left-0 flex w-full items-center justify-center font-['Montserrat'] text-[24px] leading-normal font-extrabold xl:hidden">
              <DynamicAppTitleName />
            </span>
            <NavComponent>
              <MainMenu locale={locale} inAppDesign={inAppDesign} />
            </NavComponent>
          </div>
        </div>
      </div>
    </header>
  );
};
