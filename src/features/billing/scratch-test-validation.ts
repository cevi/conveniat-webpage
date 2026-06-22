/* eslint-disable n/no-process-env */
import config from '@/features/payload-cms/payload.config';
import { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import { getPayload } from 'payload';

async function run(): Promise<void> {
  const payload = await getPayload({ config });

  const client = new HitobitoClient(
    {
      baseUrl: 'https://db.cevi.ch',
      apiToken: process.env['API_TOKEN'] ?? '',
      browserCookie: process.env['HITOBITO_BROWSER_COOKIE'] ?? '',
    },
    payload.logger,
  );

  console.log('Fetching event_participation 107862 (Max Muster) via new JSON API...');
  try {
    const response = await client.apiRequest('GET', '/api/event_participations/107862');
    console.log('Participation details:', JSON.stringify(response, undefined, 2));
  } catch (error) {
    console.error('Failed to fetch via API:', error);
  }
}

try {
  await run();
} catch (error: unknown) {
  console.error(error);
}
