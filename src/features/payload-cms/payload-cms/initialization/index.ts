import type { Payload } from 'payload';
import { seedDatabase } from '@/features/payload-cms/payload-cms/initialization/seeding';
import { environmentVariables } from '@/config/environment-variables';

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
