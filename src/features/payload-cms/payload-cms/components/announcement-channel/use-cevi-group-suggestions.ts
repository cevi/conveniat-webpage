'use client';

import type { CeviGroupSuggestion } from '@/features/payload-cms/payload-cms/endpoints/announcement-channel-audience';
import { useConfig } from '@payloadcms/ui';
import { useEffect, useState } from 'react';

/** One request per page: every row of the group list shares the same suggestions. */
let pending: Promise<CeviGroupSuggestion[]> | undefined;

const loadSuggestions = (apiRoute: string): Promise<CeviGroupSuggestion[]> => {
  pending ??= fetch(`${apiRoute}/announcement-channels/group-suggestions`, {
    credentials: 'include',
  })
    .then((response) => (response.ok ? response.json() : { groups: [] }))
    .then((result: { groups?: CeviGroupSuggestion[] }) => result.groups ?? [])
    .catch((): CeviGroupSuggestion[] => {
      // the picker still takes a typed-in ID; the next row tries again
      pending = undefined;
      return [];
    });
  return pending;
};

/** The Cevi.DB groups the camp knows of, loaded once for the page. */
export const useCeviGroupSuggestions = (): {
  groups: CeviGroupSuggestion[];
  isLoading: boolean;
} => {
  const { config } = useConfig();
  const apiRoute = `${config.serverURL}${config.routes.api}`;
  const [groups, setGroups] = useState<CeviGroupSuggestion[] | undefined>();

  useEffect(() => {
    let active = true;
    void loadSuggestions(apiRoute).then((loaded) => {
      if (active) setGroups(loaded);
    });
    return (): void => {
      active = false;
    };
  }, [apiRoute]);

  return { groups: groups ?? [], isLoading: groups === undefined };
};
