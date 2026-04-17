import { FooterGraphic } from '@/components/footer/footer-graphics';
import { CeviSchweiz } from '@/components/svg-logos/cevi-schweiz';
import { LinkComponent } from '@/components/ui/link-component';
import { getFooterCached } from '@/features/payload-cms/api/cached-globals';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getBuildInfo } from '@/utils/get-build-info';
import { ForceDynamicOnBuild } from '@/utils/is-pre-rendering';
import { cn } from '@/utils/tailwindcss-override';
import { SiInstagram, SiYoutube } from '@icons-pack/react-simple-icons';
import { cacheLife, cacheTag } from 'next/cache';
import type React from 'react';
import { Fragment } from 'react';

interface Arguments {
  children: React.ReactNode;
}

const FooterLayoutCached: React.FC<{ locale: Locale }> = async ({ locale }) => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'footer');

  const { minimalFooterMenu, socialLinks } = await getFooterCached(locale);

  const instagramLink = socialLinks?.instagram;
  const youTubeLink = socialLinks?.youtube;

  return (
    <>
      <div className="mb-2 flex justify-center gap-x-4 text-xs">
        {minimalFooterMenu?.map((footerMenuElement) => (
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

      <div className="mb-2 flex items-center justify-center gap-2">
        {instagramLink !== null && instagramLink !== undefined && (
          <LinkComponent
            href={instagramLink}
            hideExternalIcon
            openInNewTab
            rel="noopener noreferrer"
            className="rounded-full p-2 transition-colors duration-200"
            aria-label="Follow us on Instagram"
          >
            <SiInstagram className="h-5 w-5" />
          </LinkComponent>
        )}

        {youTubeLink !== null && youTubeLink !== undefined && (
          <LinkComponent
            href={youTubeLink}
            hideExternalIcon
            openInNewTab
            rel="noopener noreferrer"
            className="rounded-full p-2 transition-colors duration-200"
            aria-label="Subscribe to our YouTube channel"
          >
            <SiYoutube className="h-5 w-5" />
          </LinkComponent>
        )}
      </div>
    </>
  );
};

// cached functions must be async
// eslint-disable-next-line @typescript-eslint/require-await
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
              <ForceDynamicOnBuild>
                <FooterLayoutCached locale={locale} />
              </ForceDynamicOnBuild>

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
