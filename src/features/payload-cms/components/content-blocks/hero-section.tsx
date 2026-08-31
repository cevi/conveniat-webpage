import { LinkComponent } from '@/components/ui/link-component';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import {
  getImageAltInLocale,
  getRelativeImageUrl,
  type SimplifiedImageType,
} from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import type { Image as PayloadImageType } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowRight, Clock } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

export interface HeroSectionType {
  badge?: string | null;
  title: string;
  description?: string | null;
  primaryCtaLabel?: string | null;
  primaryCtaLink?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaLink?: string | null;
  deadlineText?: string | null;
  image?: (PayloadImageType | string) | null;
  locale?: Locale;
}

const chipBase =
  'group font-body inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold no-underline transition-colors';

/**
 * The opening block of a page: the page's H1, an optional eyebrow, a lead
 * paragraph, up to two links and an optional image.
 *
 * The type scale and the link treatment are deliberately restrained and match
 * the rest of a page's content, so a page whose opener carries an image and one
 * whose opener is text-only still read as the same design. The H1 comes from
 * `HeadlineH1` — the same component the page layout renders when a page has no
 * opener block at all — which keeps all three cases on one scale by
 * construction.
 */
export const HeroSectionBlock: React.FC<HeroSectionType> = ({
  badge,
  title,
  description,
  primaryCtaLabel,
  primaryCtaLink,
  secondaryCtaLabel,
  secondaryCtaLink,
  deadlineText,
  image,
  locale = 'de',
}) => {
  const imageObject =
    typeof image === 'object' && image !== null
      ? (image as SimplifiedImageType & { url?: string })
      : undefined;
  const rawUrl = typeof image === 'string' ? image : imageObject?.url;
  // No placeholder image: an opener without one is a text-only opener, rather
  // than one that pulls a stand-in graphic from an external host.
  const imageUrl = getRelativeImageUrl(rawUrl);
  const hasImage = imageUrl !== '';
  const imageAlt = getImageAltInLocale(locale, imageObject) || title;

  const hasPrimary =
    primaryCtaLabel != undefined &&
    primaryCtaLabel !== '' &&
    primaryCtaLink != undefined &&
    primaryCtaLink !== '';
  const hasSecondary =
    secondaryCtaLabel != undefined &&
    secondaryCtaLabel !== '' &&
    secondaryCtaLink != undefined &&
    secondaryCtaLink !== '';

  return (
    <div className="@container">
      <div
        className={cn(
          'grid grid-cols-1 items-center gap-8 @3xl:gap-12',
          hasImage && '@3xl:grid-cols-12',
        )}
      >
        <div className={cn('min-w-0', hasImage && '@3xl:col-span-7')}>
          <HeadlineH1 className="mt-0 mb-3">{title}</HeadlineH1>

          {badge != undefined && badge.trim() !== '' && (
            <p className="font-heading text-conveniat-green/70 mb-2 text-xs font-bold tracking-[0.18em] uppercase">
              {badge}
            </p>
          )}

          {description != undefined && description.trim() !== '' && (
            <p className="font-body text-conveniat-green max-w-[46ch] text-lg leading-[1.55] font-medium text-pretty @xl:text-xl @xl:leading-[1.5]">
              {description}
            </p>
          )}

          {(hasPrimary || hasSecondary) && (
            <div className="mt-6 flex flex-wrap gap-2.5">
              {hasPrimary && (
                <LinkComponent
                  href={primaryCtaLink}
                  hideExternalIcon
                  className={cn(chipBase, 'bg-conveniat-green text-white hover:bg-green-700')}
                >
                  {primaryCtaLabel}
                  <ArrowRight className="size-3.5" />
                </LinkComponent>
              )}

              {hasSecondary && (
                <LinkComponent
                  href={secondaryCtaLink}
                  hideExternalIcon
                  className={cn(
                    chipBase,
                    'border-conveniat-green/20 bg-conveniat-green/5 text-conveniat-green hover:border-conveniat-green/40 hover:bg-conveniat-green/10 border',
                  )}
                >
                  {secondaryCtaLabel}
                  <ArrowRight className="size-3.5" />
                </LinkComponent>
              )}
            </div>
          )}

          {deadlineText != undefined && deadlineText.trim() !== '' && (
            <p className="font-body mt-4 flex items-center gap-2 text-xs font-semibold text-gray-500">
              <Clock className="text-cevi-red size-4 shrink-0" />
              {deadlineText}
            </p>
          )}
        </div>

        {hasImage && (
          <div className="@3xl:col-span-5">
            <div className="relative overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-gray-200/70">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
