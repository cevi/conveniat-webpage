import type { PaymentImporter } from '@/features/billing-core/bank-import';
import { importBankFile, PaymentFileError } from '@/features/billing-core/bank-import';
import { describeActor } from '@/features/billing-core/describe-actor';
import { canAccessBilling } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { Endpoint, PayloadHandler } from 'payload';
import { z } from 'zod';

/** A bank file covers a day or a week of payments; this is far beyond either. */
const MAX_PAYMENT_CSV_LENGTH = 5_000_000;

const ImportPaymentsSchema = z.object({
  csv: z
    .string()
    .min(1, 'Die Datei ist leer.')
    .max(MAX_PAYMENT_CSV_LENGTH, 'Die Datei ist zu gross für einen Zahlungsimport.'),
});

/**
 * POST /api/confidential/billing/import-payments – book the payments of a bank CSV, for every
 * kind of bill paid into the shared QR-IBAN.
 *
 * Takes the file as text: the admin panel decodes it, because Excel and the e-banking save
 * it in different encodings. Nothing of the file is stored beyond the payments it lists.
 *
 * @param importers the kinds of bill, the one that takes every unclaimed payment last
 */
export const createImportPaymentsEndpoint = (importers: PaymentImporter[]): Endpoint => {
  const handler: PayloadHandler = async (request) => {
    try {
      const hasAccess = await canAccessBilling({ req: request });
      if (hasAccess !== true) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const bodyJson = (await (request as unknown as Request).json()) as unknown;
      const parseResult = ImportPaymentsSchema.safeParse(bodyJson);
      if (!parseResult.success) {
        return Response.json(
          { error: parseResult.error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 },
        );
      }

      try {
        const result = await importBankFile(
          request.payload,
          parseResult.data.csv,
          describeActor(request.user),
          importers,
        );
        return Response.json({ success: true, ...result });
      } catch (error) {
        if (error instanceof PaymentFileError) {
          return Response.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      request.payload.logger.error({ err: error }, `Payment import failed: ${message}`);
      return Response.json({ error: message }, { status: 500 });
    }
  };
  return { path: '/confidential/billing/import-payments', method: 'post', handler };
};
