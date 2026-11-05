import {
  describeFunktionen,
  getFunktionDirectory,
  toFunktionIds,
} from '@/features/payload-cms/payload-cms/utils/funktionen';
import type { Locale, PrismaClientOrTransaction } from '@/types/types';
import config from '@payload-config';
import { getPayload } from 'payload';

/** A key of `findKernteamLabels`: who wrote in which topic. */
export const kernteamKey = (chatId: string, userId: string): string => `${chatId}:${userId}`;

/**
 * The function that makes each author the Kernteam of a topic, e.g. "Ressortleitung
 * Infrastruktur", in `locale`, by `kernteamKey`: the first in the functions' order of those the
 * author holds among the topic's Kernteam functions. An author who is Kernteam without one, the
 * topic's owner, is missing and keeps the plain "Kernteam" badge.
 */
export const findKernteamLabels = async (
  prisma: PrismaClientOrTransaction,
  authors: readonly { chatId: string; userId: string }[],
  locale: Locale,
): Promise<Map<string, string>> => {
  if (authors.length === 0) return new Map();
  const payload = await getPayload({ config });
  const [users, topics, directory] = await Promise.all([
    prisma.user.findMany({
      where: { uuid: { in: [...new Set(authors.map((author) => author.userId))] } },
      select: { uuid: true, funktionIds: true },
    }),
    payload.find({
      collection: 'forum-topics',
      where: { chatUuid: { in: [...new Set(authors.map((author) => author.chatId))] } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { chatUuid: true, kernteamFunktionen: true },
    }),
    getFunktionDirectory(payload, locale),
  ]);
  const heldBy = new Map(users.map((user) => [user.uuid, new Set(user.funktionIds)]));
  const functionsOf = new Map(
    topics.docs.map((topic) => [topic.chatUuid ?? '', toFunktionIds(topic.kernteamFunktionen)]),
  );

  const labels = new Map<string, string>();
  for (const { chatId, userId } of authors) {
    const held = heldBy.get(userId);
    const ids = (functionsOf.get(chatId) ?? []).filter((id) => held?.has(id) === true);
    const [label] = describeFunktionen(ids, directory);
    if (label !== undefined) labels.set(kernteamKey(chatId, userId), label);
  }
  return labels;
};

/** `findKernteamLabels` for the senders of one topic's messages, by sender. */
export const findKernteamLabelsOfTopic = async (
  prisma: PrismaClientOrTransaction,
  chatId: string,
  userIds: Iterable<string>,
  locale: Locale,
): Promise<Map<string, string>> => {
  const ids = [...userIds];
  const labels = await findKernteamLabels(
    prisma,
    ids.map((userId) => ({ chatId, userId })),
    locale,
  );
  return new Map(
    ids.flatMap((userId) => {
      const label = labels.get(kernteamKey(chatId, userId));
      return label === undefined ? [] : [[userId, label] as const];
    }),
  );
};
