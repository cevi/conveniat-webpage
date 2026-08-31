import { LinkComponent } from '@/components/ui/link-component';
import {
  getImageAltInLocale,
  getRelativeImageUrl,
} from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { LeadSectionBlock } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowRight } from 'lucide-react';
import ImageNode from 'next/image';
import React from 'react';

const imageShapeClasses: Record<NonNullable<LeadSectionBlock['imageShape']>, string> = {
  circle: 'rounded-full ring-1 ring-gray-200/70 bg-white',
  rounded: 'rounded-2xl ring-1 ring-gray-200/70 bg-white',
  plain: '',
};

export const LeadSection: React.FC<LeadSectionBlock & { locale: Locale }> = ({
  eyebrow,
  lead,
  image,
  imageShape,
  quickLinks,
  locale,
}) => {
  const imageObject = typeof image === 'object' && image !== null ? image : undefined;
  const imageUrl = getRelativeImageUrl(imageObject?.url);
  const shape = imageShape ?? 'circle';

  return (
    <div className="@container">
      <div className="flex flex-col-reverse items-start gap-8 @3xl:flex-row @3xl:items-center @3xl:gap-12">
        <div className="min-w-0 flex-1">
          {eyebrow != undefined && eyebrow !== '' && (
            <p className="font-heading text-conveniat-green/70 mb-2 text-xs font-bold tracking-[0.18em] uppercase">
              {eyebrow}
            </p>
          )}

          {/* The lead is the page's opening statement, so it is set noticeably
              larger than body copy but still below heading weight. */}
          <p className="font-body text-conveniat-green max-w-[36ch] text-lg leading-[1.55] font-medium text-pretty @xl:text-xl @xl:leading-[1.5]">
            {lead}
          </p>

          {quickLinks != undefined && quickLinks.length > 0 && (
            <ul className="mt-6 flex list-none flex-wrap gap-2.5 p-0">
              {quickLinks.map((quickLink, index) => {
                const url = getURLForLinkField(quickLink.linkField, locale) ?? '';
                if (url === '') return <React.Fragment key={quickLink.id ?? index} />;
                return (
                  <li key={quickLink.id ?? index} className="m-0 p-0">
                    <LinkComponent
                      href={url}
                      openInNewTab={openURLInNewTab(quickLink.linkField)}
                      hideExternalIcon
                      className="group border-conveniat-green/20 bg-conveniat-green/5 text-conveniat-green hover:border-conveniat-green/40 hover:bg-conveniat-green/10 font-body inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold no-underline transition-colors"
                    >
                      {quickLink.label}
                      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </LinkComponent>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {imageUrl !== '' && (
          <div className="w-32 shrink-0 @md:w-44 @3xl:w-56">
            <div
              className={cn(
                'relative aspect-square w-full overflow-hidden',
                imageShapeClasses[shape],
              )}
            >
              <ImageNode
                src={imageUrl}
                alt={getImageAltInLocale(locale, imageObject)}
                fill
                className="object-contain p-1"
                sizes="(max-width: 768px) 128px, 224px"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
