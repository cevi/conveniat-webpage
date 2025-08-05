import { environmentVariables } from '@/config/environment-variables';
import prisma from '@/features/chat/database';
import { deleteDatabase } from '@/features/payload-cms/payload-cms/initialization/deleting';
import { seedDatabase } from '@/features/payload-cms/payload-cms/initialization/seeding';
import type { Payload } from 'payload';

/**
 * This function is called when the Payload server has started.
 * @param payload The Payload instance
 */
export const onPayloadInit = async (payload: Payload): Promise<void> => {
  console.log('\n########################\n# Run onPayloadInit...\n########################\n');

  if (environmentVariables.NODE_ENV === 'development') {
    console.log(environmentVariables);
  }

  await seedDatabase(payload).catch(console.error);
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
