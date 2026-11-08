'use client';

import { useConfig, useLocale } from '@payloadcms/ui';
import { useEffect, useState } from 'react';

export interface StoryLink {
  collection: 'story-events' | 'story-challenges';
  id: string;
  title: string;
  visibleFrom: string | undefined;
}

/** Which story entries point at a document, and through which field. */
const queriesFor = (
  collectionSlug: string,
): { collection: StoryLink['collection']; field: string }[] => {
  if (collectionSlug === 'camp-schedule-entry') {
    return [
      { collection: 'story-events', field: 'scheduleEntries' },
      { collection: 'story-challenges', field: 'scheduleEntries' },
    ];
  }
  if (collectionSlug === 'story-figures') {
    return [
      { collection: 'story-events', field: 'figures' },
      { collection: 'story-challenges', field: 'from' },
    ];
  }
  return [];
};

const loadLinks = async (
  apiRoute: string,
  collectionSlug: string,
  id: string,
  locale: string,
  signal: AbortSignal,
): Promise<StoryLink[]> => {
  const results = await Promise.all(
    queriesFor(collectionSlug).map(async ({ collection, field }) => {
      const parameters = new URLSearchParams({
        [`where[${field}][in]`]: id,
        depth: '0',
        limit: '50',
        locale,
        'select[title]': 'true',
        'select[visibleFrom]': 'true',
        sort: 'visibleFrom',
      });
      const response = await fetch(`${apiRoute}/${collection}?${parameters.toString()}`, {
        credentials: 'include',
        signal,
      });
      // somebody who may edit the block but not read the story sees no links
      if (!response.ok) return [];
      const body = (await response.json()) as {
        docs?: { id: string; title?: string; visibleFrom?: string }[];
      };
      return (body.docs ?? []).map((document): StoryLink => ({
        collection,
        id: document.id,
        title: document.title ?? document.id,
        visibleFrom: document.visibleFrom,
      }));
    }),
  );
  return results.flat();
};

/**
 * The Ereignisse and Challenges that link to the document being edited, read through the REST
 * API with the editor's own rights. Asked once when the document opens, not with every change
 * of the form, which a server-rendered field would do.
 */
export const useStoryLinks = (
  collectionSlug: string | undefined,
  id: string | number | undefined,
): { links: StoryLink[]; isLoading: boolean } => {
  const { config } = useConfig();
  const { code: locale } = useLocale();
  const apiRoute = `${config.serverURL}${config.routes.api}`;
  const key =
    collectionSlug === undefined || id === undefined
      ? undefined
      : `${collectionSlug}/${String(id)}/${locale}`;
  const [result, setResult] = useState<{ key: string; links: StoryLink[] }>();

  useEffect(() => {
    if (key === undefined || collectionSlug === undefined || id === undefined) return;
    const controller = new AbortController();
    loadLinks(apiRoute, collectionSlug, String(id), locale, controller.signal)
      .then((links) => setResult({ key, links }))
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, links: [] });
      });
    return (): void => controller.abort();
  }, [apiRoute, collectionSlug, id, key, locale]);

  if (key === undefined) return { links: [], isLoading: false };
  return { links: result?.key === key ? result.links : [], isLoading: result?.key !== key };
};
