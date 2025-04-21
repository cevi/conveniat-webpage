import React, { Fragment } from 'react';
import { getBuildInfo } from '@/utils/get-build-info';
import { CeviSchweiz } from '@/components/svg-logos/cevi-schweiz';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import Link from 'next/link';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import { cn } from '@/utils/tailwindcss-override';
import type { StaticTranslationString } from '@/types/types';

interface Arguments {
  children: React.ReactNode;
}

const FooterMinimalMenu: React.FC = async () => {
  const payload = await getPayload({ config });
  const locale = await getLocaleFromCookies();

  const { minimalFooterMenu } = await payload.findGlobal({ slug: 'footer', locale });
  if (minimalFooterMenu === undefined || minimalFooterMenu === null) return <></>;

  if (minimalFooterMenu.length === 0) return <></>;

  return (
    <div className="mb-6 flex justify-center gap-x-4 text-xs">
      {minimalFooterMenu.map((footerMenuElement) => (
        <Fragment key={footerMenuElement.id}>
          <Link href={footerMenuElement.link ?? ''}>{footerMenuElement.label}</Link>
        </Fragment>
      ))}
    </div>
  );
};

const FooterCopyrightText: React.FC<Arguments> = ({ children }) => {
  return (
    <span className="mt-[32px] font-heading text-[12px] font-bold leading-[16px]">{children}</span>
  );
};

const footerCopyrightText: StaticTranslationString = {
  de: 'vom',
  fr: 'de',
  en: 'from',
};

export const FooterBuildInfoText: React.FC<Arguments> = ({ children }: Arguments) => {
  return <span className="text-[8px] font-light leading-[10px]">{children}</span>;
};

export const FooterCopyrightArea: React.FC = async () => {
  const year = new Date().getFullYear();
  const copyright = `© ${year} · conveniat27`;

  const build = await getBuildInfo();
  const isInAppDesign = await renderInAppDesign();
  const locale = await getLocaleFromCookies();

  return (
    <div
      className={cn(
        'flex',
        'w-full',
        'flex-col',
        'items-center',
        'justify-center',
        'bg-green-600',
        'text-green-200',
        'pb-6',
        { 'pb-16': isInAppDesign },
      )}
    >
      <FooterCopyrightText>{copyright}</FooterCopyrightText>
      <div className="mb-[16px]">
        <CeviSchweiz />
      </div>
      {
        /* The build info may not be available in (local) development mode */
        build !== undefined && (
          <div className="mb-[16px] flex flex-col text-center">
            <FooterMinimalMenu />
            {!isInAppDesign && (
              <>
                <FooterBuildInfoText>Version {build.version} </FooterBuildInfoText>
                <FooterBuildInfoText>
                  Build {build.git.hash} {footerCopyrightText[locale]} {build.timestamp}
                </FooterBuildInfoText>
              </>
            )}
          </div>
        )
      }
    </div>
  );
};
