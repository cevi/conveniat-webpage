import { getMaxGroupMembers } from '@/features/chat/api/checks/assert-group-size';
import { trpcBaseProcedure } from '@/trpc/init';

/**
 * The most members, the creator included, a group created by a participant may have. Lets the
 * pickers stop at the limit instead of sending a selection the server refuses.
 */
export const getGroupMemberLimit = trpcBaseProcedure.query(async (): Promise<number> =>
  getMaxGroupMembers(),
);
