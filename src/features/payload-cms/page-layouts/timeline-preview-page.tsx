import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { TimelineEntry } from '@/features/payload-cms/components/content-blocks/timeline-entry';
import { SectionErrorBoundary } from '@/features/payload-cms/converters/page-sections/section-error-boundary';
import type { Timeline } from '@/features/payload-cms/payload-types';
import type { LocalizedCollectionPage, StaticTranslationString } from '@/types/types';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import React from 'react';

const pageTitle: StaticTranslationString = {
  en: 'Preview of a timeline entry',
  de: 'Vorschau eines Zeitstrahl-Eintrags',
  fr: 'Aperçu d’une entrée de la chronologie',
};

export const TimelinePreviewPage: React.FC<LocalizedCollectionPage> = async ({
  slugs,
  locale,
  renderInPreviewMode,
}) => {
  return await withSpan('TimelinePreviewPage', async () => {
    // we use this page only for a preview of the news entry
    if (!renderInPreviewMode) notFound();
    if (slugs.length === 0) return notFound();

    const uuid = slugs[0];
    const payload = await getPayload({ config });
    const timeLineItems = await payload.find({
      collection: 'timeline',
      locale: locale,
      pagination: false,
      sort: '-date',
      draft: renderInPreviewMode,
      where: {
        id: { equals: uuid },
      },
    });

    return (
      <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
        <HeadlineH1>{pageTitle[locale]}</HeadlineH1>
        {timeLineItems.docs.map((item: Timeline) => {
          const missingFields: string[] = [];
          if (!item.title) missingFields.push('Title');
          if (!item.date) missingFields.push('Date');
          if (!item.mainContent) missingFields.push('Main Content');

          if (missingFields.length > 0) {
            const missingFieldsText = missingFields.join(', ');
            const missingFieldsMessage: StaticTranslationString = {
              de: `Fehlende Pflichtfelder: ${missingFieldsText}`,
              en: `Missing required fields: ${missingFieldsText}`,
              fr: `Champs obligatoires manquants : ${missingFieldsText}`,
            };

            const errorTitle: StaticTranslationString = {
              de: 'Timeline Eintrag: Inhalt unvollständig',
              en: 'Timeline Entry: Content Incomplete',
              fr: 'Entrée chronologique : Contenu incomplet',
            };

            return (
              <div className="my-8" key={item.id}>
                <SectionErrorBoundary
                  locale={locale}
                  errorFallbackMessage="Incomplete Content"
                  isDraftMode={renderInPreviewMode}
                  forceError={new Error(missingFieldsMessage[locale])}
                  errorTitle={errorTitle[locale]}
                >
                  <></>
                </SectionErrorBoundary>
              </div>
            );
          }

          return (
            <React.Fragment key={item.id}>
              <TimelineEntry timeline={item} locale={locale} />
            </React.Fragment>
          );
        })}
      </article>
    );
  });
};
