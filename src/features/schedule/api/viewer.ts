import { LEADER_NOTES_CONTEXT } from '@/features/payload-cms/payload-cms/collections/camp-schedule-entry-collection';
import type { HofQuartier } from '@/features/payload-cms/payload-cms/utils/hof-directory';
import { getHofDirectory } from '@/features/payload-cms/payload-cms/utils/hof-directory';
import { toHofIds } from '@/features/payload-cms/payload-cms/utils/hof-membership';
import { isLeader as isLeaderIn } from '@/features/payload-cms/payload-cms/utils/is-leader';
import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import { readFeatureFlag } from '@/lib/read-feature-flags';
import type { Locale } from '@/types/types';
import config from '@payload-config';
import { getPayload } from 'payload';

interface Viewer {
  uuid: string;
  group_ids?: number[];
}

export type ViewerQuartier = HofQuartier;

/**
 * The Quartiere of the logged-in user, through the Höfe of their registration. Empty for a
 * guest, for somebody without a Hof and while the camp keeps the allocation to itself, so the
 * programme then simply shows the whole camp.
 */
export const getQuartiereOfViewer = async (viewer?: Viewer): Promise<ViewerQuartier[]> => {
  if (viewer === undefined) return [];
  if (await readFeatureFlag('hideHofAndQuartier')) return [];

  const payload = await getPayload({ config });
  const [user, directory] = await Promise.all([
    payload.findByID({
      collection: 'users',
      id: viewer.uuid,
      depth: 0,
      select: { hoefe: true },
      disableErrors: true,
    }),
    getHofDirectory(payload),
  ]);

  const quartiere = new Map<string, ViewerQuartier>();
  for (const hofId of toHofIds(user?.hoefe)) {
    const quartier = directory.get(hofId)?.quartier;
    if (quartier !== undefined) quartiere.set(quartier.id, quartier);
  }
  return [...quartiere.values()];
};

/** Who reads the part of a block for Leitende, see `isLeader` in payload-cms. */
export const isLeader = async (viewer: Viewer): Promise<boolean> =>
  isLeaderIn(await getPayload({ config }), viewer);

export type LeaderNotes = NonNullable<CampScheduleEntry['leaders']>;

/**
 * Material list, safety notes and attachments of one block, or `undefined` for somebody who is
 * not a leader and for a block that has none.
 */
export const getLeaderNotesOfEntry = async (
  viewer: Viewer,
  id: string,
  locale: Locale,
): Promise<LeaderNotes | undefined> => {
  if (!(await isLeader(viewer))) return undefined;

  const payload = await getPayload({ config });
  const entry = await payload.findByID({
    collection: 'camp-schedule-entry',
    id,
    depth: 1,
    locale,
    fallbackLocale: 'de',
    select: { leaders: true },
    context: { [LEADER_NOTES_CONTEXT]: true },
    disableErrors: true,
  });
  return entry?.leaders ?? undefined;
};
