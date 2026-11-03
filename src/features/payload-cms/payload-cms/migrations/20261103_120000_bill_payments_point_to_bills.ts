/* eslint-disable unicorn/no-null -- Mongo matches a missing or empty field with null */
import type { MigrateUpArgs } from '@payloadcms/db-mongodb';

/**
 * Copies the camp bill of every payment into the fields that can point to any kind of bill:
 * `matchedParticipant` into `matchedBill`, and `participant` into `bill` on each allocation.
 *
 * Step one of two. The legacy fields stay, and the release writes them next to the new ones,
 * because the replica of the previous release reads only them while the deploy rolls. A
 * payment that replica stores in that time has no `bill` yet; reads fall back to the legacy
 * field, its next save fills it, and running this again copies it. A later migration removes
 * the legacy fields.
 *
 * Written on the raw collection, one atomic update per document, so the payment hooks do not
 * rebook every bill. Each filter only matches what was not copied yet, which makes a second
 * run do nothing.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const payments = payload.db.collections['bill-payments']?.collection;
  if (payments === undefined) return;

  const matched = await payments.updateMany(
    { matchedParticipant: { $exists: true, $nin: [null, ''] }, matchedBill: { $exists: false } },
    [{ $set: { matchedBill: { relationTo: 'bill-participants', value: '$matchedParticipant' } } }],
  );

  const lacksBill = {
    $and: [
      { $ne: [{ $ifNull: ['$$allocation.participant', null] }, null] },
      { $ne: ['$$allocation.participant', ''] },
      { $eq: [{ $type: '$$allocation.bill' }, 'missing'] },
    ],
  };
  const allocated = await payments.updateMany(
    {
      allocations: {
        $elemMatch: { participant: { $exists: true, $nin: [null, ''] }, bill: { $exists: false } },
      },
    },
    [
      {
        $set: {
          allocations: {
            $map: {
              input: '$allocations',
              as: 'allocation',
              in: {
                $cond: [
                  lacksBill,
                  {
                    $mergeObjects: [
                      '$$allocation',
                      {
                        bill: {
                          relationTo: 'bill-participants',
                          value: '$$allocation.participant',
                        },
                      },
                    ],
                  },
                  '$$allocation',
                ],
              },
            },
          },
        },
      },
    ],
  );

  payload.logger.info(
    `Payments now point to bills: ${String(matched.modifiedCount)} matched bills and the ` +
      `allocations of ${String(allocated.modifiedCount)} payments copied.`,
  );
}

/**
 * Nothing to undo: the legacy fields were left as they were, and the previous release ignores
 * the new ones.
 */
export async function down(): Promise<void> {}
