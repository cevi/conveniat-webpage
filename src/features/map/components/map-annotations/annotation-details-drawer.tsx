'use client';

import { LinkComponent } from '@/components/ui/link-component';
import { environmentVariables } from '@/config/environment-variables';
import { AnnotationScheduleTableComponent } from '@/features/map/components/map-annotations/annotation-schedule-table-component';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CampScheduleEntry,
} from '@/features/map/types/types';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { getImageAltInLocale } from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { Clock, ExternalLink, Flag, MessageCircleQuestion, MessageSquare, X } from 'lucide-react';
import Image from 'next/image';
import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const shareLocationError: StaticTranslationString = {
  de: 'Dein Gerät unterstützt die Web Share API nicht.',
  en: 'Your device does not support the web share api.',
  fr: "Votre appareil ne prend pas en charge l'API de partage web.",
};

const shareLocationCallback = async (
  locale: Locale,
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon,
): Promise<void> => {
  const data = {
    url: environmentVariables.NEXT_PUBLIC_APP_HOST_URL + '/app/map?locationId=' + annotation.id,
    title: 'conveniat27',
    text: annotation.title,
  };
  try {
    await navigator.share(data);
  } catch {
    alert(shareLocationError[locale]);
  }
};

export const AnnotationDetailsDrawer: React.FC<{
  closeDrawer: () => void;
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon;
  schedule: CampScheduleEntry[] | undefined;
  locale: Locale;
}> = ({ closeDrawer, annotation, schedule, locale }) => {
  return (
    <div className="fixed right-0 bottom-[80px] left-0 z-[999] h-[50vh] overflow-hidden rounded-t-2xl bg-white shadow-[0px_-4px_38px_-19px_rgba(1,1,1,0.5)] xl:left-[480px]">
      <div className="flex h-full flex-col overflow-y-auto px-4">
        <div className="relative">
          <div className="sticky top-0 border-b-2 border-gray-100 bg-white pt-6">
            <button
              className="absolute top-8 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
              onClick={closeDrawer}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h2 className="p-4 pr-8 text-xl font-bold">{annotation.title}</h2>
          </div>

          {/* share button */}
          {typeof navigator.share === 'function' && (
            <div className="border-b-2 border-gray-100 p-4">
              <LinkComponent
                href=""
                hideExternalIcon={false}
                onClick={(event) => {
                  event.preventDefault(); // prevent navigation if needed
                  void shareLocationCallback(locale, annotation);
                }}
              >
                <span className="inline-flex items-center gap-1">
                  Share this location
                  <ExternalLink aria-hidden="true" className="size-4" />
                </span>
              </LinkComponent>
            </div>
          )}

          {/* Description */}
          <div className="border-b-2 border-gray-100 p-4">
            <ErrorBoundary fallback={<div>Error loading annotation</div>}>
              <LexicalRichTextSection
                richTextSection={annotation.description as SerializedEditorState}
              />
            </ErrorBoundary>
          </div>

          {/* Opening Hours */}
          {annotation.openingHours && annotation.openingHours.length > 0 && (
            <div className="border-b-2 border-gray-100 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Clock size={18} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Opening Hours</h3>
              </div>
              <ul className="list-disc pl-5">
                {annotation.openingHours.map((entry, index) => (
                  <li key={index} className="text-gray-700">
                    {/* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */}
                    {entry.day
                      ? `${entry.day.charAt(0).toUpperCase() + entry.day.slice(1)}: `
                      : 'Daily: '}
                    {entry.time}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Images */}
          <div className="border-b-2 border-gray-100 p-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {annotation.images.length > 0 &&
                annotation.images.map((image, index) => (
                  <Suspense
                    key={index}
                    fallback={<div className="h-24 w-24 rounded-lg bg-gray-200" />}
                  >
                    <Image
                      src={image.url ?? ''}
                      alt={getImageAltInLocale(locale, image)}
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  </Suspense>
                ))}
            </div>
          </div>
          {/* Related Programs Section */}
          <AnnotationScheduleTableComponent locale={locale} schedule={schedule} />

          {/* Forum Post / Report Issues */}
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <MessageCircleQuestion size={18} className="text-gray-600" />
              <h3 className="font-semibold text-gray-900">conveniat27 Forum</h3>
            </div>
            <div className="space-y-2">
              <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50">
                <MessageSquare size={16} className="text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">View Forum Posts</div>
                  <div className="text-sm text-gray-600">See what others are saying</div>
                </div>
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-gray-300 hover:bg-gray-50">
                <Flag size={16} className="text-orange-600" />
                <div>
                  <div className="font-medium text-gray-900">Report an Issue</div>
                  <div className="text-sm text-gray-600">
                    Broken toilet, maintenance needed, etc.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
