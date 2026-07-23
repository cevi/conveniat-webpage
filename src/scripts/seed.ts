/* eslint-disable unicorn/no-process-exit */
import { deleteEverything } from '@/features/payload-cms/payload-cms/initialization';
import { seedDatabase } from '@/features/payload-cms/payload-cms/initialization/seeding';
import configPromise from '@/features/payload-cms/payload.config';
import { getPayload } from 'payload';

const forceReset = process.argv.includes('--reset') || process.argv.includes('--force');

console.log('Initializing Payload...');
const config = await configPromise;
const payload = await getPayload({ config });

if (forceReset) {
  console.log('Reset flag detected. Clearing existing database...');
  await deleteEverything(payload);
}

console.log('Running seedDatabase...');
await seedDatabase(payload);
console.log('Seeding finished successfully!');
process.exit(0);
