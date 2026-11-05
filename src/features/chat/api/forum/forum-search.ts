import type { ForumPostSummary } from '@/lib/forum-shared';
import { Prisma } from '@/lib/prisma/client';
import type { PrismaClientOrTransaction } from '@/types/types';

/**
 * Finds the posts that may say the same as a title being typed, so the composer can show them
 * before a second post reaches the Zentrale. Two searches in Postgres, both on indexes of
 * `ForumPost`, see the migration `20261106090000_forum_search`:
 *
 * - full text over title and description, German stems without accents, every word also as a
 *   prefix, since the last one is still being typed: "Toilette" finds "Toiletten", "Wasche"
 *   finds "Wäsche";
 * - trigrams over the title, for what the stemmer cannot join: "Toi Toi" and "Toitoi", typos.
 *
 * Prisma has no operator for either, so the ids and their relevance come from one raw query,
 * and the posts themselves from Prisma, which also decides who may see them.
 */

/** At most this many words of a title count, so a pasted paragraph stays one cheap query. */
const MAX_WORDS = 8;
/** Shorter words take part in the full text only: "der" is similar to every title with "der". */
const TYPO_MIN_LENGTH = 4;
/** How many candidates the search hands on, before visibility and status narrow them. */
const CANDIDATE_LIMIT = 30;

/**
 * The words of a title as the search takes them: letters and digits only, in lower case, from
 * two letters on, so "WC" counts. Nothing else of the text ever reaches the query.
 */
export const searchWordsOf = (text: string): string[] =>
  [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length >= 2),
    ),
  ].slice(0, MAX_WORDS);

/**
 * The posts of the caller's topics whose title or description matches `words`, by id, with
 * their relevance: the full-text rank, normalized to below 1, plus the best trigram similarity
 * of a word to the title. Merged posts are left out; visibility is the caller's to apply.
 */
export const findForumPostsMatching = async (
  prisma: PrismaClientOrTransaction,
  userId: string,
  words: string[],
  topicId?: string,
): Promise<Map<string, number>> => {
  if (words.length === 0) return new Map();
  // the words hold letters and digits only, so they cannot be tsquery syntax; still parameters
  const prefixQuery = words.map((word) => `${word}:*`).join(' | ');
  // a stopword is similar to every title that has it, so it takes no part in the trigrams;
  // `numnode` of a word's query is 0 for a stopword
  const typoWords = words.filter((word) => word.length >= TYPO_MIN_LENGTH);
  const isWord = (word: string): Prisma.Sql =>
    Prisma.sql`numnode(plainto_tsquery('forum_german', ${word})) > 0`;
  const similarity =
    typoWords.length === 0
      ? Prisma.sql`0`
      : Prisma.sql`GREATEST(${Prisma.join(
          typoWords.map(
            (word) =>
              Prisma.sql`CASE WHEN ${isWord(word)} THEN word_similarity(${word}, post."title") ELSE 0 END`,
          ),
        )})`;
  const similar =
    typoWords.length === 0
      ? Prisma.sql`FALSE`
      : Prisma.join(
          typoWords.map((word) => Prisma.sql`(${isWord(word)} AND post."title" %> ${word})`),
          ' OR ',
        );

  const rows = await prisma.$queryRaw<{ id: string; score: number }[]>`
    SELECT post."messageId" AS id,
           ts_rank_cd(post."search", query, 32) + ${similarity} AS score
    FROM "ForumPost" AS post
    CROSS JOIN to_tsquery('forum_german', ${prefixQuery}) AS query
    WHERE post."mergedIntoId" IS NULL
      AND EXISTS (
        SELECT 1 FROM "ChatMembership" AS membership
        WHERE membership."chatId" = post."chatId" AND membership."userId" = ${userId}
      )
      ${topicId === undefined ? Prisma.empty : Prisma.sql`AND post."chatId" = ${topicId}`}
      AND (post."search" @@ query OR ${similar})
    ORDER BY score DESC
    LIMIT ${CANDIDATE_LIMIT}
  `;
  return new Map(rows.map((row) => [row.id, Number(row.score)]));
};

export type ForumSuggestion = ForumPostSummary & { distanceMetres?: number };

/**
 * The order the composer shows similar posts in: open before done, then by how well they match
 * the title, then the nearest to the chosen place, then the most liked. Relevance counts in
 * steps of a tenth, so a slightly better wording does not beat a post right at the place.
 */
export const rankForumSuggestions = (
  suggestions: ForumSuggestion[],
  scores: ReadonlyMap<string, number>,
): ForumSuggestion[] => {
  const relevance = (suggestion: ForumSuggestion): number =>
    Math.round((scores.get(suggestion.id) ?? 0) * 10);
  return suggestions.toSorted((a, b) => {
    const byStatus = (a.status === 'DONE' ? 1 : 0) - (b.status === 'DONE' ? 1 : 0);
    if (byStatus !== 0) return byStatus;
    const byRelevance = relevance(b) - relevance(a);
    if (byRelevance !== 0) return byRelevance;
    const distanceA = a.distanceMetres ?? Number.MAX_SAFE_INTEGER;
    const distanceB = b.distanceMetres ?? Number.MAX_SAFE_INTEGER;
    return distanceA === distanceB ? b.likeCount - a.likeCount : distanceA - distanceB;
  });
};
