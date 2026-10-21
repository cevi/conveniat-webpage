import type { Payload } from 'payload';

/**
 * Stores the payments booked before payments had their own collection.
 *
 * Until then a booking lived only on the bill, as its transaction and amount. Without a row
 * for it, a second payment for that bill would count alone and never read as a double
 * payment. Writes only the rows that are missing, so it runs on every start.
 *
 * @returns how many payments it stored
 */
export async function backfillBillPayments(payload: Payload): Promise<number> {
  const booked = await payload.find({
    collection: 'bill-participants',
    where: { paymentTransactionReference: { exists: true } },
    pagination: false,
    depth: 0,
    context: { internal: true },
    select: {
      paymentTransactionReference: true,
      paidAmount: true,
      paidDate: true,
      invoiceAmount: true,
      referenceNumber: true,
    },
  });
  const transactions = booked.docs
    .map((participant) => participant.paymentTransactionReference ?? '')
    .filter((transaction) => transaction !== '');
  if (transactions.length === 0) return 0;

  const stored = await payload.find({
    collection: 'bill-payments',
    where: { transactionReference: { in: transactions } },
    pagination: false,
    depth: 0,
    context: { internal: true },
    select: { transactionReference: true },
  });
  const known = new Set(stored.docs.map((payment) => payment.transactionReference));

  let created = 0;
  for (const participant of booked.docs) {
    const transaction = participant.paymentTransactionReference ?? '';
    if (transaction === '' || known.has(transaction)) continue;
    const amount = participant.paidAmount ?? participant.invoiceAmount ?? 0;
    try {
      await payload.create({
        collection: 'bill-payments',
        depth: 0,
        // The bill is already booked; there is nothing to bring in line.
        context: { internal: true, paymentImport: true },
        data: {
          transactionReference: transaction,
          amount,
          currency: 'CHF',
          ...(participant.paidDate === null || participant.paidDate === undefined
            ? {}
            : { bookingDate: participant.paidDate }),
          reference: participant.referenceNumber ?? '',
          matchedParticipant: participant.id,
          importOutcome: 'booked',
          importedBy: 'Übernahme einer früheren Buchung',
          allocations: [{ participant: participant.id, amount }],
        },
      });
      known.add(transaction);
      created++;
    } catch (error) {
      // A second replica starting at the same moment stored it first.
      payload.logger.debug(
        { err: error },
        `Did not store the earlier booking ${transaction} as a payment`,
      );
    }
  }
  return created;
}
