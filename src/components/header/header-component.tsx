import { ClientOnly } from '@/components/client-only';
import { PreviewModeBanner } from '@/components/header/preview-mode-banner';
import { MainMenu } from '@/components/menu/main-menu';
import { NavComponent } from '@/components/menu/nav-component';
import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import { canUserAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import type { Config } from '@/features/payload-cms/payload-types';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { StaticTranslationString } from '@/types/types';
import { auth } from '@/utils/auth-helpers';
import { Menu as MenuIcon } from 'lucide-react';
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
    <header className="fixed top-0 left-0 z-50 h-[60px] w-full">
      <PreviewModeBanner user={session?.user} canAccessAdmin={canAccessAdminDashboard} />

      <div className="mb-[32px] border-b-2 border-gray-200 bg-white">
        <div className="text-conveniat-green relative mx-auto h-[60px] w-full max-w-2xl xl:ml-4">
          <div className="flex items-center justify-between px-6">
            <Link href="/" aria-label={landingPageAreaLinktText[locale]}>
              <ConveniatLogo className="absolute top-[12px] left-[24px] z-[100]" />
            </Link>
            <span className="absolute top-[16px] left-0 hidden w-full items-center justify-center font-['Montserrat'] text-[24px] leading-normal font-extrabold opacity-0 sm:flex sm:opacity-100 xl:ml-[560px] xl:w-auto">
              conveniat27
            </span>
            <span className="absolute top-[16px] left-0 flex w-full items-center justify-center font-['Montserrat'] text-[24px] leading-normal font-extrabold sm:hidden">
              conveniat27
            </span>
            <ClientOnly
              fallback={<MenuIcon aria-hidden="true" className="relative top-[18px] size-6" />}
            >
              <NavComponent>
                <MainMenu />
              </NavComponent>
            </ClientOnly>
          </div>
        </div>
      </div>
    </header>
  );
};
