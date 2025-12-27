'use server';

import { findPrefixByCollectionSlugAndLocale } from '@/features/payload-cms/route-resolution-table';
import type { Locale } from '@/types/types';
import type { CollectionSlug } from 'payload';

/**
 * A simple server function wrapper for the findPrefixByCollectionSlugAndLocale function.
 *
 * @param collectionSlug
 * @param locale
 */
export const serverSideSlugToUrlResolution = async (
  collectionSlug: CollectionSlug,
  locale: Locale,
): Promise<string> =>
  new Promise((resolve) => resolve(findPrefixByCollectionSlugAndLocale(collectionSlug, locale)));
