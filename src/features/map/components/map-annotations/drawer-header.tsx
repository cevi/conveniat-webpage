import { StarButton } from '@/components/star/star';
import { ShareLinkButton } from '@/components/ui/buttons/share-link-button';
import { environmentVariables } from '@/config/environment-variables';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { useStar } from '@/hooks/use-star';
import type { Locale, StaticTranslationString } from '@/types/types';
import { quartierNicknameOf } from '@/utils/quartier-names';
import { X } from 'lucide-react';
import React from 'react';

const closeAriaLabel: StaticTranslationString = {
  de: 'Schliessen',
  en: 'Close',
  fr: 'Fermer',
};

const quartierLabel: StaticTranslationString = {
  de: 'Quartier',
  en: 'Quartier',
  fr: 'Quartier',
};

const outlinedButtonClassName =
  'h-11 w-11 rounded-full border border-rail bg-white p-0 text-green-700 hover:bg-white';

interface AnnotationDrawerHeaderProperties {
  closeDrawer: () => void;
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon;
  locale: Locale;
}

/** The name of the place, the Quartier it belongs to, and sharing, the star and closing. */
export const AnnotationDrawerHeader: React.FC<AnnotationDrawerHeaderProperties> = ({
  closeDrawer,
  annotation,
  locale,
}) => {
  const { isStarred, toggleStar } = useStar();

  return (
    <div className="flex items-start gap-2 pb-3">
      <div className="min-w-0 flex-1 pt-1">
        <h2 className="font-heading text-heading text-[22px] leading-tight font-extrabold">
          {annotation.title}
        </h2>
        {annotation.quartierName !== undefined && annotation.quartierName !== '' && (
          <p className="mt-0.5 text-sm text-green-500">
            {quartierLabel[locale]} · {quartierNicknameOf(annotation.quartierName)}
          </p>
        )}
      </div>

      <ShareLinkButton
        url={`${environmentVariables.NEXT_PUBLIC_APP_HOST_URL}/app/map?locationId=${annotation.id}`}
        title={annotation.title}
        locale={locale}
        compact
        className={outlinedButtonClassName}
      />
      <StarButton
        id={annotation.id}
        toggleStar={() => toggleStar(annotation.id)}
        isStared={isStarred(annotation.id)}
        className={outlinedButtonClassName}
      />
      <button
        type="button"
        className="bg-quiet flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-900"
        onClick={closeDrawer}
        aria-label={closeAriaLabel[locale]}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};
