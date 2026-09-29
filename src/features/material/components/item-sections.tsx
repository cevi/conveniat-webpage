import { MaterialItemImage } from '@/features/material/components/material-item-image';
import { labels } from '@/features/material/components/material-labels';
import {
  isRoutineItemStatus,
  ItemStatusBadge,
} from '@/features/material/components/material-status-badge';
import type { MaterialItemStatus } from '@/features/material/utils/stock';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * The top of an article page, the same for the material team and everybody else: photo,
 * shelf and code, the name, and right under it what decides whether the article is of use,
 * which the page passes as `children`. With `hero`, the photo leads across the full width of a
 * phone, it is how a participant tells the Kompass Recta from the Silva; an article without a
 * photo link skips it there rather than showing a large empty tile. A link that does not load
 * still gets the tile, the header cannot know before the browser tries.
 */
export const ItemHeader: React.FC<{
  item: {
    name: string;
    code: string;
    imageUrl: string | null;
    category: { name: string };
    status: MaterialItemStatus;
  };
  locale: Locale;
  /** the photo across the full width on a phone, for whoever does not know the article yet */
  hero?: boolean;
  children?: React.ReactNode;
}> = ({ item, locale, hero = false, children }) => (
  <div className={cn('gap-4', hero ? 'grid sm:flex sm:items-start' : 'flex items-start')}>
    <MaterialItemImage
      name={item.name}
      imageUrl={item.imageUrl}
      className={cn(
        'rounded-2xl sm:size-36 sm:p-1',
        !hero && 'size-20',
        hero &&
          (item.imageUrl === null || item.imageUrl === '' ? 'hidden sm:flex' : 'h-56 w-full p-3'),
      )}
    />
    <div className="min-w-0 flex-1 space-y-2">
      <div>
        <p className="truncate text-sm text-gray-500">
          {item.category.name} · {item.code}
        </p>
        <h1
          className={cn(
            'text-conveniat-green font-bold break-words',
            hero ? 'text-2xl' : 'text-xl sm:text-2xl',
          )}
        >
          {item.name}
        </h1>
      </div>
      {!isRoutineItemStatus(item.status) && (
        <ItemStatusBadge status={item.status} locale={locale} />
      )}
      {children}
    </div>
  </div>
);

/**
 * What an article is and how it comes back, as one quiet card: headings carry the structure,
 * so the parts need no boxes of their own. The usage notes stay highlighted, they are about
 * safety.
 */
export const ItemTexts: React.FC<{
  item: { description: string; usageNotes: string | null; returnInstructions: string };
  locale: Locale;
}> = ({ item, locale }) => {
  const sections = [
    { title: labels.description[locale], body: item.description },
    { title: labels.returnInstructions[locale], body: item.returnInstructions },
  ].filter((section) => section.body.trim() !== '');
  const hasNotes = item.usageNotes !== null && item.usageNotes.trim() !== '';
  if (sections.length === 0 && !hasNotes) return <></>;
  return (
    <section className="grid gap-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 lg:grid-cols-2">
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="font-semibold text-gray-900">{section.title}</h2>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-gray-700">
            {section.body}
          </p>
        </div>
      ))}
      {hasNotes && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900 lg:col-span-2">
          <span className="font-semibold">{labels.usageNotes[locale]}: </span>
          {item.usageNotes}
        </p>
      )}
    </section>
  );
};
