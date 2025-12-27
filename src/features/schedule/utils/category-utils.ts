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
