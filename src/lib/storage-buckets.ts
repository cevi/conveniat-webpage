/**
 * Which bucket holds the bill PDFs.
 *
 * They used to share one bucket with every other upload — images, chat attachments, form
 * files — at the bucket root with no prefix, so an invoice sat next to a public page image
 * and could only be told apart by its filename. A bucket of its own can carry its own
 * access policy, lifecycle and backup schedule, and makes "delete the bills" an operation
 * that cannot reach anything else.
 *
 * Kept as a pure function so the fallback is testable without the environment: an
 * unconfigured deployment keeps using the shared bucket, which is where its objects
 * already are. Nothing creates the bucket, so pointing at one that does not exist would
 * break uploads — hence opt-in rather than a default.
 */
export const resolveBillPdfBucket = (
  billPdfBucket: string | undefined,
  sharedBucket: string,
): string => {
  const configured = billPdfBucket?.trim() ?? '';
  return configured === '' ? sharedBucket : configured;
};
