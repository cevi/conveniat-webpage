export const FEATURE_FLAG_SEND_MESSAGES = 'send_messages';
export const FEATURE_FLAG_CREATE_CHATS_ENABLED = 'create_chats_enabled';
export const FEATURE_FLAG_HELPER_SHIFTS_ENABLED = 'helper_shifts_enabled';
export const FEATURE_FLAG_IMAGE_UPLOAD_ENABLED = 'image_upload_enabled';
export const FEATURE_FLAG_PHOTO_CONTEST_ENABLED = 'photo_contest_enabled';
export const FEATURE_FLAG_RESERVATIONS_ENABLED = 'reservations_enabled';
export const FEATURE_HIDE_HOF_AND_QUARTIER = 'hide_hof_and_quartier';
export const FEATURE_FLAG_CHECK_HITOBITO_APPROVALS_ENABLED = 'check_hitobito_approvals_enabled';
export const FEATURE_FLAG_FORUM_ENABLED = 'forum_enabled';
export const FEATURE_FLAG_REDESIGNED_MAIN_MENU_ENABLED = 'redesigned_main_menu_enabled';
export const FEATURE_FLAG_HIDE_FULL_HELPER_SHIFTS = 'hide_full_helper_shifts';

export const FEATURE_FLAG_DEFAULTS: Record<string, boolean> = {
  [FEATURE_FLAG_SEND_MESSAGES]: true,
  [FEATURE_FLAG_CREATE_CHATS_ENABLED]: true,
  [FEATURE_FLAG_HELPER_SHIFTS_ENABLED]: true,
  [FEATURE_FLAG_IMAGE_UPLOAD_ENABLED]: true,
  [FEATURE_FLAG_PHOTO_CONTEST_ENABLED]: true,
  [FEATURE_FLAG_RESERVATIONS_ENABLED]: true,
  [FEATURE_HIDE_HOF_AND_QUARTIER]: false,
  [FEATURE_FLAG_CHECK_HITOBITO_APPROVALS_ENABLED]: true,
  [FEATURE_FLAG_FORUM_ENABLED]: true,
  [FEATURE_FLAG_REDESIGNED_MAIN_MENU_ENABLED]: false,
  [FEATURE_FLAG_HIDE_FULL_HELPER_SHIFTS]: true,
};
