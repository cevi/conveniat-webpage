import type { StaticTranslationString } from '@/types/types';

/**
 * The forum is a set of chats of type `FORUM`: a post is a top-level message with a `ForumPost`
 * row, its thread the comments. Shared by the router, the forum pages and the map, which shows
 * the posts of a place.
 */

/** The reaction that counts as "betrifft mich auch", the like of a post or a comment. */
export const FORUM_LIKE_EMOJI = '👍';

export const FORUM_TITLE_MAX_LENGTH = 120;
export const FORUM_TEXT_MAX_LENGTH = 2000;
export const FORUM_NOTE_MAX_LENGTH = 500;
export const FORUM_POST_MAX_IMAGES = 4;

/** How far around a place the composer looks for posts about the same thing, in metres. */
export const FORUM_NEARBY_RADIUS_METRES = 50;

export const FORUM_POST_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE'] as const;
export type ForumPostStatusValue = (typeof FORUM_POST_STATUSES)[number];

export const forumStatusLabel: Record<ForumPostStatusValue, StaticTranslationString> = {
  OPEN: { de: 'Offen', en: 'Open', fr: 'Ouvert' },
  IN_PROGRESS: { de: 'In Arbeit', en: 'In progress', fr: 'En cours' },
  DONE: { de: 'Erledigt', en: 'Done', fr: 'Réglé' },
};

/** What the lists, the map and the composer's suggestions show of a post. */
export interface ForumPostSummary {
  id: string;
  topicId: string;
  topicName: string;
  title: string;
  /** the start of the description, without line breaks */
  excerpt: string;
  status: ForumPostStatusValue;
  createdAt: Date;
  author: { id: string; name: string } | null;
  /** written by an owner or admin of the topic, its Kernteam */
  byTopicAdmin: boolean;
  location: { longitude: number; latitude: number; annotationId: string | null } | null;
  /** the people who liked it, the posts merged into it included */
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  pinned: boolean;
  /** waits for a moderator's approval; absent in a persisted cache from before approvals */
  pending?: boolean;
  imageCount: number;
}

export type ForumCapacityValue = 'TOPIC_ADMIN' | 'PIKET' | 'DELEGATE';

export const forumCapacityLabel: Record<ForumCapacityValue, StaticTranslationString> = {
  TOPIC_ADMIN: { de: 'Kernteam', en: 'Core team', fr: 'Équipe centrale' },
  PIKET: { de: 'Piket', en: 'On duty', fr: 'Piquet' },
  DELEGATE: { de: 'Beauftragt', en: 'Assigned', fr: 'Mandaté' },
};

/** The path of a post in the app, the target of its pushes. */
export const forumPostPath = (postId: string): string => `/app/forum/${postId}`;

/** Metres between two points, close enough for the size of a campsite. */
export const distanceInMetres = (
  a: { longitude: number; latitude: number },
  b: { longitude: number; latitude: number },
): number => {
  const metresPerDegree = 111_320;
  const dLat = (a.latitude - b.latitude) * metresPerDegree;
  const dLng =
    (a.longitude - b.longitude) * metresPerDegree * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
};
