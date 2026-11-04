import { BILL_PDF_BUCKET_NAME, s3Client } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * Reads a stored bill PDF from the bucket, by the filename its `bill-pdfs` document carries. The
 * camp bills and the Besuchstag bills keep their PDFs in the same collection and bucket.
 */
export const readBillPdf = async (filename: string): Promise<Buffer> => {
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: BILL_PDF_BUCKET_NAME, Key: filename }),
  );
  if (response.Body === undefined) throw new Error(`The stored bill ${filename} is empty.`);
  return Buffer.from(await response.Body.transformToByteArray());
};
