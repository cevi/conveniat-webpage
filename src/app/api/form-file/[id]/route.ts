import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { FormCollection } from '@/features/payload-cms/payload-types';
import { S3_BUCKET_NAME, s3Client } from '@/lib/s3';
import { createLogger } from '@/utils/server-logger';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import config from '@payload-config';
import { NextResponse } from 'next/server';
import { createLocalReq, getPayload, type Payload } from 'payload';

const logger = createLogger('api:form-file');

/**
 * Whether a form file is attached to a submission that was approved, which makes it public.
 * A temporary file belongs to a form that has not been submitted yet and is never public.
 */
const belongsToApprovedSubmission = async (
  payload: Payload,
  fileDocument: FormCollection,
): Promise<boolean> => {
  if (fileDocument.isTemporary !== false) return false;

  const { formSubmission } = fileDocument;
  if (formSubmission === null || formSubmission === undefined) return false;
  if (typeof formSubmission === 'object') return formSubmission.approved === true;

  try {
    const submission = await payload.findByID({
      collection: 'form-submissions',
      id: formSubmission,
      depth: 0,
      overrideAccess: true,
    });
    return submission.approved === true;
  } catch {
    return false;
  }
};

/**
 * Streams an uploaded form file. Files on an approved submission are public, every other file
 * only reaches those who may read form submissions.
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
    const mayReadAllFiles = hasAdminOrWebAccess({ req: accessRequest });

    if (!mayReadAllFiles && !(await belongsToApprovedSubmission(payload, fileDocument))) {
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
