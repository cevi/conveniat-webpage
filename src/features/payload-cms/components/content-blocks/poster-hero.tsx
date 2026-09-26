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
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

export interface PosterHeroType {
  badge?: string | null;
  title: string;
  description?: string | null;
  primaryCtaLabel?: string | null;
  primaryCtaLink?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaLink?: string | null;
  image?: (PayloadImageType | string) | null;
  locale?: Locale;
}

const chipBase =
  'group font-body inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold no-underline transition-colors';

/**
 * The poster opener of a page: the page's H1, an optional eyebrow, a lead
 * paragraph and up to two links, overlaid on the bottom left of a background
 * photo that fills the whole block.
 *
 * It shares the hero section's fields and empty-state behaviour on purpose —
 * an editor can switch a page between the two openers without retyping copy —
 * but it is its own block: the hero is a two-column opener with the image in a
 * rounded card, while the poster puts the text on top of the photo. Without an
 * image the poster is a solid dark band, never a stand-in graphic pulled from
 * an external host, so a half-filled block still renders as an intentional
 * text-only opener.
 */
export const PosterHeroBlock: React.FC<PosterHeroType> = ({
  badge,
  title,
  description,
  primaryCtaLabel,
  primaryCtaLink,
  secondaryCtaLabel,
  secondaryCtaLink,
  image,
  locale = 'de',
}) => {
  const imageObject =
    typeof image === 'object' && image !== null
      ? (image as SimplifiedImageType & { url?: string })
      : undefined;
  const rawUrl = typeof image === 'string' ? image : imageObject?.url;
  // No placeholder image: a poster without one is a text-only dark band, rather
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
    <div className="relative flex h-[70vh] min-h-[420px] w-full flex-col justify-end overflow-hidden bg-green-950">
      {hasImage && (
        <>
          {/* An opener block sits at the top of the page, so its photo is the
          LCP element and must not wait for hydration to start loading. */}
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          {/* Scrim keeps the headline readable over an arbitrary photo; it is
          darkest at the bottom, where the text sits. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-green-950/85 via-green-950/40 to-transparent"
          />
        </>
      )}

      <div className="relative z-10 px-5 pb-8 md:px-10 md:pb-12">
        <HeadlineH1 className="mt-0 mb-3 pt-0 text-4xl text-white md:pt-0 md:text-5xl">
          {title}
        </HeadlineH1>

        {badge != undefined && badge.trim() !== '' && (
          <p className="font-heading mb-2 text-xs font-bold tracking-[0.18em] text-white/80 uppercase">
            {badge}
          </p>
        )}

        {description != undefined && description.trim() !== '' && (
          <p className="font-body max-w-[46ch] text-lg leading-[1.55] font-medium text-pretty text-white/90 md:text-xl md:leading-[1.5]">
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
                  'border border-white/40 bg-white/10 text-white hover:border-white/70 hover:bg-white/20',
                )}
              >
                {secondaryCtaLabel}
                <ArrowRight className="size-3.5" />
              </LinkComponent>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
