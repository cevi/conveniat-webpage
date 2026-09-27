import { getHofDashboardSettings } from '@/features/hof-dashboard/api/hof-dashboard-data';
import {
  HOF_FILE_MAX_BYTES,
  HOF_FILE_TYPES,
  HOF_FILES_MAX_COUNT,
  HOF_ORDER_TYPE_LABELS,
  HOF_SUBMISSION_TYPE_LABELS,
  hofFileExtensionOf,
  type HofFileKind,
  type HofOrderType,
  type HofSubmissionType,
} from '@/features/hof-dashboard/constants';
import { buildOrderLines } from '@/features/hof-dashboard/utils/order-lines';
import { daysUntil } from '@/features/hof-dashboard/utils/submission-progress';
import type { HofName } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
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
  size: number,
): Promise<{ url: string; key: string; contentType: string }> => {
  const extension = hofFileExtensionOf(filename);
  if (extension === undefined) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'unsupported_file_type' });
  }
  if (size > HOF_FILE_MAX_BYTES) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'file_too_large' });
  }
  const contentType = HOF_FILE_TYPES[extension];
  const key = `${uploadPrefix(hofId)}${randomUUID()}-${filename.replaceAll(/[^\w.-]/g, '_')}`;
  const url = await getSignedUrl(
    s3ClientPublic,
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    // signed, so storage refuses a body of any other size than the one checked above
    {
      expiresIn: PRESIGNED_UPLOAD_SECONDS,
      signableHeaders: new Set(['content-type', 'content-length']),
    },
  );
  return { url, key, contentType };
};

/** The Hof's entry for one kind of plan, created the first time the Hof touches it. */
const findOrCreateSubmission = async (
  payload: Payload,
  hof: HofName,
  submissionType: HofSubmissionType,
): Promise<HofSubmission> => {
  const hofId = hof.id;
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
      // named once, when it is made: the Hof and the kind of plan never change afterwards
      data: {
        hof: hofId,
        submissionType,
        title: `${hof.name} · ${HOF_SUBMISSION_TYPE_LABELS[submissionType].de}`,
      },
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
    .catch((error: unknown) => {
      // an upload that never arrived is the browser's problem; anything else is ours
      if (error instanceof Error && error.name === 'NoSuchKey') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'upload_missing' });
      }
      logger.warn('Could not read back the temporary upload of a Hof file', { error });
      throw error;
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
  hof,
  submissionType,
  kind,
  key,
  filename,
  userId,
}: {
  hof: HofName;
  submissionType: HofSubmissionType;
  kind: HofFileKind;
  key: string;
  filename: string;
  userId: string;
}): Promise<void> => {
  const hofId = hof.id;
  const extension = hofFileExtensionOf(filename);
  if (!key.startsWith(uploadPrefix(hofId)) || key.includes('..') || extension === undefined) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'unsupported_file_type' });
  }
  // the temporary copy goes whether the file is filed or refused
  try {
    const payload = await getPayload({ config });
    const { totalDocs } = await payload.count({
      collection: 'hof-files',
      where: { hof: { equals: hofId } },
      overrideAccess: true,
    });
    if (totalDocs >= HOF_FILES_MAX_COUNT) {
      logger.warn('A Hof reached the most files it may hand in', {
        'hof_dashboard.hof_id': hofId,
        'hof_dashboard.files': totalDocs,
      });
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'too_many_files' });
    }
    const body = await readUpload(key);

    const submission = await findOrCreateSubmission(payload, hof, submissionType);
    try {
      await payload.create({
        collection: 'hof-files',
        data: {
          submission: submission.id,
          hof: hofId,
          kind,
          uploadedBy: userId,
          originalFilename: filename,
        },
        file: {
          data: Buffer.from(body),
          mimetype: HOF_FILE_TYPES[extension],
          // not the Hof's own name, which would be guessable and show which names other Höfe
          // used; originalFilename keeps it for the dashboard
          name: `${randomUUID()}.${extension}`,
          size: body.length,
        },
        depth: 0,
        overrideAccess: true,
      });
    } catch (error) {
      // Payload checks the content against the file type; a renamed file ends up here
      if (
        error instanceof ValidationError &&
        error.data.errors.some(({ path }) => path === 'file')
      ) {
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

    logger.info('A Hof handed in a file', {
      'hof_dashboard.hof_id': hofId,
      'hof_dashboard.submission_type': submissionType,
      'hof_dashboard.file_kind': kind,
      'hof_dashboard.file_bytes': body.length,
    });
  } finally {
    await s3Client
      .send(new DeleteObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }))
      .catch((error: unknown) => {
        logger.warn('Could not remove the temporary upload of a Hof file', { error });
      });
  }
};

/** Records the Hof's answer to "elevated safety risk?" for one kind of plan. */
export const updateHofSafetyRisk = async (
  hof: HofName,
  submissionType: HofSubmissionType,
  elevatedSafetyRisk: 'yes' | 'no',
): Promise<void> => {
  const payload = await getPayload({ config });
  const submission = await findOrCreateSubmission(payload, hof, submissionType);
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
  hof,
  orderType,
  quantities,
  powerConnection,
  userId,
  isReviewer,
}: {
  hof: HofName;
  orderType: HofOrderType;
  quantities: { itemId: string; quantity: number }[];
  powerConnection: boolean;
  userId: string;
  isReviewer: boolean;
}): Promise<void> => {
  const hofId = hof.id;
  const payload = await getPayload({ config });
  const settings = await getHofDashboardSettings(payload, LOCALE.DE);
  const list =
    orderType === 'infrastructure' ? settings.infrastructureOrder : settings.stadtlebenOrder;
  const deadline = list?.deadline;
  if (!isReviewer && typeof deadline === 'string' && daysUntil(deadline, new Date()) < 0) {
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
  // two first saves at the same moment: the unique index refuses the second, which then fails
  // like any failed save and is simply saved again
  await (existing === undefined
    ? payload.create({
        collection: 'hof-material-orders',
        data: {
          hof: hofId,
          orderType,
          title: `${hof.name} · ${HOF_ORDER_TYPE_LABELS[orderType].de}`,
          ...data,
        },
        depth: 0,
        overrideAccess: true,
      })
    : update(existing.id));
  logger.info('A Hof saved its material order', {
    'hof_dashboard.hof_id': hofId,
    'hof_dashboard.order_type': orderType,
    'hof_dashboard.order_lines': lines.length,
  });
};
