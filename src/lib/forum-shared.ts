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
/** How many posts a section of "Zu tun" shows at first, and how many more "Mehr laden" adds. */
export const FORUM_TODO_SECTION_SIZE = 50;

/** How far around a place the composer looks for posts about the same thing, in metres. */
export const FORUM_NEARBY_RADIUS_METRES = 50;

/** How many participants have to flag a post or a comment before it is hidden on its own. */
export const FORUM_FLAGS_TO_HIDE = 3;

/** How long after sending someone may still change the text of their message. */
export const MESSAGE_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export const FORUM_POST_KINDS = ['QUESTION', 'PROBLEM', 'IDEA'] as const;
export type ForumPostKindValue = (typeof FORUM_POST_KINDS)[number];

export const forumKindLabel: Record<ForumPostKindValue, StaticTranslationString> = {
  QUESTION: { de: 'Frage', en: 'Question', fr: 'Question' },
  PROBLEM: { de: 'Problem', en: 'Problem', fr: 'Problème' },
  IDEA: { de: 'Idee', en: 'Idea', fr: 'Idée' },
};

/** What the 👍 means on a post of each kind. */
export const forumLikeLabel: Record<ForumPostKindValue, StaticTranslationString> = {
  QUESTION: { de: 'Ich auch', en: 'Me too', fr: 'Moi aussi' },
  PROBLEM: { de: 'Betrifft mich auch', en: 'Affects me too', fr: 'Moi aussi' },
  IDEA: { de: 'Gute Idee', en: 'Good idea', fr: 'Bonne idée' },
};

export const FORUM_FLAG_REASONS = ['INAPPROPRIATE', 'PERSONAL_DATA', 'DUPLICATE', 'OTHER'] as const;
export type ForumFlagReasonValue = (typeof FORUM_FLAG_REASONS)[number];

export const forumFlagReasonLabel: Record<ForumFlagReasonValue, StaticTranslationString> = {
  INAPPROPRIATE: {
    de: 'Unangemessen oder gefährlich',
    en: 'Inappropriate or dangerous',
    fr: 'Inapproprié ou dangereux',
  },
  PERSONAL_DATA: { de: 'Persönliche Daten', en: 'Personal data', fr: 'Données personnelles' },
  DUPLICATE: {
    de: 'Doppelt oder falsches Thema',
    en: 'Duplicate or wrong topic',
    fr: 'En double ou mauvais thème',
  },
  OTHER: { de: 'Anderes', en: 'Other', fr: 'Autre' },
};

/**
 * A post or a comment a moderator took away, as everyone else sees it; its author also reads
 * why. Absent in a persisted cache from before removals.
 */
export interface ForumRemovalInfo {
  kind: 'HIDDEN' | 'DELETED';
  reason: ForumFlagReasonValue;
  /** what the moderator wrote; only its author and the moderators get it */
  note: string | null;
  /** the capacity they acted in, null when flags hid it */
  byCapacity: ForumCapacityValue | null;
  at: Date;
  /** the author revised it and asked for it to be shown again */
  reviewRequested: boolean;
}

/** The open flags of a post or a comment, for its moderators: how many, and what each says. */
export interface ForumOpenFlags {
  count: number;
  /** most common first */
  reasons: { reason: ForumFlagReasonValue; note: string | null }[];
}

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
  /** absent in a persisted cache from before kinds, which only knew problems */
  kind?: ForumPostKindValue;
  /** a comment is marked as the answer, for a question */
  answered?: boolean;
  createdAt: Date;
  author: { id: string; name: string } | null;
  /** written by an owner or admin of the topic, its Kernteam */
  byTopicAdmin: boolean;
  /**
   * the function that makes the author Kernteam of the topic, e.g. "Ressortleitung
   * Infrastruktur", the badge's text; missing for an owner without one and in older caches
   */
  kernteamLabel?: string;
  location: { longitude: number; latitude: number; annotationId: string | null } | null;
  /** the people who liked it, the posts merged into it included */
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  pinned: boolean;
  /** waits for a moderator's approval; absent in a persisted cache from before approvals */
  pending?: boolean;
  /** hidden by a moderator or by flags; only its author and the moderators see it */
  hidden?: boolean;
  /** open flags, for the moderators; absent for everyone else */
  flagCount?: number;
  imageCount: number;
}

export type ForumCapacityValue = 'TOPIC_ADMIN' | 'PIKET' | 'ZENTRALE' | 'DELEGATE' | 'AUTOMATIC';

export const forumCapacityLabel: Record<ForumCapacityValue, StaticTranslationString> = {
  TOPIC_ADMIN: { de: 'Kernteam', en: 'Core team', fr: 'Équipe centrale' },
  PIKET: { de: 'Piket', en: 'On duty', fr: 'Piquet' },
  ZENTRALE: { de: 'Zentrale', en: 'Zentrale', fr: 'Zentrale' },
  DELEGATE: { de: 'Beauftragt', en: 'Assigned', fr: 'Mandaté' },
  AUTOMATIC: { de: 'Meldungen', en: 'Flags', fr: 'Signalements' },
};

/** The icons editors can give a forum topic, by the name the CMS stores. */
export const FORUM_TOPIC_ICONS = [
  'message-circle',
  'tent',
  'wrench',
  'utensils',
  'star',
  'calendar',
  'bus',
  'heart',
  'shield',
  'info',
  'map',
] as const;
export type ForumTopicIcon = (typeof FORUM_TOPIC_ICONS)[number];

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
