/**
 * One feature flag. Admins set it as a checkbox on the `app-feature-flags` global, whose field
 * carries the flag's name; `readFeatureFlag` from `@/lib/read-feature-flags` reads it.
 */
export interface FeatureFlagDefinition {
  /** A stable id: what the chat client knows the flag by, and its label in the metrics. */
  readonly key: string;
  /** The value until an admin saves another one. */
  readonly default: boolean;
  /**
   * The value while the flags cannot be loaded and no earlier load is at hand. A flag whose
   * default opens something up takes the closed value here, so an outage cannot undo an
   * admin's choice.
   */
  readonly whenUnavailable: boolean;
}

/** Every feature flag, by the name of its field on the `app-feature-flags` global. */
export const featureFlags = {
  globalMessagingEnabled: { key: 'send_messages', default: true, whenUnavailable: true },
  createChatsEnabled: { key: 'create_chats_enabled', default: true, whenUnavailable: true },
  restrictContactList: { key: 'restrict_contact_list', default: true, whenUnavailable: true },
  // which groups the restricted contact list adds to the address book; ignored without it
  contactListIncludesHof: {
    key: 'contact_list_includes_hof',
    default: true,
    whenUnavailable: false,
  },
  contactListIncludesFunktionen: {
    key: 'contact_list_includes_funktionen',
    default: true,
    whenUnavailable: false,
  },
  contactListIncludesAvp: {
    key: 'contact_list_includes_avp',
    default: true,
    whenUnavailable: false,
  },
  hideHofAndQuartier: { key: 'hide_hof_and_quartier', default: false, whenUnavailable: false },
  helperShiftsEnabled: { key: 'helper_shifts_enabled', default: true, whenUnavailable: true },
  hideFullHelperShifts: { key: 'hide_full_helper_shifts', default: true, whenUnavailable: true },
  imageUploadEnabled: { key: 'image_upload_enabled', default: true, whenUnavailable: true },
  photoContestEnabled: { key: 'photo_contest_enabled', default: true, whenUnavailable: true },
  reservationsEnabled: { key: 'reservations_enabled', default: true, whenUnavailable: true },
  forumEnabled: { key: 'forum_enabled', default: true, whenUnavailable: true },
  /** new forum posts stay with their author and the moderators until one of them approves */
  forumModerationRequired: {
    key: 'forum_moderation_required',
    default: false,
    whenUnavailable: false,
  },
  /** voice calls in one-to-one chats, a prototype: off until an admin switches it on */
  voiceCallsEnabled: { key: 'voice_calls_enabled', default: false, whenUnavailable: false },
} as const satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagName = keyof typeof featureFlags;

export type FeatureFlagKey = (typeof featureFlags)[FeatureFlagName]['key'];

export const featureFlagNames = Object.keys(featureFlags) as FeatureFlagName[];
