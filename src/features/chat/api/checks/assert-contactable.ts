import { chatError } from '@/features/chat/api/chat-errors';
import type { Prisma } from '@/lib/prisma/client';
import { readFeatureFlags } from '@/lib/read-feature-flags';
import type { PrismaClientOrTransaction } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload } from 'payload';

const logger = createLogger('chat:checks');

/**
 * The people a user may start a chat with, which is what their contact list shows.
 *
 * With the contact list restricted, that is the people in their address book (see
 * `AddressBookEntry`), plus each group an admin left switched on in the app feature flags: the
 * people sharing a Hof with the user, everyone holding a function, and every AVP of a Hof. With
 * all three off it is the address book alone. Otherwise it is everyone who is not hidden.
 *
 * A test account, like the one for the App Store review, keeps only its Hof and its address
 * book, whatever the flags say: the review has to be able to reach someone.
 *
 * Until the flags can be loaded once, the list is the address book alone, as with all three
 * groups off; see `FeatureFlagDefinition.whenUnavailable`.
 */
export const getContactFilter = async (
  prisma: PrismaClientOrTransaction,
  userId: string,
): Promise<Prisma.UserWhereInput> => {
  const everyone: Prisma.UserWhereInput = { uuid: { not: userId }, hidden: false };
  const [self, flags] = await Promise.all([
    prisma.user.findUnique({
      where: { uuid: userId },
      select: { hofIds: true, testAccount: true },
    }),
    readFeatureFlags([
      'restrictContactList',
      'contactListIncludesHof',
      'contactListIncludesFunktionen',
      'contactListIncludesAvp',
    ]),
  ]);
  const isTestAccount = self?.testAccount === true;
  if (!isTestAccount && !flags.restrictContactList) return everyone;

  const addressBook: Prisma.UserWhereInput = { inAddressBooksOf: { some: { ownerId: userId } } };
  const ownHof: Prisma.UserWhereInput = { hofIds: { hasSome: self?.hofIds ?? [] } };
  if (isTestAccount) return { ...everyone, OR: [addressBook, ownHof] };

  return {
    ...everyone,
    OR: [
      addressBook,
      ...(flags.contactListIncludesHof ? [ownHof] : []),
      ...(flags.contactListIncludesFunktionen ? [{ funktionIds: { isEmpty: false } }] : []),
      ...(flags.contactListIncludesAvp ? [{ avpHofIds: { isEmpty: false } }] : []),
    ],
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
  allowOrganisers = false,
}: {
  prisma: PrismaClientOrTransaction;
  userId: string;
  userIds: string[];
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
  throw chatError('FORBIDDEN', 'notAContact');
};
