import prisma from '@/lib/db/prisma';
import { S3_BUCKET_NAME, s3Client } from '@/lib/s3';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { profilePictureKey } from '@/utils/profile-picture-url';
import { createLogger } from '@/utils/server-logger';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { NextRequest } from 'next/server';

const logger = createLogger('api:profile-pictures');

/** A versioned URL never changes its picture, so the browser keeps it without asking again. */
const CACHE_OF_CURRENT_VERSION = 'private, max-age=31536000, immutable';

/**
 * Streams a user's profile picture, copied from Cevi.DB at their login. Like the address book,
 * only for logged-in users. A URL with an outdated version gets the current picture, but is
 * not cached, so the next list refresh brings the new URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<Response> {
  const session = await auth();
  if (!isValidNextAuthUser(session?.user)) return new Response('Unauthorized', { status: 401 });

  const { userId } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(userId)) return new Response('Not Found', { status: 404 });

  try {
    const user = await prisma.user.findUnique({
      where: { uuid: userId },
      select: { profilePictureVersion: true },
    });
    const version = user?.profilePictureVersion;
    if (version === undefined || version === null) {
      return new Response('Not Found', { status: 404 });
    }

    const object = await s3Client.send(
      new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: profilePictureKey(userId, version) }),
    );
    const body = object.Body?.transformToWebStream();
    if (body === undefined) return new Response('Not Found', { status: 404 });

    return new Response(body, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control':
          request.nextUrl.searchParams.get('v') === version
            ? CACHE_OF_CURRENT_VERSION
            : 'private, no-cache',
      },
    });
  } catch (error: unknown) {
    logger.warn('Could not serve a profile picture', { error, 'user.id': userId });
    return new Response('Not Found', { status: 404 });
  }
}
