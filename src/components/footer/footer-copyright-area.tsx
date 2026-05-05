import { FooterGraphic } from '@/components/footer/footer-graphics';
import { CeviSchweiz } from '@/components/svg-logos/cevi-schweiz';
import { LinkComponent } from '@/components/ui/link-component';
import { getFooterCached } from '@/features/payload-cms/api/cached-globals';
import {
  getImageAltInLocale,
  getRelativeImageUrl,
} from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Image as ImageType } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getBuildInfo } from '@/utils/get-build-info';
import { ForceDynamicOnBuild } from '@/utils/is-pre-rendering';
import { cn } from '@/utils/tailwindcss-override';
import { SiInstagram, SiYoutube } from '@icons-pack/react-simple-icons';
import { cacheLife, cacheTag } from 'next/cache';
import ImageNode from 'next/image';
import type React from 'react';
import { Fragment } from 'react';

interface Arguments {
  children: React.ReactNode;
}

const FooterLayoutCached: React.FC<{ locale: Locale }> = async ({ locale }) => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'footer');

  const { minimalFooterMenu, socialLinks, sponsors } = await getFooterCached(locale);

  const instagramLink = socialLinks?.instagram;
  const youTubeLink = socialLinks?.youtube;

  const instagramAriaLabel: StaticTranslationString = {
    de: 'Folge uns auf Instagram',
    en: 'Follow us on Instagram',
    fr: 'Suivez-nous sur Instagram',
  };

  const youTubeAriaLabel: StaticTranslationString = {
    de: 'Abonniere unseren YouTube-Kanal',
    en: 'Subscribe to our YouTube channel',
    fr: 'Abonnez-vous à notre chaîne YouTube',
  };

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

      {sponsors !== undefined && sponsors !== null && sponsors.length > 0 && (
        <div className="mt-6 mb-4 flex flex-wrap items-center justify-center gap-4">
          {sponsors.map((sponsor) => {
            const url = getURLForLinkField(sponsor.linkField, locale);
            const image = sponsor.logo as ImageType | undefined;

            if (!image?.url) return <></>;

            const cardContent = (
              <div className="flex aspect-square w-24 items-center justify-center overflow-hidden rounded bg-white p-2 sm:w-32">
                <div className="relative size-full">
                  <ImageNode
                    src={getRelativeImageUrl(image.url)}
                    alt={getImageAltInLocale(locale, image)}
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            );

            if (sponsor.linkField !== undefined && url !== undefined && url !== '') {
              return (
                <LinkComponent
                  key={sponsor.id}
                  href={url}
                  openInNewTab={openURLInNewTab(sponsor.linkField)}
                  hideExternalIcon
                  className="block no-underline"
                >
                  {cardContent}
                </LinkComponent>
              );
            }

            return <Fragment key={sponsor.id}>{cardContent}</Fragment>;
          })}
        </div>
      )}

      <div className="mb-2 flex items-center justify-center gap-2">
        {instagramLink !== null && instagramLink !== undefined && (
          <LinkComponent
            href={instagramLink}
            hideExternalIcon
            openInNewTab
            rel="noopener noreferrer"
            className="rounded-full p-2 transition-colors duration-200"
            aria-label={instagramAriaLabel[locale]}
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
            aria-label={youTubeAriaLabel[locale]}
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
