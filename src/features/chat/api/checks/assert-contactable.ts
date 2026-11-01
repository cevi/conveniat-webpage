import { getFeatureFlag } from '@/lib/db/redis';
import { FEATURE_FLAG_RESTRICT_CONTACT_LIST } from '@/lib/feature-flags';
import type { Prisma } from '@/lib/prisma';
import type { Locale, PrismaClientOrTransaction, StaticTranslationString } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { getPayload } from 'payload';

const logger = createLogger('chat:checks');

const notAContactText: StaticTranslationString = {
  de: 'Du kannst nur mit deinen Kontakten einen Chat starten.',
  en: 'You can only start a chat with your contacts.',
  fr: 'Tu ne peux démarrer un chat qu’avec tes contacts.',
};

/**
 * The people a user may start a chat with, which is what their contact list shows.
 *
 * With the contact list restricted, that is the people sharing a Hof with the user, the
 * people in their address book (see `AddressBookEntry`), and everyone holding a function or
 * the AVP role of a Hof. Otherwise it is everyone who is not hidden.
 *
 * A test account, like the one for the App Store review, keeps only its Hof and its address
 * book, whether the contact list is restricted or not.
 */
export const getContactFilter = async (
  prisma: PrismaClientOrTransaction,
  userId: string,
): Promise<Prisma.UserWhereInput> => {
  const everyone: Prisma.UserWhereInput = { uuid: { not: userId }, hidden: false };
  const self = await prisma.user.findUnique({
    where: { uuid: userId },
    select: { hofIds: true, testAccount: true },
  });
  const isTestAccount = self?.testAccount === true;
  if (!isTestAccount && !(await getFeatureFlag(FEATURE_FLAG_RESTRICT_CONTACT_LIST))) {
    return everyone;
  }

  const ownContacts: Prisma.UserWhereInput[] = [
    { hofIds: { hasSome: self?.hofIds ?? [] } },
    { inAddressBooksOf: { some: { ownerId: userId } } },
  ];
  if (isTestAccount) return { ...everyone, OR: ownContacts };

  return {
    ...everyone,
    OR: [...ownContacts, { funktionIds: { isEmpty: false } }, { avpHofIds: { isEmpty: false } }],
  };
};

/**
 * Whether the person is an organiser of a program entry or a Schichteinsatz. The schedule
 * shows a chat button next to each of them, to everybody who can open the entry.
 */
const isOrganiser = async (userId: string): Promise<boolean> => {
  const payload = await getPayload({ config });
  const where = { organiser: { in: [userId] } };
  const [entries, shifts] = await Promise.all([
    payload.count({ collection: 'camp-schedule-entry', where }),
    payload.count({ collection: 'helper-shifts', where }),
  ]);
  return entries.totalDocs + shifts.totalDocs > 0;
};

/**
 * Refuses a chat with people who are not in the user's contact list. The list alone restricts
 * nothing: the ids of other people reach the client through the schedule and the chats the
 * user is already in.
 *
 * @param options.userIds - the people the user wants in a chat with them
 * @param options.allowOrganisers - also accept organisers, for the private chat the schedule
 *   opens with them
 */
export const assertContactable = async ({
  prisma,
  userId,
  userIds,
  locale,
  allowOrganisers = false,
}: {
  prisma: PrismaClientOrTransaction;
  userId: string;
  userIds: string[];
  locale: Locale;
  allowOrganisers?: boolean;
}): Promise<void> => {
  if (userIds.length === 0) return;

  const contacts = await prisma.user.findMany({
    where: { AND: [await getContactFilter(prisma, userId), { uuid: { in: userIds } }] },
    select: { uuid: true },
  });
  const contactIds = new Set(contacts.map((contact) => contact.uuid));
  const strangerIds = userIds.filter((id) => !contactIds.has(id));
  if (strangerIds.length === 0) return;

  if (allowOrganisers) {
    const organisers = await Promise.all(strangerIds.map((id) => isOrganiser(id)));
    if (organisers.every(Boolean)) return;
  }

  // The app only offers contacts, so this is a stale contact list or a hand-written request.
  logger.warn('Refused a chat with people outside the contact list', {
    'user.id': userId,
    'chat.stranger_count': strangerIds.length,
  });
  throw new TRPCError({ code: 'FORBIDDEN', message: notAContactText[locale] });
};
