import { environmentVariables } from '@/config/environment-variables';
import { isEditor } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import { StoryBoard } from '@/features/story/payload-cms/components/story-board';
import { buildStoryBoard } from '@/features/story/payload-cms/story-board-data';
import type { Locale, StaticTranslationString } from '@/types/types';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Banner, Gutter, SetStepNav } from '@payloadcms/ui';
import { redirect } from 'next/navigation';
import type { AdminViewServerProps } from 'payload';
import type React from 'react';

const title: StaticTranslationString = {
  de: 'Story-Board',
  en: 'Story board',
  fr: 'Story-Board',
};

const intro: StaticTranslationString = {
  de: 'Die ganze Lagerwoche der Story auf einer Seite. Jede Karte öffnet sich zum Bearbeiten, «+» legt für diesen Tag etwas an. Leitende sehen in der App nur, was zum gewählten Zeitpunkt schon sichtbar ist.',
  en: 'The whole camp week of the story on one page. Every card opens for editing, “+” adds something for that day. Leitende only see in the app what is visible at the chosen moment.',
  fr: 'Toute la semaine de l’histoire sur une page. Chaque carte s’ouvre pour l’édition, « + » ajoute un élément pour ce jour.',
};

const disabledWarning: StaticTranslationString = {
  de: 'FEATURE_ENABLE_STORY ist auf dieser Instanz aus: die App zeigt die Story noch nicht.',
  en: 'FEATURE_ENABLE_STORY is off on this instance: the app does not show the story yet.',
  fr: 'FEATURE_ENABLE_STORY est désactivé sur cette instance : l’app n’affiche pas encore l’histoire.',
};

/** The moment the board shows, from `?asOf=`, or now. */
const asOfFrom = (searchParameters: AdminViewServerProps['searchParams']): Date => {
  const value = searchParameters?.['asOf'];
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text === 'string' && text !== '') {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
};

/**
 * Admin view at `/admin/story-board`, where the story team works: the week in columns, each card
 * a document of the story collections, edited in Payload's own drawer. Editors only, the same
 * people who may read the story collections.
 */
export default async function StoryBoardView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps): Promise<React.ReactElement> {
  const { req, permissions, visibleEntities, locale: adminLocale } = initPageResult;
  const { payload, i18n, user } = req;
  if (!isEditor({ req })) redirect(payload.config.routes.admin);
  const locale = getAdminLocale(i18n);
  const contentLocale = (adminLocale?.code ?? 'de') as Locale;
  const asOf = asOfFrom(searchParams);

  const read = {
    depth: 0,
    locale: contentLocale,
    fallbackLocale: 'de',
    overrideAccess: false,
    user,
  } as const;
  const storyCategories = await payload.find({
    collection: 'camp-categories',
    where: { isStory: { equals: true } },
    select: { title: true },
    ...read,
    overrideAccess: true,
    limit: 0,
    pagination: false,
  });
  const storyCategoryIds = storyCategories.docs.map((category) => category.id);

  const [events, figures, challenges, blocks] = await Promise.all([
    payload.find({ collection: 'story-events', ...read, limit: 0, pagination: false }),
    payload.find({ collection: 'story-figures', ...read, limit: 0, pagination: false }),
    payload.find({ collection: 'story-challenges', ...read, limit: 0, pagination: false }),
    storyCategoryIds.length === 0
      ? { docs: [] }
      : payload.find({
          collection: 'camp-schedule-entry',
          where: { category: { in: storyCategoryIds } },
          select: { title: true, timeslot: true },
          ...read,
          overrideAccess: true,
          limit: 0,
          pagination: false,
        }),
  ]);

  const columns = buildStoryBoard({
    events: events.docs,
    figures: figures.docs,
    challenges: challenges.docs,
    blocks: blocks.docs,
    asOf,
  });

  return (
    <DefaultTemplate
      i18n={i18n}
      {...(adminLocale === undefined ? {} : { locale: adminLocale })}
      {...(params === undefined ? {} : { params })}
      payload={payload}
      permissions={permissions}
      {...(searchParams === undefined ? {} : { searchParams })}
      {...(user ? { user } : {})}
      visibleEntities={visibleEntities}
    >
      <SetStepNav nav={[{ label: title[locale] }]} />
      <Gutter className="flex flex-col pt-8 pb-16">
        <h1 className="mb-1 text-3xl font-bold">{title[locale]}</h1>
        <p className="mb-4 max-w-3xl text-(--theme-elevation-600)">{intro[locale]}</p>
        {!environmentVariables.FEATURE_ENABLE_STORY && (
          <Banner type="info">{disabledWarning[locale]}</Banner>
        )}
        <StoryBoard
          columns={columns}
          locale={locale}
          asOf={asOf.toISOString()}
          hasStoryCategory={storyCategoryIds.length > 0}
          categoriesHref={`${payload.config.routes.admin}/collections/camp-categories`}
        />
      </Gutter>
    </DefaultTemplate>
  );
}
