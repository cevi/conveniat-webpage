import { StarButton } from '@/components/star/star';
import { LinkComponent } from '@/components/ui/link-component';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { useStar } from '@/hooks/use-star';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Share2, X } from 'lucide-react';
import React from 'react';

const closeAriaLabel: StaticTranslationString = {
  de: 'Schliessen',
  en: 'Close',
  fr: 'Fermer',
};

interface AnnotationDrawerHeaderProperties {
  closeDrawer: () => void;
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon;
  locale: Locale;
  shareLocationCallback: (
    locale: Locale,
    annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon,
  ) => Promise<void>;
}

export const AnnotationDrawerHeader: React.FC<AnnotationDrawerHeaderProperties> = ({
  closeDrawer,
  annotation,
  locale,
  shareLocationCallback,
}) => {
  const { isStarred, toggleStar } = useStar();

  const toggleStarHandler = (): void => {
    console.log(`Toggled star for annotation with id: ${annotation.id}`);
    toggleStar(annotation.id);
  };

  return (
    <>
      {/* Absolute positioned flex container for action icons */}
      <div className="absolute top-3 right-2 flex items-center space-x-2">
        {/* Heart Icon to star the annotation */}
        <StarButton
          id={annotation.id}
          toggleStar={toggleStarHandler}
          isStared={isStarred(annotation.id)}
        />

        {/* Share Icon */}
        {typeof navigator.share === 'function' && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-gray-200 hover:text-gray-800">
            <LinkComponent
              href=""
              hideExternalIcon={false}
              onClick={(event) => {
                event.preventDefault();
                void shareLocationCallback(locale, annotation);
              }}
            >
              <Share2 aria-hidden="true" className="size-4" />
            </LinkComponent>
          </div>
        )}

        {/* Close Button */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-gray-200 hover:text-gray-800"
          onClick={closeDrawer}
          aria-label={closeAriaLabel[locale]}
        >
          <X size={20} />
        </button>
      </div>

      <h2 className="text-conveniat-green max-w-[calc(100%-72px)] p-4 pt-0.5 pr-8 text-xl font-bold">
        {annotation.title}
      </h2>
    </>
  );
};
