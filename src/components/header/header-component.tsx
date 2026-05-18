import { DynamicAppTitleName } from '@/components/header/dynamic-app-title-name';
import { PreviewModeBannerServerComponent } from '@/components/header/preview-mode-banner-server';
import { MainMenu } from '@/components/menu/main-menu';
import { NavComponent } from '@/components/menu/nav-component';
import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import { LinkComponent } from '@/components/ui/link-component';
import { getLanguagePrefix } from '@/features/payload-cms/utils/get-language-prefix';
import type { Locale, StaticTranslationString } from '@/types/types';
import { ForceDynamicOnBuild } from '@/utils/is-pre-rendering';
import React from 'react';

export const HeaderComponent: React.FC<{
  locale: Locale;
  inAppDesign: boolean;
}> = ({ locale, inAppDesign }) => {
  const languagePrefix = getLanguagePrefix(locale);

  const landingPageAreaLinktText: StaticTranslationString = {
    de: 'conveniat27 Startseite',
    fr: "Page d'accueil de conveniat27",
    en: 'conveniat27 landingpage',
  };

  return (
    <header className="fixed left-0 top-0 z-50 h-[60px] w-full">
      <React.Suspense fallback={<div className="bg-gray-900" />}>
        <PreviewModeBannerServerComponent />
      </React.Suspense>

      <div className="mb-[32px] border-b-2 border-gray-200 bg-white">
        <div className="text-conveniat-green relative mx-auto h-[60px] w-full max-w-2xl xl:ml-4">
          <div className="flex items-center justify-between px-6">
            {!inAppDesign && (
              <LinkComponent
                href={`/${languagePrefix}`}
                aria-label={landingPageAreaLinktText[locale]}
                prefetch
              >
                <ConveniatLogo className="z-100 absolute left-[24px] top-[12px]" />
              </LinkComponent>
            )}

            <span className="absolute left-0 top-[16px] flex w-full items-center justify-center font-['Montserrat'] text-[24px] font-extrabold leading-normal xl:hidden">
              <DynamicAppTitleName />
            </span>

            <React.Suspense fallback={<div className="h-[60px] xl:hidden" />}>
              <NavComponent>
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
