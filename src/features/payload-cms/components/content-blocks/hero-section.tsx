'use client';

import { LinkComponent } from '@/components/ui/link-component';
import {
  getImageAltInLocale,
  getRelativeImageUrl,
  type SimplifiedImageType,
} from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import type { Image as PayloadImageType } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
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
  const imageUrl =
    getRelativeImageUrl(rawUrl) || 'https://placehold.co/1200x675/47564c/ffffff?text=conveniat27';
  const imageAlt = getImageAltInLocale(locale, imageObject) || title;

  return (
    <section className="to-conveniat-bg relative overflow-hidden border-b border-gray-200/60 bg-gradient-to-b from-white via-gray-50/50 py-10 sm:py-14 lg:py-16">
      {/* Background Glow Blobs */}
      <div className="bg-conveniat-green/5 pointer-events-none absolute -top-20 -right-20 size-96 rounded-full blur-3xl" />
      <div className="bg-cevi-blue/5 pointer-events-none absolute bottom-0 left-1/3 size-64 rounded-full blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Left: Hero Text & CTAs */}
          <div className="space-y-6 text-center lg:col-span-7 lg:text-left">
            {badge && badge.trim() !== '' && (
              <div className="border-conveniat-green/20 bg-conveniat-green/10 text-conveniat-green inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold">
                <span className="bg-conveniat-green size-2 animate-pulse rounded-full" />
                {badge}
              </div>
            )}

            <h1 className="text-conveniat-green font-heading text-3xl leading-tight font-black tracking-tight sm:text-4xl lg:text-5xl">
              {title}
            </h1>

            {description && description.trim() !== '' && (
              <p className="font-body max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg lg:mx-0">
                {description}
              </p>
            )}

            {/* Quick Action CTAs */}
            {((primaryCtaLabel && primaryCtaLink) || (secondaryCtaLabel && secondaryCtaLink)) && (
              <div className="flex flex-col items-center justify-center gap-3.5 pt-2 sm:flex-row lg:justify-start">
                {primaryCtaLabel && primaryCtaLink && (
                  <LinkComponent
                    href={primaryCtaLink}
                    className="bg-conveniat-green hover:bg-conveniat-green-hover inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto"
                  >
                    <span>{primaryCtaLabel}</span>
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </LinkComponent>
                )}

                {secondaryCtaLabel && secondaryCtaLink && (
                  <LinkComponent
                    href={secondaryCtaLink}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 shadow-2xs transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 sm:w-auto"
                  >
                    <svg
                      className="text-conveniat-green size-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <span>{secondaryCtaLabel}</span>
                  </LinkComponent>
                )}
              </div>
            )}

            {/* Deadline Banner */}
            {deadlineText && deadlineText.trim() !== '' && (
              <div className="flex items-center justify-center gap-2 pt-2 text-xs font-semibold text-gray-500 lg:justify-start">
                <svg
                  className="text-cevi-red size-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{deadlineText}</span>
              </div>
            )}
          </div>

          {/* Right: Hero Visual Card */}
          <div className="lg:col-span-5">
            <div className="group relative mx-auto max-w-md overflow-hidden rounded-2xl border-4 border-white bg-white p-2 shadow-xl ring-1 ring-gray-200/60 lg:max-w-none">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                <Image
                  src={imageUrl}
                  alt={imageAlt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
