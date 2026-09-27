import { environmentVariables } from '@/config/environment-variables';
import { mayOpenHof } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { FormCollection, FormSubmission } from '@/features/payload-cms/payload-types';
import { S3_BUCKET_NAME, s3Client } from '@/lib/s3';
import { createLogger } from '@/utils/server-logger';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import config from '@payload-config';
import { NextResponse } from 'next/server';
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload';

const logger = createLogger('api:form-file');

/** The submission a permanent form file belongs to; a temporary file belongs to none yet. */
const submissionOf = async (
  payload: Payload,
  fileDocument: FormCollection,
): Promise<Pick<FormSubmission, 'approved' | 'hof' | 'form'> | undefined> => {
  if (fileDocument.isTemporary !== false) return undefined;
  const { formSubmission } = fileDocument;
  if (formSubmission === null || formSubmission === undefined) return undefined;
  if (typeof formSubmission === 'object') return formSubmission;
  return (
    (await payload.findByID({
      collection: 'form-submissions',
      id: formSubmission,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
      select: { approved: true, hof: true, form: true },
    })) ?? undefined
  );
};

/**
 * Whether an approved submission makes its files public. Approval publishes a submission, e.g.
 * a Stadtleben stand on the website, but it is also how the Ressort accepts a Hof's plan or
 * order, which stays the Hof's: files of a form only a Hof's administrators hand in are never
 * public.
 */
const isPublishedFile = async (
  payload: Payload,
  submission: Pick<FormSubmission, 'approved' | 'form' | 'hof'> | undefined,
): Promise<boolean> => {
  if (submission?.approved !== true) return false;
  if (!environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD) return true;
  const formId = typeof submission.form === 'object' ? submission.form.id : submission.form;
  const form = await payload.findByID({
    collection: 'forms',
    id: formId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { hofDashboard: true },
  });
  // a Hof's submission whose form is gone, e.g. in the trash, stays as private as it was
  if (form === null) return submission.hof === undefined || submission.hof === null;
  const linked = typeof form.hofDashboard?.area === 'string';
  return !linked || form.hofDashboard?.onlyHofAdministrators === false;
};

/**
 * Whether the requester may read a file that is not public: a file of a Hof's submission
 * reaches that Hof's address administrators, as their dashboard lists it.
 */
const isOwnHofFile = async (
  request: PayloadRequest,
  submission: Pick<FormSubmission, 'hof'> | undefined,
): Promise<boolean> => {
  if (!environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD) return false;
  const hof = submission?.hof;
  const hofId = typeof hof === 'object' && hof !== null ? hof.id : hof;
  return typeof hofId === 'string' && (await mayOpenHof(request, hofId));
};

/**
 * Streams an uploaded form file. Files on an approved submission are public, except a Hof's
 * plans and orders; every other file only reaches those who may read form submissions and a
 * Hof's own address administrators.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse | Response> {
  try {
    const { id } = await params;
    if (typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
    }

    const payload = await getPayload({ config });

    // Authenticate requester
    const { user } = await payload.auth({ headers: request.headers });

    let fileDocument: FormCollection;
    try {
      fileDocument = await payload.findByID({
        collection: 'form_collection',
        id,
        depth: 1,
        overrideAccess: true,
      });
    } catch {
      return NextResponse.json({ error: 'File document not found' }, { status: 404 });
    }

    // Every camp participant who logged in through Cevi.DB is a user, so being logged in grants
    // nothing. Only the rule behind the collection's REST `read` reaches files that are not public.
    const accessRequest = await createLocalReq(user === null ? {} : { user }, payload);
    const submission = await submissionOf(payload, fileDocument);
    const mayRead =
      hasAdminOrWebAccess({ req: accessRequest }) ||
      (await isPublishedFile(payload, submission)) ||
      (await isOwnHofFile(accessRequest, submission));

    if (!mayRead) {
      if (user === null) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      logger.warn('Denied a logged-in user a form file outside an approved submission', {
        fileId: id,
        userId: user.id,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (typeof fileDocument.filename !== 'string' || fileDocument.filename.length === 0) {
      return NextResponse.json({ error: 'Filename not found' }, { status: 404 });
    }

    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: fileDocument.filename,
    });

    const s3Response = await s3Client.send(getCommand);
    const webStream = s3Response.Body?.transformToWebStream();

    if (webStream === undefined) {
      return NextResponse.json({ error: 'Failed to read file content' }, { status: 500 });
    }

    const mimeType =
      typeof fileDocument.mimeType === 'string' && fileDocument.mimeType.length > 0
        ? fileDocument.mimeType
        : 'application/octet-stream';
    const originalFilename =
      typeof fileDocument.originalFilename === 'string' && fileDocument.originalFilename.length > 0
        ? fileDocument.originalFilename
        : fileDocument.filename;

    return new Response(webStream, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(originalFilename)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    logger.error('Failed to download a form file', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
