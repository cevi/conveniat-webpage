import { MINIO_BUCKET_NAME, s3Client } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import config from '@payload-config';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse | Response> {
  try {
    const { id } = await params;
    if (typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'Missing file ID' }, { status: 400 });
    }

    const payload = await getPayload({ config });

    // Authenticate requester
    const { user } = await payload.auth({ headers: request.headers });
    if (user === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let fileDocument;
    try {
      fileDocument = await payload.findByID({
        collection: 'form_collection',
        id,
      });
    } catch {
      return NextResponse.json({ error: 'File document not found' }, { status: 404 });
    }

    if (typeof fileDocument.filename !== 'string' || fileDocument.filename.length === 0) {
      return NextResponse.json({ error: 'Filename not found' }, { status: 404 });
    }

    const getCommand = new GetObjectCommand({
      Bucket: MINIO_BUCKET_NAME,
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
    console.error('Failed to download form file:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
