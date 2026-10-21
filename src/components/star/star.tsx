import { Button } from '@/components/ui/buttons/button';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Star } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

const addToFavoritesText: StaticTranslationString = {
  de: 'Zu Favoriten hinzufügen',
  en: 'Add to favorites',
  fr: 'Ajouter aux favoris',
};

const removeFromFavoritesText: StaticTranslationString = {
  de: 'Aus Favoriten entfernen',
  en: 'Remove from favorites',
  fr: 'Retirer des favoris',
};

const enrolledStarredText: StaticTranslationString = {
  de: 'Automatisch favorisiert (angemeldet)',
  en: 'Auto-starred (enrolled)',
  fr: 'Favori automatique (inscrit)',
};

export const StarButton: React.FC<{
  id: string;
  isStared: boolean;
  toggleStar: (id: string) => void;
  /** When true, the star is locked (enrolled items can't be un-starred) */
  isLocked?: boolean;
  className?: string;
}> = ({ id, isStared, toggleStar, isLocked = false, className }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  let ariaLabel: string = enrolledStarredText[locale];
  if (!isLocked) {
    ariaLabel = isStared ? removeFromFavoritesText[locale] : addToFavoritesText[locale];
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isLocked) {
          toggleStar(id);
        }
      }}
      aria-label={ariaLabel}
      aria-pressed={isStared}
      className={cn(
        'h-11 w-11 shrink-0 rounded-xl',
        isLocked ? 'cursor-default opacity-80' : 'hover:bg-green-50',
        className,
      )}
      disabled={isLocked}
    >
      <Star
        className={cn(
          'h-5 w-5 transition-transform duration-200',
          isStared ? 'fill-amber-700 text-amber-700' : 'text-green-500',
        )}
      />
    </Button>
  );
};
