import { ShareLinkButton } from '@/components/ui/buttons/share-link-button';
import { environmentVariables } from '@/config/environment-variables';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { useStar } from '@/hooks/use-star';
import type { Locale, StaticTranslationString } from '@/types/types';
import { quartierNicknameOf } from '@/utils/quartier-names';
import { cn } from '@/utils/tailwindcss-override';
import { Star, X } from 'lucide-react';
import React from 'react';

const labels = {
  close: { de: 'Schliessen', en: 'Close', fr: 'Fermer' },
  quartier: { de: 'Quartier', en: 'Quartier', fr: 'Quartier' },
  favourite: { de: 'Favorit', en: 'Favourite', fr: 'Favori' },
} satisfies Record<string, StaticTranslationString>;

/** a labelled action under the name of the place */
const actionClassName =
  'flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 text-[15px] font-semibold text-green-900 transition-colors hover:border-green-300 hover:bg-white';

interface AnnotationDrawerHeaderProperties {
  closeDrawer: () => void;
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon;
  locale: Locale;
}

/**
 * The name of the place with the way to close the sheet beside it, the Quartier it belongs to,
 * and below them what can be done with the place, each action named in words: the name gets the
 * width of the sheet rather than sharing it with a row of icons.
 */
export const AnnotationDrawerHeader: React.FC<AnnotationDrawerHeaderProperties> = ({
  closeDrawer,
  annotation,
  locale,
}) => {
  const { isStarred, toggleStar } = useStar();
  const starred = isStarred(annotation.id);

  return (
    <div className="pb-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 pt-1.5">
          <h2 className="font-heading text-heading text-[22px] leading-tight font-extrabold">
            {annotation.title}
          </h2>
          {annotation.quartierName !== undefined && annotation.quartierName !== '' && (
            <p className="mt-0.5 text-sm text-green-500">
              {labels.quartier[locale]} · {quartierNicknameOf(annotation.quartierName)}
            </p>
          )}
        </div>
        <button
          type="button"
          className="bg-quiet flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-900"
          onClick={closeDrawer}
          aria-label={labels.close[locale]}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          aria-pressed={starred}
          onClick={() => toggleStar(annotation.id)}
          className={cn(actionClassName, starred && 'border-amber-700 bg-amber-50 text-amber-700')}
        >
          <Star className={cn('h-5 w-5', starred && 'fill-amber-700')} aria-hidden="true" />
          {labels.favourite[locale]}
        </button>
        <ShareLinkButton
          url={`${environmentVariables.NEXT_PUBLIC_APP_HOST_URL}/app/map?locationId=${annotation.id}`}
          title={annotation.title}
          locale={locale}
          withLabel
          className={actionClassName}
        />
      </div>
    </div>
  );
};
