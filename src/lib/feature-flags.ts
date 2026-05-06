export const FEATURE_FLAG_SEND_MESSAGES = 'send_messages';
export const FEATURE_FLAG_CREATE_CHATS_ENABLED = 'create_chats_enabled';
export const FEATURE_FLAG_HELPER_SHIFTS_ENABLED = 'helper_shifts_enabled';
export const FEATURE_FLAG_IMAGE_UPLOAD_ENABLED = 'image_upload_enabled';
export const FEATURE_FLAG_RESERVATIONS_ENABLED = 'reservations_enabled';

export const FEATURE_FLAG_DEFAULTS: Record<string, boolean> = {
  [FEATURE_FLAG_SEND_MESSAGES]: true,
  [FEATURE_FLAG_CREATE_CHATS_ENABLED]: true,
  [FEATURE_FLAG_HELPER_SHIFTS_ENABLED]: true,
  [FEATURE_FLAG_IMAGE_UPLOAD_ENABLED]: true,
  [FEATURE_FLAG_RESERVATIONS_ENABLED]: true,
};
