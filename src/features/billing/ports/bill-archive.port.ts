/**
 * Where a bill is filed once it goes out to the participant.
 *
 * The finance team keeps a copy of every bill that was actually sent. The app only hands
 * the PDF over; whatever is behind this port is responsible for getting it to its
 * destination and for retrying when that fails.
 */
export interface BillArchivePort {
  /** False when no archive is configured, which disables filing rather than failing it. */
  readonly isEnabled: boolean;

  /**
   * Files one bill.
   *
   * @param relativePath Path within the archive, including the file name.
   * @param content The PDF exactly as it was mailed.
   */
  archive(relativePath: string, content: Buffer): Promise<void>;
}
