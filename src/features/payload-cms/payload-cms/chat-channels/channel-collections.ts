import { ChatMembershipPermission } from '@/lib/prisma/client';

/** A collection whose documents are chats with an audience. */
export interface ChannelCollection {
  slug: 'announcement-channels' | 'forum-topics';
  /** What the audience of a channel holds in its chat. */
  memberPermission: ChatMembershipPermission;
}

/**
 * Every collection whose chats follow an audience. The login and the Höfe sync keep the members
 * of these chats up to date, so a new channel collection is listed here.
 */
export const CHANNEL_COLLECTIONS: readonly ChannelCollection[] = [
  { slug: 'announcement-channels', memberPermission: ChatMembershipPermission.GUEST },
  { slug: 'forum-topics', memberPermission: ChatMembershipPermission.MEMBER },
];
