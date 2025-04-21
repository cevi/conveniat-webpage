import Link from 'next/link';
import React from 'react';
import { NavComponent } from '@/components/menu/nav-component';
import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import { PreviewModeBanner } from '@/components/header/preview-mode-banner';
import { canAccessAdminPanel } from '@/features/payload-cms/settings/access-rules/can-access-admin-panel';
import type { PayloadRequest } from 'payload';
import { auth } from '@/utils/auth-helpers';

export const HeaderComponent: React.FC = async () => {
  const session = await auth();

  const canAccessAdminDashboard = await canAccessAdminPanel({
    req: { user: session?.user } as unknown as PayloadRequest,
  });

  return (
    <header className="fixed left-0 top-0 z-50 h-[60px] w-full">
      <PreviewModeBanner user={session?.user} canAccessAdmin={canAccessAdminDashboard} />

      <div className="mb-[32px] border-b-2 border-gray-200 bg-white">
        <div className="relative mx-auto h-[60px] w-full max-w-2xl text-conveniat-green">
          <div className="flex items-center justify-between px-6">
            <Link href="/">
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
