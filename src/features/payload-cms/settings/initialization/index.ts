import type { Payload } from 'payload';
import { seedDatabase } from '@/features/payload-cms/settings/initialization/seeding';

/**
 * This function is called when the Payload server has started.
 * @param payload The Payload instance
 */
export const onPayloadInit = async (payload: Payload): Promise<void> => {
  console.log('\n########################\n# Run onPayloadInit...\n########################\n');
  await seedDatabase(payload);
};
