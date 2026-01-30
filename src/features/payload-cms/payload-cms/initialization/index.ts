import { deleteDatabase } from '@/features/payload-cms/payload-cms/initialization/deleting';
import { ensureIndexes } from '@/features/payload-cms/payload-cms/initialization/ensure-indexes';
import { seedDatabase } from '@/features/payload-cms/payload-cms/initialization/seeding';
import prisma from '@/lib/database';
import { withSpan } from '@/utils/tracing-helpers';
import type { Payload } from 'payload';

/**
 * This function is called when the Payload server has started.
 * @param payload The Payload instance
 */
export const onPayloadInit = async (payload: Payload): Promise<void> => {
  await withSpan('payload.init.seed', async () => {
    await seedDatabase(payload);
    console.log('Seeding complete.');
  }).catch(console.error);

  await withSpan('payload.init.ensureIndexes', async () => {
    await ensureIndexes(payload);
  }).catch(console.error);
};

export const deleteEverything = async (payload: Payload): Promise<void> => {
  console.log('########################\n# Deleting everything...\n########################\n');

  await deleteDatabase(payload).catch(console.error);

  await prisma
    .$transaction([
      prisma.messageEvent.deleteMany(),
      prisma.message.deleteMany(),
      prisma.chatMembership.deleteMany(),
      prisma.chat.deleteMany(),
      prisma.user.deleteMany(),
    ])
    .catch(console.error);

  console.log('Done.');
};
