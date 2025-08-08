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

export const StarButton: React.FC<{
  id: string;
  isStared: boolean;
  toggleStar: (id: string) => void;
}> = ({ id, isStared, toggleStar }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={(event) => {
        event.stopPropagation();
        toggleStar(id);
      }}
      aria-label={isStared ? removeFromFavoritesText[locale] : addToFavoritesText[locale]}
      className="h-8 w-8 hover:bg-gray-100"
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
