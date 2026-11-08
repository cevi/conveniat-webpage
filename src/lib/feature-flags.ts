export const FEATURE_FLAG_SEND_MESSAGES = 'send_messages';
export const FEATURE_FLAG_CREATE_CHATS_ENABLED = 'create_chats_enabled';
export const FEATURE_FLAG_HELPER_SHIFTS_ENABLED = 'helper_shifts_enabled';
export const FEATURE_FLAG_IMAGE_UPLOAD_ENABLED = 'image_upload_enabled';
export const FEATURE_FLAG_PHOTO_CONTEST_ENABLED = 'photo_contest_enabled';
export const FEATURE_FLAG_RESERVATIONS_ENABLED = 'reservations_enabled';
export const FEATURE_HIDE_HOF_AND_QUARTIER = 'hide_hof_and_quartier';
export const FEATURE_FLAG_FORUM_ENABLED = 'forum_enabled';
/** new forum posts stay with their author and the moderators until one of them approves */
export const FEATURE_FLAG_FORUM_MODERATION = 'forum_moderation_required';
export const FEATURE_FLAG_HIDE_FULL_HELPER_SHIFTS = 'hide_full_helper_shifts';
export const FEATURE_FLAG_RESTRICT_CONTACT_LIST = 'restrict_contact_list';
/** voice calls in one-to-one chats, a prototype: off until a deployment switches it on */
export const FEATURE_FLAG_VOICE_CALLS_ENABLED = 'voice_calls_enabled';

export const FEATURE_FLAG_DEFAULTS: Record<string, boolean> = {
  [FEATURE_FLAG_SEND_MESSAGES]: true,
  [FEATURE_FLAG_CREATE_CHATS_ENABLED]: true,
  [FEATURE_FLAG_HELPER_SHIFTS_ENABLED]: true,
  [FEATURE_FLAG_IMAGE_UPLOAD_ENABLED]: true,
  [FEATURE_FLAG_PHOTO_CONTEST_ENABLED]: true,
  [FEATURE_FLAG_RESERVATIONS_ENABLED]: true,
  [FEATURE_HIDE_HOF_AND_QUARTIER]: false,
  [FEATURE_FLAG_FORUM_ENABLED]: true,
  [FEATURE_FLAG_FORUM_MODERATION]: false,
  [FEATURE_FLAG_HIDE_FULL_HELPER_SHIFTS]: true,
  [FEATURE_FLAG_RESTRICT_CONTACT_LIST]: true,
  [FEATURE_FLAG_VOICE_CALLS_ENABLED]: false,
};
