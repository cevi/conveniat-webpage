import { FooterGraphic } from '@/components/footer/footer-graphics';
import { SocialMediaLinks } from '@/components/footer/social-media-links';
import { CeviSchweiz } from '@/components/svg-logos/cevi-schweiz';
import { LinkComponent } from '@/components/ui/link-component';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getBuildInfo } from '@/utils/get-build-info';
import { NoBuildTimePreRendering } from '@/utils/is-pre-rendering';
import { cn } from '@/utils/tailwindcss-override';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload } from 'payload';
import type React from 'react';
import { Fragment } from 'react';

interface Arguments {
  children: React.ReactNode;
}

const FooterMinimalMenu: React.FC<{ locale: Locale }> = async ({ locale }) => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'footer');

  const payload = await getPayload({ config });

  const { minimalFooterMenu } = await payload.findGlobal({ slug: 'footer', locale });
  if (minimalFooterMenu === undefined || minimalFooterMenu === null) return <></>;

  if (minimalFooterMenu.length === 0) return <></>;

  return (
    <div className="mb-2 flex justify-center gap-x-4 text-xs">
      {minimalFooterMenu.map((footerMenuElement) => (
        <Fragment key={footerMenuElement.id}>
          <LinkComponent
            href={getURLForLinkField(footerMenuElement.linkField, locale) ?? ''}
            openInNewTab={openURLInNewTab(footerMenuElement.linkField)}
          >
            {footerMenuElement.label}
          </LinkComponent>
        </Fragment>
      ))}
    </div>
  );
};

const FooterCopyrightText: React.FC = async () => {
  'use cache';
  const year = new Date().getFullYear();
  const copyright = `© ${year} · conveniat27`;

  return (
    <span className="font-heading mt-[32px] text-[22px] leading-[24x] font-bold">{copyright}</span>
  );
};

const footerCopyrightText: StaticTranslationString = {
  de: 'vom',
  fr: 'de',
  en: 'from',
};

export const FooterBuildInfoText: React.FC<Arguments> = ({ children }: Arguments) => {
  return <span className="text-[12px] leading-[16px] font-light">{children}</span>;
};

export const FooterCopyrightArea: React.FC<{
  locale: Locale;
  inAppDesign: boolean;
}> = async ({ locale, inAppDesign }) => {
  const build = await getBuildInfo(locale);

  return (
    <>
      <div className="mb-[-8px] w-full">
        <FooterGraphic />
      </div>
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
          { 'pb-16': inAppDesign },
        )}
      >
        <FooterCopyrightText />
        <div className="mb-[20px]">
          <CeviSchweiz className="h-12 w-56" />
        </div>
        {
          /* The build info may not be available in (local) development mode */
          build !== undefined && (
            <div className="mb-[16px] flex flex-col text-center">
              <NoBuildTimePreRendering>
                <FooterMinimalMenu locale={locale} />
                <SocialMediaLinks locale={locale} />
              </NoBuildTimePreRendering>

              {!inAppDesign && (
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
    </>
  );
};
