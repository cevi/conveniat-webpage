import { environmentVariables } from '@/config/environment-variables';
import { Hitobito } from '@/features/registration_process/hitobito-api/hitobito';
import type { Logger } from '@/features/registration_process/hitobito-api/types';
import type { Payload } from 'payload';

export const HITOBITO_CONFIG = {
  baseUrl: environmentVariables.NEXT_PUBLIC_HITOBITO_API_URL ?? '',
  frontendUrl: environmentVariables.NEXT_PUBLIC_HITOBITO_API_URL ?? '',
  apiToken: environmentVariables.API_TOKEN,
  supportGroupId: environmentVariables.NEXT_PUBLIC_SUPPORT_GROUP_ID ?? '',
  helperGroupId: environmentVariables.HELPER_GROUP,
  eventId: environmentVariables.EVENT_ID,
};

export const EXTERNAL_ROLE_TYPE = 'Group::MitgliederorganisationExterne::Externer';

export async function getHitobito(payload: Payload, logger?: Logger): Promise<Hitobito> {
  const global = await payload.findGlobal({
    slug: 'registration-management',
    context: { internal: true },
  });
  const cookieValue: unknown = global.browserCookie;
  const browserCookie =
    typeof cookieValue === 'string' && cookieValue.length > 0 ? cookieValue : '';

  if (browserCookie.length === 0) {
    throw new Error(
      'No browser cookie found, please set the browser cookie in the registration management global',
    );
  }

  return Hitobito.create(
    {
      ...HITOBITO_CONFIG,
      browserCookie,
    },
    logger,
  );
}
