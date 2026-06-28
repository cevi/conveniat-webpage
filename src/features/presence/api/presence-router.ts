import { updatePresence } from '@/features/presence/api/mutations/update-presence';
import { getPresence } from '@/features/presence/api/queries/get-presence';
import { createTRPCRouter } from '@/trpc/init';

export const presenceRouter = createTRPCRouter({
  getPresence,
  updatePresence,
});
