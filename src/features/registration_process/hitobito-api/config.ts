/* eslint-disable n/no-process-env */
export const HITOBITO_CONFIG = {
  baseUrl: process.env['HITOBITO_API_URL'] ?? 'http://localhost:7000',
  frontendUrl: process.env['HITOBITO_API_URL'] ?? 'http://localhost:7000',
  apiToken: process.env['API_TOKEN'] ?? '',
  browserCookie: process.env['BROWSER_COOKIE'] ?? '',
  supportGroupId: process.env['SUPPORT_GROUP_ID'] ?? '581',
  helperGroupId: process.env['HELPER_GROUP'] ?? '580',
  eventId: process.env['EVENT_ID'] ?? '1293',
};

export const EXTERNAL_ROLE_TYPE = 'Group::MitgliederorganisationExterne::Externer';
