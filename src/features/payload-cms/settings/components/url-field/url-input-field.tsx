import React from 'react';
import type { CollectionSlug } from 'payload';
import { findPrefixByCollectionSlugAndLocale } from '@/features/payload-cms/route-resolution-table';
import type { Locale } from '@/types/types';
import { LOCALE } from '@/features/payload-cms/settings/locales';

/**
 * Approximates the width of a string of text in a given font size. This is a hacky solution that
 * uses a precomputed table of character widths.
 *
 * Code was originally posted here: https://stackoverflow.com/a/48172630
 *
 * @param string_
 * @param fontSize
 */
const measureText = (string_: string, fontSize: number): number => {
  const widths = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0.279_687_5, 0.276_562_5, 0.354_687_5, 0.554_687_5, 0.554_687_5, 0.889_062_5, 0.665_625,
    0.190_625, 0.332_812_5, 0.332_812_5, 0.389_062_5, 0.582_812_5, 0.276_562_5, 0.332_812_5,
    0.276_562_5, 0.301_562_5, 0.554_687_5, 0.554_687_5, 0.554_687_5, 0.554_687_5, 0.554_687_5,
    0.554_687_5, 0.554_687_5, 0.554_687_5, 0.554_687_5, 0.554_687_5, 0.276_562_5, 0.276_562_5,
    0.584_375, 0.582_812_5, 0.584_375, 0.554_687_5, 1.014_062_5, 0.665_625, 0.665_625, 0.721_875,
    0.721_875, 0.665_625, 0.609_375, 0.776_562_5, 0.721_875, 0.276_562_5, 0.5, 0.665_625,
    0.554_687_5, 0.832_812_5, 0.721_875, 0.776_562_5, 0.665_625, 0.776_562_5, 0.721_875, 0.665_625,
    0.609_375, 0.721_875, 0.665_625, 0.943_75, 0.665_625, 0.665_625, 0.609_375, 0.276_562_5,
    0.354_687_5, 0.276_562_5, 0.476_562_5, 0.554_687_5, 0.332_812_5, 0.554_687_5, 0.554_687_5, 0.5,
    0.554_687_5, 0.554_687_5, 0.276_562_5, 0.554_687_5, 0.554_687_5, 0.221_875, 0.240_625, 0.5,
    0.221_875, 0.832_812_5, 0.554_687_5, 0.554_687_5, 0.554_687_5, 0.554_687_5, 0.332_812_5, 0.5,
    0.276_562_5, 0.554_687_5, 0.5, 0.721_875, 0.5, 0.5, 0.5, 0.354_687_5, 0.259_375, 0.353_125,
    0.589_062_5,
  ];

  const avg = 0.527_927_631_578_947_1;

  return (
    [...string_].reduce(
      (accumulator, current) => accumulator + (widths[current.codePointAt(0) ?? 0] ?? avg),
      0,
    ) * fontSize
  );
};

/**
 *
 * Adds a prefix to the URL slug field in the admin interface.
 * Displaying the URL for the current locale and collection.
 *
 */
const urlSlugPrefixField: React.FC<{
  path: string;
  collectionSlug: string;
  req: {
    locale: string;
  };
}> = ({ collectionSlug, path, req }) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const locale = ((req as never)['locale'] ?? LOCALE.DE) as Locale;
  const slug: CollectionSlug = collectionSlug as unknown as CollectionSlug;
  const inputFieldId = `field-${path.replaceAll('.', '__')}`;

  const prefix_slug = findPrefixByCollectionSlugAndLocale(slug as CollectionSlug, locale);
  const prefix = `/${locale === LOCALE.DE ? '' : locale}/${prefix_slug}/`.replaceAll(/\/+/g, '/');

  return (
    <>
      <span className="absolute m-3 text-gray-400">{prefix}</span>
      <style>
        {
          /*
           * Adding padding like this using a static width calculation is not ideal, but it's the
           * only way to achieve this without modifying the Payload source code.
           */
          `#${inputFieldId} { padding-left: ${measureText(prefix, 13) + 10}px; }`
        }
      </style>
    </>
  );
};

export default urlSlugPrefixField;
