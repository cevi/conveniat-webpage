'use server';

import type { CollectionSlug } from 'payload';
import type { Locale } from '@/types';
import { findPrefixByCollectionSlugAndLocale } from '@/route-resolution-table';

/**
 * A simple server function wrapper for the findPrefixByCollectionSlugAndLocale function.
 *
 * @param collectionSlug
 * @param locale
 */
export const serverSideSlugToUrlResolution = async (
  collectionSlug: CollectionSlug,
  locale: Locale,
): Promise<string> => findPrefixByCollectionSlugAndLocale(collectionSlug, locale);
