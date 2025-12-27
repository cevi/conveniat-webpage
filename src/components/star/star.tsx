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
}> = ({ id, isStared, toggleStar, isLocked = false }) => {
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
      className={cn('h-8 w-8', isLocked ? 'cursor-default opacity-80' : 'hover:bg-gray-100')}
      disabled={isLocked}
    >
      <Star
        className={cn(
          'h-4 w-4 transition-all duration-200',
          isStared ? 'scale-110 fill-red-400 text-red-700' : 'text-gray-400 hover:scale-105',
        )}
      />
    </Button>
  );
};
