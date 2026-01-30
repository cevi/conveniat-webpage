export const FEATURE_FLAG_SEND_MESSAGES = 'send_messages';
export const FEATURE_FLAG_CREATE_CHATS_ENABLED = 'create_chats_enabled';

export const FEATURE_FLAG_DEFAULTS: Record<string, boolean> = {
  [FEATURE_FLAG_SEND_MESSAGES]: true,
  [FEATURE_FLAG_CREATE_CHATS_ENABLED]: true,
};
