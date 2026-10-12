import type { CampCategory } from '@/features/payload-cms/payload-types';

export const colorThemeMap: Record<string, string> = {
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
};

const defaultClassName = 'bg-gray-100 text-gray-700 border-gray-200';

/**
 * Resolves the `category` relationship of a schedule entry or helper shift to a populated category.
 *
 * The value cannot be blindly cast to `CampCategory`: Payload returns `null` when the related
 * category no longer exists and a plain ID string when the relationship is not populated.
 */
export const resolveCategory = (
  category: string | CampCategory | null | undefined,
): CampCategory | undefined =>
  typeof category === 'object' && category !== null ? category : undefined;

export function getCategoryDisplayData(category: string | CampCategory | null | undefined): {
  label: string;
  className: string;
} {
  if (!category) {
    return { label: '', className: defaultClassName };
  }

  if (typeof category === 'object') {
    return {
      label: category.title,
      className: colorThemeMap[category.colorTheme] ?? defaultClassName,
    };
  }

  // Fallback for string ID (though in frontend it should ideally be hydrated)
  return {
    label: category,
    className: defaultClassName,
  };
}

/**
 * A solid colour per theme, for the colour bar and the category name of the compact programme
 * list. Written as arbitrary values because the app's Tailwind palette has no purple, indigo,
 * rose or cyan, so the named classes for those themes compile to nothing.
 */
const colorThemeAccentMap: Record<string, { bar: string; text: string }> = {
  purple: { bar: 'bg-[#7e22ce]', text: 'text-[#7e22ce]' },
  green: { bar: 'bg-[#15803d]', text: 'text-[#15803d]' },
  blue: { bar: 'bg-[#1d4ed8]', text: 'text-[#1d4ed8]' },
  gray: { bar: 'bg-[#6d6e76]', text: 'text-[#4c4d52]' },
  indigo: { bar: 'bg-[#4338ca]', text: 'text-[#4338ca]' },
  amber: { bar: 'bg-[#b45309]', text: 'text-[#b45309]' },
  rose: { bar: 'bg-[#be123c]', text: 'text-[#be123c]' },
  cyan: { bar: 'bg-[#0e7490]', text: 'text-[#0e7490]' },
  orange: { bar: 'bg-[#c2410c]', text: 'text-[#c2410c]' },
};

const defaultAccent = { bar: 'bg-[#6d6e76]', text: 'text-[#4c4d52]' };

/** Title and accent colours of an entry's category; the gray default for an entry without one. */
export function getCategoryAccent(category: string | CampCategory | null | undefined): {
  label: string;
  bar: string;
  text: string;
} {
  const resolved = resolveCategory(category);
  if (resolved === undefined) return { label: '', ...defaultAccent };
  return { label: resolved.title, ...(colorThemeAccentMap[resolved.colorTheme] ?? defaultAccent) };
}
