import type { FieldHook } from 'payload';

export const formatSlug = (value: string): string =>
  value
    .replaceAll(' ', '-')
    .replaceAll(/[^\w-]+/g, '')
    .toLowerCase();

export const formatSlugHook =
  (fallback: string): FieldHook =>
  ({ data, operation, value }) => {
    if (typeof value === 'string') {
      return formatSlug(value);
    }

    if (operation === 'create' || !data?.['slug']) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const fallbackData = data?.[fallback] || data?.[fallback];

      if (fallbackData && typeof fallbackData === 'string') {
        return formatSlug(fallbackData);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  };
