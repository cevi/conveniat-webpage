import { LinkComponent } from '@/components/ui/link-component';
import {
  getImageAltInLocale,
  getRelativeImageUrl,
} from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { FeaturedSectionBlock } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import ImageNode from 'next/image';
import React from 'react';

export const FeaturedSection: React.FC<FeaturedSectionBlock & { locale: Locale }> = ({
  mainFeature,
  subFeatures,
  locale,
}) => {
  const mainFeatureUrl = getURLForLinkField(mainFeature.linkField, locale) ?? '';
  const mainImage = typeof mainFeature.image === 'object' ? mainFeature.image : undefined;

  const MainFeatureContent = (
    <div className="group flex h-full flex-col">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
        {mainImage?.url != undefined && mainImage.url !== '' ? (
          <ImageNode
            src={getRelativeImageUrl(mainImage.url)}
            alt={getImageAltInLocale(locale, mainImage)}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gray-200" />
        )}
      </div>
      <div className="mt-6 flex flex-col @3xl:mt-8">
        {mainFeature.label != undefined && mainFeature.label !== '' && (
          <span className="font-heading text-sm font-bold tracking-widest text-gray-500 uppercase">
            {mainFeature.label}
          </span>
        )}
        <h3 className="font-heading text-conveniat-green mt-2 text-3xl font-bold">
          {mainFeature.title}
        </h3>
        {mainFeature.description != undefined && mainFeature.description !== '' && (
          <p className="font-body mt-3 text-lg leading-relaxed text-gray-600">
            {mainFeature.description}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="@container w-full">
      <div className="flex flex-col gap-12 @3xl:flex-row @3xl:gap-12 @5xl:gap-16">
        {/* Main Feature */}
        <div className="w-full @3xl:w-1/2">
          {mainFeatureUrl === '' ? (
            MainFeatureContent
          ) : (
            <LinkComponent
              href={mainFeatureUrl}
              openInNewTab={openURLInNewTab(mainFeature.linkField)}
              hideExternalIcon
              className="block h-full no-underline"
            >
              {MainFeatureContent}
            </LinkComponent>
          )}
        </div>

        {/* Sub Features */}
        <div className="flex w-full flex-col gap-10 @3xl:w-1/2">
          {subFeatures?.map((subFeature, index) => {
            const subFeatureUrl = getURLForLinkField(subFeature.linkField, locale) ?? '';
            const subImage = typeof subFeature.image === 'object' ? subFeature.image : undefined;

            const SubFeatureContent = (
              <div className="group flex h-full flex-col gap-6 @sm:flex-row @sm:items-start">
                <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200/60 @md:w-32 @lg:w-40 @xl:w-48">
                  {subImage?.url != undefined && subImage.url !== '' && (
                    <ImageNode
                      src={getRelativeImageUrl(subImage.url)}
                      alt={getImageAltInLocale(locale, subImage)}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col @sm:py-1">
                  {subFeature.label != undefined && subFeature.label !== '' && (
                    <span className="font-heading text-xs font-bold tracking-widest text-gray-500 uppercase">
                      {subFeature.label}
                    </span>
                  )}
                  <h4 className="font-heading text-conveniat-green mt-2 text-xl font-bold">
                    {subFeature.title}
                  </h4>
                  {subFeature.description != undefined && subFeature.description !== '' && (
                    <p className="font-body mt-2 text-base leading-relaxed text-gray-600">
                      {subFeature.description}
                    </p>
                  )}
                </div>
              </div>
            );

            return (
              <div key={subFeature.id ?? index} className="w-full">
                {subFeatureUrl === '' ? (
                  SubFeatureContent
                ) : (
                  <LinkComponent
                    href={subFeatureUrl}
                    openInNewTab={openURLInNewTab(subFeature.linkField)}
                    hideExternalIcon
                    className="block no-underline"
                  >
                    {SubFeatureContent}
                  </LinkComponent>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
