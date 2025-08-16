import { environmentVariables } from '@/config/environment-variables';
import { AnnotationDrawerHeader } from '@/features/map/components/map-annotations/drawer-header';
import { AnnotationScheduleTableComponent } from '@/features/map/components/map-annotations/sections/annotation-schedule-table-component';
import { AnnotationDescriptionSection } from '@/features/map/components/map-annotations/sections/description-section';
import { AnnotationForumAndReportSection } from '@/features/map/components/map-annotations/sections/forum-and-report-section';
import { AnnotationImagesSection } from '@/features/map/components/map-annotations/sections/image-section';
import { AnnotationOpeningHoursSection } from '@/features/map/components/map-annotations/sections/opening-hous-section';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CampScheduleEntry,
} from '@/features/map/types/types';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const shareLocationError: StaticTranslationString = {
  de: 'Dein Gerät unterstützt die Web Share API nicht.',
  en: 'Your device does not support the web share api.',
  fr: "Votre appareil ne prend pas en charge l'API de partage web.",
};

const shareLocationCallback = async (
  locale: Locale,
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon,
): Promise<void> => {
  const data: ShareData = {
    url: environmentVariables.NEXT_PUBLIC_APP_HOST_URL + '/app/map?locationId=' + annotation.id,
    title: 'conveniat27 - ' + annotation.title,
    text: annotation.title,
  };
  try {
    await navigator.share(data);
  } catch {
    console.error(shareLocationError[locale]);
  }
};

const snapPoints = [20, 50, 80]; // Snap points in vh
const CLOSE_THRESHOLD = 15; // If height is less than 15vh on release, close the drawer

export const AnnotationDetailsDrawer: React.FC<{
  closeDrawer: () => void;
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon;
  schedule: CampScheduleEntry[] | undefined;
  locale: Locale;
}> = ({ closeDrawer, annotation, schedule, locale }) => {
  const [drawerHeight, setDrawerHeight] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const drawerReference = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (mouseEvent: MouseEvent) => {
      if (!isResizing || !drawerReference.current) return;

      const newHeightVh = ((window.innerHeight - mouseEvent.clientY) / window.innerHeight) * 100;
      const clampedHeight = Math.max(0, Math.min(90, newHeightVh));
      setDrawerHeight(clampedHeight);
    },
    [isResizing],
  );

  const handleTouchStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!isResizing || !drawerReference.current) return;

      const newHeightVh =
        ((window.innerHeight - (event.touches[0]?.clientY ?? 0)) / window.innerHeight) * 100;
      const clampedHeight = Math.max(0, Math.min(90, newHeightVh));
      setDrawerHeight(clampedHeight);
    },
    [isResizing],
  );

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setDrawerHeight((currentHeight) => {
      if (currentHeight < CLOSE_THRESHOLD) {
        closeDrawer();
        return 0;
      }

      // Find the closest snap point
      return snapPoints.reduce((previous, current) =>
        Math.abs(current - currentHeight) < Math.abs(previous - currentHeight) ? current : previous,
      );
    });
  }, [closeDrawer]);

  useEffect(() => {
    if (isResizing) {
      globalThis.addEventListener('mousemove', handleMouseMove);
      globalThis.addEventListener('mouseup', handleResizeEnd);
      globalThis.addEventListener('touchmove', handleTouchMove, { passive: false });
      globalThis.addEventListener('touchend', handleResizeEnd);
    } else {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mouseup', handleResizeEnd);
      globalThis.removeEventListener('touchmove', handleTouchMove);
      globalThis.removeEventListener('touchend', handleResizeEnd);
    }

    return (): void => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mouseup', handleResizeEnd);
      globalThis.removeEventListener('touchmove', handleTouchMove);
      globalThis.removeEventListener('touchend', handleResizeEnd);
    };
  }, [isResizing, handleMouseMove, handleTouchMove, handleResizeEnd]);

  // If drawer is closed (height 0), don't render it
  if (drawerHeight === 0) {
    return;
  }

  return (
    <div
      ref={drawerReference}
      className="fixed right-0 bottom-[80px] left-0 z-[999] overflow-hidden rounded-t-2xl bg-white shadow-[0px_-4px_38px_-19px_rgba(1,1,1,0.5)] xl:left-[480px]"
      style={{ height: `${drawerHeight}vh` }}
    >
      <div
        className="flex h-full flex-col overflow-y-auto px-4 pt-4 select-none"
        onDragStart={(event) => event.preventDefault()}
      >
        <div className="relative">
          <div
            className="sticky top-0 border-b-2 border-gray-100 bg-white pt-4"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className="absolute top-[-16px] right-0 left-0 z-30 flex h-4 cursor-ns-resize items-center justify-center bg-white">
              <div className="h-1 w-20 rounded-full bg-gray-300"></div>
            </div>

            <AnnotationDrawerHeader
              closeDrawer={closeDrawer}
              annotation={annotation}
              locale={locale}
              shareLocationCallback={shareLocationCallback}
            />
          </div>

          <AnnotationDescriptionSection
            description={annotation.description as SerializedEditorState}
          />

          <AnnotationOpeningHoursSection openingHours={annotation.openingHours} />

          <AnnotationImagesSection images={annotation.images} locale={locale} />

          {schedule && <AnnotationScheduleTableComponent locale={locale} schedule={schedule} />}

          <AnnotationForumAndReportSection />
        </div>
      </div>
    </div>
  );
};
