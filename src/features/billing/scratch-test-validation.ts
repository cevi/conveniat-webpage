/* eslint-disable n/no-process-env */
import { getPayload } from 'payload';
import config from '@/features/payload-cms/payload.config';
import { HitobitoClient } from '@/features/registration_process/hitobito-api/client';

async function run(): Promise<void> {
  const payload = await getPayload({ config });
  
  const client = new HitobitoClient({
    baseUrl: 'https://db.cevi.ch',
    apiToken: process.env['HITOBITO_API_TOKEN'] ?? '',
    browserCookie: process.env['HITOBITO_BROWSER_COOKIE'] ?? '',
  }, payload.logger);

  console.log('Fetching event 5430 details...');
  const response = await client.apiRequest('GET', '/api/events/5430');
  console.log('Event details:', JSON.stringify(response, undefined, 2));

  console.log('Fetching event_participations for 5430...');
  const partResponse = await client.apiRequest('GET', '/api/event_participations?filter[event_id][eq]=5430');
  console.log('Participations:', JSON.stringify(partResponse, undefined, 2));
}

try {
  await run();
} catch (error: unknown) {
  console.error(error);
}
