/**
 * Where the app serves a user's profile picture. The version is part of the URL, so a browser
 * may keep a picture forever and still sees a new one right after it changed.
 */
export const profilePictureUrl = (userId: string, version: string): string =>
  `/api/profile-pictures/${encodeURIComponent(userId)}?v=${encodeURIComponent(version)}`;

/** The same URL for a person whose picture may be missing, or unknown to a stale cache. */
export const profilePictureUrlOrUndefined = (
  userId: string,
  version: string | null | undefined,
): string | undefined =>
  typeof version === 'string' && version !== '' ? profilePictureUrl(userId, version) : undefined;

/**
 * The context flag of the one write that may set a profile picture, the user's own upload. An
 * editor may only clear one.
 */
export const PROFILE_PICTURE_UPLOAD_CONTEXT = 'profilePictureUpload';

/** The edge of the profile picture a tap opens full screen, the size WhatsApp uses. */
export const LARGE_PROFILE_PICTURE_EDGE = 640;

/**
 * The URL of the same picture at {@link LARGE_PROFILE_PICTURE_EDGE}, for the full-screen view.
 * A picture stored before the large size existed is served at its avatar size.
 *
 * @param pictureUrl - a URL from {@link profilePictureUrl}
 */
export const largeProfilePictureUrl = (pictureUrl: string): string =>
  `${pictureUrl}${pictureUrl.includes('?') ? '&' : '?'}size=${LARGE_PROFILE_PICTURE_EDGE}`;

/** The S3 key of one version of a user's profile picture, as the avatar or the large one. */
export const profilePictureKey = (
  userId: string,
  version: string,
  size: 'avatar' | 'large' = 'avatar',
): string =>
  `profile-pictures/${userId}/${version}${size === 'large' ? `-${LARGE_PROFILE_PICTURE_EDGE}` : ''}.webp`;
