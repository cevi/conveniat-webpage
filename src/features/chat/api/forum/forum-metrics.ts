import prisma from '@/lib/db/prisma';
import type { ForumFlagReasonValue, ForumPostKindValue } from '@/lib/forum-shared';
import { ChatType } from '@/lib/prisma/enums';
import { defineCounter, defineHistogram, defineObservableGauges } from '@/lib/telemetry/metrics';

const SCOPE = 'forum';

/** Where a post lives: a topic everyone in it reads, or a private conversation. */
type ForumPlace = 'topic' | 'conversation';

const firstReactionSeconds = defineHistogram<{ kind: ForumPostKindValue; place: ForumPlace }>({
  scope: SCOPE,
  name: 'forum_first_reaction_seconds',
  description:
    'How long a forum post waited for its first comment or status change by whoever handles it',
  // from a minute at the desk to two days for a post nobody saw
  buckets: [60, 300, 900, 1800, 3600, 7200, 14_400, 43_200, 86_400, 172_800],
});

const flags = defineCounter<{ reason: ForumFlagReasonValue }>({
  scope: SCOPE,
  name: 'forum_flags_total',
  description: 'Flags participants put on forum posts and comments, by reason',
});

const removals = defineCounter<{ kind: 'HIDDEN' | 'DELETED'; automatic: 'true' | 'false' }>({
  scope: SCOPE,
  name: 'forum_removals_total',
  description: 'Forum posts and comments hidden or deleted by moderators or by flags',
});

/** Records the first reaction to a post, when `markForumPostReacted` set it. */
export const recordForumFirstReaction = (post: {
  createdAt: Date;
  kind: ForumPostKindValue;
  isConversation: boolean;
}): void => {
  firstReactionSeconds.record((Date.now() - post.createdAt.getTime()) / 1000, {
    kind: post.kind,
    place: post.isConversation ? 'conversation' : 'topic',
  });
};

/** Counts a flag. */
export const recordForumFlag = (reason: ForumFlagReasonValue): void => {
  flags.add(1, { reason });
};

/** Counts a post or a comment hidden or deleted. */
export const recordForumRemoval = (kind: 'HIDDEN' | 'DELETED', automatic: boolean): void => {
  removals.add(1, { kind, automatic: automatic ? 'true' : 'false' });
};

let waitingGaugesRegistered = false;

/**
 * Reports on every scrape how many posts wait for their first reaction and how long the oldest
 * has. Every replica reads the same table, so a dashboard takes the `max` across instances.
 */
export const registerForumWaitingGauges = (): void => {
  if (waitingGaugesRegistered) return;
  waitingGaugesRegistered = true;
  defineObservableGauges({
    scope: SCOPE,
    gauges: {
      waiting: {
        name: 'forum_posts_waiting',
        description: 'Forum posts waiting for their first reaction, by kind and place',
        valueType: 'int',
      },
      oldest: {
        name: 'forum_posts_oldest_waiting_seconds',
        description: 'How long the oldest forum post has waited for its first reaction',
        valueType: 'double',
      },
    },
    observe: async (observe): Promise<void> => {
      let rows;
      try {
        rows = await prisma.forumPost.findMany({
          where: {
            reactedAt: null,
            status: { not: 'DONE' },
            approvedAt: { not: null },
            mergedIntoId: null,
            message: { deletedAt: null },
            chat: { archivedAt: null },
          },
          select: { kind: true, createdAt: true, chat: { select: { type: true } } },
          take: 5000,
        });
      } catch {
        // a failed read reports nothing rather than zeros
        return;
      }
      const counts = new Map<string, { kind: ForumPostKindValue; place: ForumPlace; n: number }>();
      let oldest = 0;
      for (const row of rows) {
        const place: ForumPlace =
          row.chat.type === ChatType.FORUM_CONVERSATION ? 'conversation' : 'topic';
        const key = `${row.kind}:${place}`;
        const entry = counts.get(key) ?? { kind: row.kind, place, n: 0 };
        entry.n += 1;
        counts.set(key, entry);
        oldest = Math.max(oldest, (Date.now() - row.createdAt.getTime()) / 1000);
      }
      for (const entry of counts.values()) {
        observe('waiting', entry.n, { kind: entry.kind, place: entry.place });
      }
      observe('oldest', oldest);
    },
  });
};
