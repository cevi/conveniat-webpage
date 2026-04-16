import { LinkComponent } from '@/components/ui/link-component';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { getImageAltInLocale } from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Image as ImageType } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import ImageNode from 'next/image';
import React from 'react';

export interface SponsorGridSponsor {
  id?: string | null;
  image: ImageType;
  linkField?: LinkFieldDataType;
}

export interface SponsorGridTier {
  id?: string | null;
  title?: string;
  columnsDesktop: '2' | '3' | '4' | '5' | '6';
  sponsors: SponsorGridSponsor[];
}

export interface SponsorGridType {
  tiers: SponsorGridTier[];
}

const gridColsMap: Record<string, string> = {
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  '5': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  '6': 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6',
};

const SponsorCard: React.FC<{
  sponsor: SponsorGridSponsor;
  locale: Locale;
}> = ({ sponsor, locale }) => {
  const url = getURLForLinkField(sponsor.linkField, locale);

  const cardContent = (
    <div className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-xs transition-all duration-300 hover:border-gray-200 hover:shadow-md md:p-6">
      <div className="relative size-full">
        <ImageNode
          src={sponsor.image.url ?? ''}
          alt={getImageAltInLocale(locale, sponsor.image)}
          fill
          className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
        />
      </div>
    </div>
  );

  if (sponsor.linkField !== undefined && url !== undefined && url !== '') {
    return (
      <LinkComponent
        href={url}
        openInNewTab={openURLInNewTab(sponsor.linkField)}
        hideExternalIcon
        className="block no-underline"
      >
        {cardContent}
      </LinkComponent>
    );
  }

  return cardContent;
};

export const SponsorGrid: React.FC<SponsorGridType & { locale: Locale }> = ({ tiers, locale }) => {
  return (
    <div className="flex flex-col gap-12 py-4">
      {tiers.map((tier, index) => (
        <div key={tier.id ?? index} className="flex flex-col gap-6">
          {tier.title !== undefined && tier.title !== '' && (
            <h3 className="font-heading text-conveniat-green text-xl font-bold md:text-2xl">
              {tier.title}
            </h3>
          )}
          <div
            className={cn(
              'grid gap-4 md:gap-6',
              gridColsMap[tier.columnsDesktop] ?? gridColsMap['4'],
            )}
          >
            {tier.sponsors.map((sponsor, sponsorIndex) => (
              <SponsorCard key={sponsor.id ?? sponsorIndex} sponsor={sponsor} locale={locale} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
