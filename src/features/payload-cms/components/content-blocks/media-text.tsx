import { LinkComponent } from '@/components/ui/link-component';
import { SubheadingH2 } from '@/components/ui/typography/subheading-h2';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import {
  getImageAltInLocale,
  getRelativeImageUrl,
} from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import {
  getURLForLinkField,
  openURLInNewTab,
} from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { MediaTextBlock } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowRight } from 'lucide-react';
import ImageNode from 'next/image';
import React from 'react';

/** Column spans (out of 12) for the image, per configured width. */
const imageColumnClasses: Record<MediaTextBlock['imageWidth'], string> = {
  narrow: '@3xl:col-span-4',
  medium: '@3xl:col-span-5',
  wide: '@3xl:col-span-6',
};

const textColumnClasses: Record<MediaTextBlock['imageWidth'], string> = {
  narrow: '@3xl:col-span-8',
  medium: '@3xl:col-span-7',
  wide: '@3xl:col-span-6',
};

/**
 * Upper bounds for the media, so a square image cannot stretch the section far
 * past the height of the text beside it and leave a band of dead space.
 */
const imageMaxWidthClasses: Record<MediaTextBlock['imageWidth'], string> = {
  narrow: 'max-w-[300px]',
  medium: 'max-w-[400px]',
  wide: 'max-w-[500px]',
};

const imageShapeClasses: Record<MediaTextBlock['imageShape'], string> = {
  rounded: 'rounded-2xl ring-1 ring-gray-200/70 bg-white',
  circle: 'rounded-full ring-1 ring-gray-200/70 bg-white',
  plain: '',
};

export const MediaText: React.FC<MediaTextBlock & { locale: Locale }> = ({
  image,
  imagePosition,
  imageWidth,
  imageShape,
  background,
  eyebrow,
  title,
  richTextSection,
  linkLabel,
  linkField,
  locale,
}) => {
  const imageObject = typeof image === 'object' ? image : undefined;
  const imageUrl = getRelativeImageUrl(imageObject?.url);
  const width = imageWidth;
  const isTinted = background === 'tinted';
  const url = getURLForLinkField(linkField, locale) ?? '';

  return (
    // The container query context has to sit above the band: a `@2xl:` variant
    // on the same element that declares `@container` resolves against an
    // ancestor container, not itself, and would silently never match.
    <div className="@container">
      <div
        className={cn({
          // Horizontal padding stays at the card inset so the text keeps the
          // same left spine as the rest of the page; only the height breathes.
          'rounded-3xl bg-green-100/70 px-6 py-8 @2xl:py-12': isTinted,
        })}
      >
        <div className="grid grid-cols-1 items-center gap-8 @3xl:grid-cols-12 @3xl:gap-12">
          <div
            className={cn(
              imageColumnClasses[width],
              imagePosition === 'left' ? '@3xl:order-1' : '@3xl:order-2',
            )}
          >
            {imageUrl !== '' && (
              <div
                className={cn(
                  'relative mx-auto aspect-square w-full overflow-hidden',
                  imageMaxWidthClasses[width],
                  imageShapeClasses[imageShape],
                )}
              >
                <ImageNode
                  src={imageUrl}
                  alt={getImageAltInLocale(locale, imageObject)}
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 768px) 100vw, 45vw"
                />
              </div>
            )}
          </div>

          <div
            className={cn(
              'min-w-0',
              textColumnClasses[width],
              imagePosition === 'left' ? '@3xl:order-2' : '@3xl:order-1',
            )}
          >
            {eyebrow != undefined && eyebrow !== '' && (
              <p className="font-heading text-conveniat-green/70 mb-2 text-xs font-bold tracking-[0.18em] uppercase">
                {eyebrow}
              </p>
            )}
            {title != undefined && title !== '' && (
              <SubheadingH2 className="mt-0 mb-3">{title}</SubheadingH2>
            )}
            <div className="[&_*:first-child]:mt-0">
              <LexicalRichTextSection richTextSection={richTextSection} locale={locale} />
            </div>

            {url !== '' && linkLabel != undefined && linkLabel !== '' && (
              <LinkComponent
                href={url}
                openInNewTab={openURLInNewTab(linkField)}
                hideExternalIcon
                className="group bg-conveniat-green font-body mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white no-underline shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg"
              >
                {linkLabel}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </LinkComponent>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
