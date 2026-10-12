import {
  EDITOR_ROLES,
  hasAccessToThisUser,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { LEADER_NOTES_CONTEXT } from '@/features/payload-cms/payload-cms/collections/camp-schedule-entry-collection';
import { getHofDirectory } from '@/features/payload-cms/payload-cms/utils/hof-directory';
import {
  hasLeadingRegistration,
  toHofIds,
} from '@/features/payload-cms/payload-cms/utils/hof-membership';
import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import { getFeatureFlag } from '@/lib/db/redis';
import { FEATURE_HIDE_HOF_AND_QUARTIER } from '@/lib/feature-flags';
import type { Locale } from '@/types/types';
import config from '@payload-config';
import { getPayload } from 'payload';

interface Viewer {
  uuid: string;
  group_ids?: number[];
}

export interface ViewerQuartier {
  id: string;
  name: string;
}

/**
 * The Quartiere of the logged-in user, through the Höfe of their registration. Empty for a
 * guest, for somebody without a Hof and while the camp keeps the allocation to itself, so the
 * programme then simply shows the whole camp.
 */
export const getQuartiereOfViewer = async (viewer?: Viewer): Promise<ViewerQuartier[]> => {
  if (viewer === undefined) return [];
  if (await getFeatureFlag(FEATURE_HIDE_HOF_AND_QUARTIER)) return [];

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

/**
 * Who gets to read what a block holds for the people running it: whoever comes to the camp to
 * lead or help, by their registration in Cevi.DB, and the editors who write it.
 */
const isLeader = async (viewer: Viewer): Promise<boolean> => {
  if (hasAccessToThisUser({ user: viewer, requiredRoles: EDITOR_ROLES })) return true;

  const payload = await getPayload({ config });
  const user = await payload.findByID({
    collection: 'users',
    id: viewer.uuid,
    depth: 0,
    select: { cevi_db_uuid: true },
    disableErrors: true,
  });
  const ceviId = user?.cevi_db_uuid;
  return typeof ceviId === 'number' && (await hasLeadingRegistration(payload, ceviId));
};

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
