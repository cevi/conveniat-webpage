import { updatePresence } from '@/features/presence/api/mutations/update-presence';
import { getPresence } from '@/features/presence/api/queries/get-presence';
import { getPresenceDensityData } from '@/features/presence/api/queries/get-presence-density-data';
import { listPresentUsers } from '@/features/presence/api/queries/list-present-users';
import { createTRPCRouter } from '@/trpc/init';

export const presenceRouter = createTRPCRouter({
  getPresence,
  updatePresence,
  listPresentUsers,
  getPresenceDensityData,
});
