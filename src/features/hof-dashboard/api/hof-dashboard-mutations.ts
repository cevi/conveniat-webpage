import { getHofDashboardSettings } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  HOF_FILE_EXTENSIONS,
  HOF_FILE_MAX_BYTES,
  type HofFileKind,
  type HofOrderType,
  type HofSubmissionType,
} from '@/features/hof-dashboard/constants';
import { daysUntil } from '@/features/hof-dashboard/utils/submission-progress';
import type { HofSubmission } from '@/features/payload-cms/payload-types';
import { S3_BUCKET_NAME, s3Client, s3ClientPublic } from '@/lib/s3';
import type { Locale } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '@payload-config';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { getPayload } from 'payload';

const logger = createLogger('hof-dashboard:mutations');

/** Where a browser puts a file before the dashboard files it; nothing else writes there. */
export const HOF_UPLOAD_PREFIX = 'temp/hof-dashboard/';

const PRESIGNED_UPLOAD_SECONDS = 15 * 60;

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  zip: 'application/zip',
};

const extensionOf = (filename: string): string =>
  path.extname(filename).toLowerCase().replace(/^\./, '');

/** Whether the dashboard takes a file by this name. */
export const isAllowedHofFilename = (filename: string): boolean =>
  (HOF_FILE_EXTENSIONS as readonly string[]).includes(extensionOf(filename));

/**
 * A URL the browser uploads one file to. The file lands in a temporary place and only becomes
 * part of a submission through `completeHofUpload`, which checks it again.
 */
export const createHofUploadUrl = async (
  filename: string,
): Promise<{ url: string; key: string; contentType: string }> => {
  if (!isAllowedHofFilename(filename)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'unsupported_file_type' });
  }
  const contentType = MIME_TYPE_BY_EXTENSION[extensionOf(filename)] ?? 'application/octet-stream';
  const key = `${HOF_UPLOAD_PREFIX}${randomUUID()}-${filename.replaceAll(/[^\w.-]/g, '_')}`;
  const url = await getSignedUrl(
    s3ClientPublic,
    new PutObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn: PRESIGNED_UPLOAD_SECONDS },
  );
  return { url, key, contentType };
};

/** The Hof's entry for one kind of plan, created the first time the Hof touches it. */
const findOrCreateSubmission = async (
  hofId: string,
  submissionType: HofSubmissionType,
): Promise<HofSubmission> => {
  const payload = await getPayload({ config });
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
      data: { hof: hofId, submissionType, status: 'submitted' },
      depth: 0,
      overrideAccess: true,
    });
  } catch (error) {
    // two first uploads at once: the unique index let one through, use that one
    const created = await find();
    if (created !== undefined) return created;
    throw error;
  }
};

/**
 * Files an uploaded file under the Hof's submission. A new plan puts the submission back to
 * "submitted", since whatever the Ressort said was about the previous version.
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
  if (!key.startsWith(HOF_UPLOAD_PREFIX) || key.includes('..') || !isAllowedHofFilename(filename)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'unsupported_file_type' });
  }

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

  const payload = await getPayload({ config });
  const submission = await findOrCreateSubmission(hofId, submissionType);
  await payload.create({
    collection: 'hof-files',
    data: { submission: submission.id, hof: hofId, kind, uploadedBy: userId },
    file: {
      data: Buffer.from(body),
      mimetype: MIME_TYPE_BY_EXTENSION[extensionOf(filename)] ?? 'application/octet-stream',
      name: filename,
      size: body.length,
    },
    depth: 0,
    overrideAccess: true,
  });
  if (kind === 'plan' && submission.status !== 'submitted') {
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
  const submission = await findOrCreateSubmission(hofId, submissionType);
  await payload.update({
    collection: 'hof-submissions',
    id: submission.id,
    data: { elevatedSafetyRisk },
    depth: 0,
    overrideAccess: true,
  });
};

/**
 * Replaces the Hof's material order. Only material on the current list can be ordered; lines
 * the Hof ordered before the list changed stay as they were. Closed after the order's
 * deadline, except for the reviewers.
 */
export const updateHofMaterialOrder = async ({
  hofId,
  orderType,
  quantities,
  powerConnection,
  userId,
  locale,
  mayPassDeadline,
}: {
  hofId: string;
  orderType: HofOrderType;
  quantities: { itemId: string; quantity: number }[];
  powerConnection: boolean;
  userId: string;
  locale: Locale;
  mayPassDeadline: boolean;
}): Promise<void> => {
  const payload = await getPayload({ config });
  const settings = await getHofDashboardSettings(payload, locale);
  const list =
    orderType === 'infrastructure' ? settings.infrastructureOrder : settings.stadtlebenOrder;
  const deadline = list?.deadline;
  if (!mayPassDeadline && typeof deadline === 'string' && daysUntil(deadline, new Date()) < 0) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'order_closed' });
  }

  const names = new Map((list?.items ?? []).map((item) => [item.id, item.name]));
  const { docs: storedOrders } = await payload.find({
    collection: 'hof-material-orders',
    where: { and: [{ hof: { equals: hofId } }, { orderType: { equals: orderType } }] },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  const existing = storedOrders[0];

  const retired = (existing?.items ?? []).filter((line) => !names.has(line.itemId));
  const items = [
    ...quantities.flatMap(({ itemId, quantity }) => {
      const name = names.get(itemId);
      return name === undefined || quantity <= 0 ? [] : [{ itemId, name, quantity }];
    }),
    ...retired.map(({ itemId, name, quantity }) => ({ itemId, name, quantity })),
  ];
  const data = {
    items,
    powerConnection: orderType === 'stadtleben' && powerConnection,
    lastEditedBy: userId,
  };

  await (existing === undefined
    ? payload.create({
        collection: 'hof-material-orders',
        data: { hof: hofId, orderType, ...data },
        depth: 0,
        overrideAccess: true,
      })
    : payload.update({
        collection: 'hof-material-orders',
        id: existing.id,
        data,
        depth: 0,
        overrideAccess: true,
      }));
  logger.info('A Hof saved its material order', {
    'hof_dashboard.hof_id': hofId,
    'hof_dashboard.order_type': orderType,
    'hof_dashboard.order_lines': items.length,
  });
};
