import type { PrismaClientOrTransaction } from '@/types/types';

/**
 * Puts two people who met by scanning a chat QR code into each other's address book, which
 * keeps them in each other's contact list while that list is restricted. Showing your code is
 * the consent, so the entry goes both ways.
 */
export const addToAddressBooks = async (
  prisma: PrismaClientOrTransaction,
  scannerId: string,
  issuerId: string,
): Promise<void> => {
  await prisma.addressBookEntry.createMany({
    data: [
      { ownerId: scannerId, contactId: issuerId },
      { ownerId: issuerId, contactId: scannerId },
    ],
    skipDuplicates: true,
  });
};
