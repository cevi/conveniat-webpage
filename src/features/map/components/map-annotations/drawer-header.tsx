import { StarButton } from '@/components/star/star';
import { LinkComponent } from '@/components/ui/link-component';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import type { Locale } from '@/types/types';
import { Share2, X } from 'lucide-react';
import React, { useState } from 'react';

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
  const [isStared, setIsStared] = useState(false);

  const toggleStar = (id: string): void => {
    setIsStared((previous) => !previous);
    console.log(`Toggled star for annotation with id: ${id}`);
  };

  return (
    <div className="sticky top-0 border-b-2 border-gray-100 bg-white pt-6">
      {/* Absolute positioned flex container for action icons */}
      <div className="absolute top-6 right-2 flex items-center space-x-2">
        {/* Heart Icon to star the annotation */}
        <StarButton id={''} toggleStar={toggleStar} isStared={isStared} />

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
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      <h2 className="text-conveniat-green p-4 pt-0.5 pr-8 text-xl font-bold">{annotation.title}</h2>
    </div>
  );
};
