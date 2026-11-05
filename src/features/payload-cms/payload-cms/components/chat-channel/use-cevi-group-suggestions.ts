'use client';

import type { CeviGroupSuggestion } from '@/features/payload-cms/payload-cms/chat-channels/channel-endpoints';
import { useChannelApiPath } from '@/features/payload-cms/payload-cms/components/chat-channel/use-channel-api-path';
import { useEffect, useState } from 'react';

/** One request per collection: every row of the group list shares the same suggestions. */
const pending = new Map<string, Promise<CeviGroupSuggestion[]>>();

const loadSuggestions = (channelApiPath: string): Promise<CeviGroupSuggestion[]> => {
  const known = pending.get(channelApiPath);
  if (known !== undefined) return known;
  const loading = fetch(`${channelApiPath}/group-suggestions`, {
    credentials: 'include',
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      return response.json();
    })
    .then((result: { groups?: CeviGroupSuggestion[] }) => result.groups ?? [])
    .catch((): CeviGroupSuggestion[] => {
      // the picker still takes a typed-in ID; the next picker that mounts asks again
      pending.delete(channelApiPath);
      return [];
    });
  pending.set(channelApiPath, loading);
  return loading;
};

/** The Cevi.DB groups the camp knows of, loaded once for the page. */
export const useCeviGroupSuggestions = (): {
  groups: CeviGroupSuggestion[];
  isLoading: boolean;
} => {
  const channelApiPath = useChannelApiPath();
  const [groups, setGroups] = useState<CeviGroupSuggestion[] | undefined>();

  useEffect(() => {
    if (channelApiPath === undefined) return;
    let active = true;
    void loadSuggestions(channelApiPath).then((loaded) => {
      if (active) setGroups(loaded);
    });
    return (): void => {
      active = false;
    };
  }, [channelApiPath]);

  if (channelApiPath === undefined) return { groups: [], isLoading: false };
  return { groups: groups ?? [], isLoading: groups === undefined };
};
