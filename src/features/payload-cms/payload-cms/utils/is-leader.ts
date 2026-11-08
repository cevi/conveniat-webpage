import {
  EDITOR_ROLES,
  hasAccessToThisUser,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { hasLeadingRegistration } from '@/features/payload-cms/payload-cms/utils/hof-membership';
import type { Payload } from 'payload';

/** Who is asking: the session user, or the Payload user's id and groups. */
export interface LeaderViewer {
  uuid: string;
  group_ids?: number[];
}

/**
 * Who reads what the camp writes for Leitende, like the part of a block for the people running
 * it or the story: whoever comes to the camp to lead or help, by their registration in Cevi.DB,
 * and the editors who write it. Takes the Payload instance, so access rules of a collection can
 * call it without importing the config they are part of.
 */
export const isLeader = async (payload: Payload, viewer: LeaderViewer): Promise<boolean> => {
  if (hasAccessToThisUser({ user: viewer, requiredRoles: EDITOR_ROLES })) return true;

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
