import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';

/**
 * Resolves the `location` relationship of a schedule entry to a populated annotation.
 *
 * The value cannot be blindly cast to `CampMapAnnotation`: Payload returns `null` when the
 * related annotation no longer exists (or is not readable) and a plain ID string when the
 * relationship is not populated (e.g. cached entries fetched with a lower depth).
 */
export const resolveLocation = (
  location: string | CampMapAnnotation | null | undefined,
): CampMapAnnotation | undefined =>
  typeof location === 'object' && location !== null ? location : undefined;
