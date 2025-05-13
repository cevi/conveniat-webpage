import { PreviewModeBanner } from '@/components/header/preview-mode-banner';
import { NavComponent } from '@/components/menu/nav-component';
import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import { canUserAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import type { Config } from '@/features/payload-cms/payload-types';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth-helpers';
import Link from 'next/link';
import React from 'react';

export const HeaderComponent: React.FC<{
  locale: Config['locale'];
}> = async ({ locale }) => {
  const session = await auth();

  const canAccessAdminDashboard = await canUserAccessAdminPanel({
    user: session?.user as HitobitoNextAuthUser,
  });

  const landingPageAreaLinktText: StaticTranslationString = {
    de: 'conveniat27 Startseite',
    fr: "Page d'accueil de conveniat27",
    en: 'conveniat27 landingpage',
  };

  return (
    <header className="fixed left-0 top-0 z-50 h-[60px] w-full">
      <PreviewModeBanner user={session?.user} canAccessAdmin={canAccessAdminDashboard} />

      <div className="mb-[32px] border-b-2 border-gray-200 bg-white">
        <div className="relative mx-auto h-[60px] w-full max-w-2xl text-conveniat-green">
          <div className="flex items-center justify-between px-6">
            <Link href="/" aria-label={landingPageAreaLinktText[locale]}>
              <ConveniatLogo className="absolute left-[24px] top-[12px] z-[100]" />
            </Link>
            <span className="absolute left-0 top-[16px] hidden w-full items-center justify-center font-['Montserrat'] text-[24px] font-extrabold leading-normal opacity-0 sm:flex sm:opacity-100">
              conveniat27
            </span>
            <span className="absolute left-0 top-[16px] flex w-full items-center justify-center font-['Montserrat'] text-[24px] font-extrabold leading-normal sm:hidden">
              conveniat27
            </span>
            <NavComponent />
          </div>
        </div>
      </div>
    </header>
  );
};
