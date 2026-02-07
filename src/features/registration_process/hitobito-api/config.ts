import { environmentVariables } from '@/config/environment-variables';
export const HITOBITO_CONFIG = {
  baseUrl: environmentVariables.HITOBITO_API_URL,
  frontendUrl: environmentVariables.HITOBITO_API_URL,
  apiToken: environmentVariables.API_TOKEN,
  browserCookie: environmentVariables.BROWSER_COOKIE,
  supportGroupId: environmentVariables.SUPPORT_GROUP_ID,
  helperGroupId: environmentVariables.HELPER_GROUP,
  eventId: environmentVariables.EVENT_ID,
};

export const EXTERNAL_ROLE_TYPE = 'Group::MitgliederorganisationExterne::Externer';
