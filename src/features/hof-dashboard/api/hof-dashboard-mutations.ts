import { getHofDashboardSettings } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  HOF_FILE_MAX_BYTES,
  HOF_FILE_TYPES,
  hofFileExtensionOf,
  type HofFileKind,
  type HofOrderType,
  type HofSubmissionType,
} from '@/features/hof-dashboard/constants';
import { buildOrderLines } from '@/features/hof-dashboard/utils/order-lines';
import { daysUntil } from '@/features/hof-dashboard/utils/submission-progress';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { HofMaterialOrder, HofSubmission } from '@/features/payload-cms/payload-types';
import { S3_BUCKET_NAME, s3Client, s3ClientPublic } from '@/lib/s3';
import { createLogger } from '@/utils/server-logger';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { getPayload, ValidationError, type Payload } from 'payload';

const logger = createLogger('hof-dashboard:mutations');

const PRESIGNED_UPLOAD_SECONDS = 15 * 60;

/**
 * Where a browser puts a file for a Hof before the dashboard files it. The Hof is part of the
 * key, so an upload can only ever be filed under the Hof it was made for.
 */
const uploadPrefix = (hofId: string): string => `temp/hof-dashboard/${hofId}/`;

/**
 * A URL the browser uploads one file to. The file lands in a temporary place and only becomes
 * part of a submission through `completeHofUpload`, which checks it again.
 */
export const createHofUploadUrl = async (
  hofId: string,
  filename: string,
): Promise<{ url: string; key: string; contentType: string }> => {
  const extension = hofFileExtensionOf(filename);
  if (extension === undefined) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'unsupported_file_type' });
  }
  const contentType = HOF_FILE_TYPES[extension];
  const key = `${uploadPrefix(hofId)}${randomUUID()}-${filename.replaceAll(/[^\w.-]/g, '_')}`;
  const url = await getSignedUrl(
    s3ClientPublic,
    new PutObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn: PRESIGNED_UPLOAD_SECONDS },
  );
  return { url, key, contentType };
};

/** The Hof's entry for one kind of plan, created the first time the Hof touches it. */
const findOrCreateSubmission = async (
  payload: Payload,
  hofId: string,
  submissionType: HofSubmissionType,
): Promise<HofSubmission> => {
  const find = async (): Promise<HofSubmission | undefined> => {
    const { docs } = await payload.find({
      collection: 'hof-submissions',
      where: {
        and: [{ hof: { equals: hofId } }, { submissionType: { equals: submissionType } }],
      },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    });
    return docs[0];
  };
  const existing = await find();
  if (existing !== undefined) return existing;
  try {
    return await payload.create({
      collection: 'hof-submissions',
      data: { hof: hofId, submissionType },
      depth: 0,
      overrideAccess: true,
    });
  } catch (error) {
    // two first writes at once: the unique index let one through, use that one
    const created = await find();
    if (created !== undefined) return created;
    throw error;
  }
};

/** Reads an uploaded file back from its temporary place, within the size limit. */
const readUpload = async (key: string): Promise<Uint8Array> => {
  const object = await s3Client
    .send(new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }))
    .catch(() => {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'upload_missing' });
    });
  if ((object.ContentLength ?? 0) > HOF_FILE_MAX_BYTES) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'file_too_large' });
  }
  const body = await object.Body?.transformToByteArray();
  if (body === undefined || body.length === 0 || body.length > HOF_FILE_MAX_BYTES) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'file_too_large' });
  }
  return body;
};

/**
 * Files an uploaded file under the Hof's submission. Any new file puts the submission back to
 * "submitted": whatever the Ressort said was about what the Hof had handed in before.
 */
export const completeHofUpload = async ({
  hofId,
  submissionType,
  kind,
  key,
  filename,
  userId,
}: {
  hofId: string;
  submissionType: HofSubmissionType;
  kind: HofFileKind;
  key: string;
  filename: string;
  userId: string;
}): Promise<void> => {
  const extension = hofFileExtensionOf(filename);
  if (!key.startsWith(uploadPrefix(hofId)) || key.includes('..') || extension === undefined) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'unsupported_file_type' });
  }
  const body = await readUpload(key);

  const payload = await getPayload({ config });
  const submission = await findOrCreateSubmission(payload, hofId, submissionType);
  try {
    await payload.create({
      collection: 'hof-files',
      data: { submission: submission.id, hof: hofId, kind, uploadedBy: userId },
      file: {
        data: Buffer.from(body),
        mimetype: HOF_FILE_TYPES[extension],
        name: filename,
        size: body.length,
      },
      depth: 0,
      overrideAccess: true,
    });
  } catch (error) {
    // Payload checks the content against the file type; a renamed file ends up here
    if (error instanceof ValidationError) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'unsupported_file_type' });
    }
    throw error;
  }
  if (submission.status !== 'submitted') {
    await payload.update({
      collection: 'hof-submissions',
      id: submission.id,
      data: { status: 'submitted' },
      depth: 0,
      overrideAccess: true,
    });
  }

  await s3Client
    .send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }))
    .catch((error: unknown) => {
      logger.warn('Could not remove the temporary upload of a Hof file', { error });
    });
  logger.info('A Hof handed in a file', {
    'hof_dashboard.hof_id': hofId,
    'hof_dashboard.submission_type': submissionType,
    'hof_dashboard.file_kind': kind,
    'hof_dashboard.file_bytes': body.length,
  });
};

/** Records the Hof's answer to "elevated safety risk?" for one kind of plan. */
export const setHofSafetyRisk = async (
  hofId: string,
  submissionType: HofSubmissionType,
  elevatedSafetyRisk: 'yes' | 'no',
): Promise<void> => {
  const payload = await getPayload({ config });
  const submission = await findOrCreateSubmission(payload, hofId, submissionType);
  await payload.update({
    collection: 'hof-submissions',
    id: submission.id,
    data: { elevatedSafetyRisk },
    depth: 0,
    overrideAccess: true,
  });
};

/**
 * Replaces the Hof's material order. Closed after the order's deadline, except for the
 * reviewers.
 *
 * The lines are resolved against the list in German, whatever language the Hof reads it in:
 * the settings are only required in German, and the Ressort reads every order in one language.
 */
export const updateHofMaterialOrder = async ({
  hofId,
  orderType,
  quantities,
  powerConnection,
  userId,
  mayPassDeadline,
}: {
  hofId: string;
  orderType: HofOrderType;
  quantities: { itemId: string; quantity: number }[];
  powerConnection: boolean;
  userId: string;
  mayPassDeadline: boolean;
}): Promise<void> => {
  const payload = await getPayload({ config });
  const settings = await getHofDashboardSettings(payload, LOCALE.DE);
  const list =
    orderType === 'infrastructure' ? settings.infrastructureOrder : settings.stadtlebenOrder;
  const deadline = list?.deadline;
  if (!mayPassDeadline && typeof deadline === 'string' && daysUntil(deadline, new Date()) < 0) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'order_closed' });
  }

  const find = async (): Promise<HofMaterialOrder | undefined> => {
    const { docs } = await payload.find({
      collection: 'hof-material-orders',
      where: { and: [{ hof: { equals: hofId } }, { orderType: { equals: orderType } }] },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    });
    return docs[0];
  };
  const listNames = new Map(
    (list?.items ?? []).flatMap((item) =>
      typeof item.id === 'string' ? [[item.id, item.name] as const] : [],
    ),
  );
  const existing = await find();
  const { lines, unknownItemIds } = buildOrderLines(listNames, existing?.items ?? [], quantities);
  if (unknownItemIds.length > 0) {
    // the list changed while the Hof had the form open; a reload shows the new one
    throw new TRPCError({ code: 'CONFLICT', message: 'order_list_changed' });
  }

  const data = {
    items: lines,
    powerConnection: orderType === 'stadtleben' && powerConnection,
    lastEditedBy: userId,
  };
  const update = async (id: string): Promise<void> => {
    await payload.update({
      collection: 'hof-material-orders',
      id,
      data,
      depth: 0,
      overrideAccess: true,
    });
  };
  if (existing === undefined) {
    try {
      await payload.create({
        collection: 'hof-material-orders',
        data: { hof: hofId, orderType, ...data },
        depth: 0,
        overrideAccess: true,
      });
    } catch (error) {
      // a second tab saved the first order at the same moment; the last save wins, as always
      const raced = await find();
      if (raced === undefined) throw error;
      await update(raced.id);
    }
  } else {
    await update(existing.id);
  }
  logger.info('A Hof saved its material order', {
    'hof_dashboard.hof_id': hofId,
    'hof_dashboard.order_type': orderType,
    'hof_dashboard.order_lines': lines.length,
  });
};
