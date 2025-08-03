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
import type React from 'react';

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

export const AnnotationDetailsDrawer: React.FC<{
  closeDrawer: () => void;
  annotation: CampMapAnnotationPoint | CampMapAnnotationPolygon;
  schedule: CampScheduleEntry[] | undefined;
  locale: Locale;
}> = ({ closeDrawer, annotation, schedule, locale }) => {
  return (
    <div className="fixed right-0 bottom-[80px] left-0 z-[999] h-[50vh] overflow-hidden rounded-t-2xl bg-white shadow-[0px_-4px_38px_-19px_rgba(1,1,1,0.5)] xl:left-[480px]">
      <div className="flex h-full flex-col overflow-y-auto px-4">
        <div className="relative">
          <AnnotationDrawerHeader
            closeDrawer={closeDrawer}
            annotation={annotation}
            locale={locale}
            shareLocationCallback={shareLocationCallback}
          />

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
