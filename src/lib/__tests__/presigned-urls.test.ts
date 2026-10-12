// A real client with made-up credentials: signing is local, so the URLs can be read back.
jest.mock('@/lib/s3', () => {
  const { S3Client } =
    jest.requireActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  return {
    S3_BUCKET_NAME: 'test-bucket',
    s3ClientPublic: new S3Client({
      credentials: { accessKeyId: 'test-key', secretAccessKey: 'test-secret' },
      region: 'us-east-1',
      forcePathStyle: true,
      endpoint: 'http://storage.example.test',
      requestChecksumCalculation: 'WHEN_REQUIRED',
    }),
  };
});

import { createPresignedDownloadUrl, createPresignedUploadUrl } from '@/lib/presigned-urls';
import { uploadInputShape, type UploadPolicy } from '@/lib/upload-policy';
import { z } from 'zod';

const PHOTO_UPLOAD: UploadPolicy<'image/jpeg' | 'image/png'> = {
  extensions: { 'image/jpeg': 'jpg', 'image/png': 'png' },
  maxBytes: 1024,
};

const upload = (
  input: Partial<Parameters<typeof createPresignedUploadUrl>[1]>,
): Promise<{ url: string; key: string }> =>
  createPresignedUploadUrl(PHOTO_UPLOAD as UploadPolicy, {
    keyPrefix: 'photos/anna-uuid/',
    contentType: 'image/png',
    contentLength: 512,
    ...input,
  });

describe('a presigned upload URL', () => {
  it('is bound to the declared type and size and expires after ten minutes', async () => {
    const { url } = await upload({});

    const signed = new URL(url);
    expect(signed.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host');
    expect(signed.searchParams.get('X-Amz-Expires')).toBe('600');
  });

  it('stores under a random name below the prefix, with the extension of the type', async () => {
    const first = await upload({});
    const second = await upload({ contentType: 'image/jpeg' });

    expect(first.key).toMatch(/^photos\/anna-uuid\/[\da-f-]{36}\.png$/);
    expect(second.key).toMatch(/^photos\/anna-uuid\/[\da-f-]{36}\.jpg$/);
    expect(new URL(first.url).pathname).toBe(`/test-bucket/${first.key}`);
    expect(first.key.slice(0, -4)).not.toBe(second.key.slice(0, -4));
  });

  it.each([
    ['a type the policy does not list', { contentType: 'text/html' }],
    ['a type that is only a property of every object', { contentType: 'toString' }],
    ['a size over the maximum', { contentLength: 1025 }],
    ['an empty file', { contentLength: 0 }],
    ['a size that is not a whole number', { contentLength: 12.5 }],
    ['a prefix the name would run into', { keyPrefix: 'photos/anna-uuid' }],
  ])('is not signed for %s, whatever the procedure let through', async (_case, input) => {
    await expect(upload(input)).rejects.toThrow('Upload refused');
  });
});

describe('the input a procedure takes for an upload', () => {
  const schema = z.object(uploadInputShape(PHOTO_UPLOAD));

  it('accepts what the policy allows, up to the maximum', () => {
    expect(schema.safeParse({ contentType: 'image/jpeg', contentLength: 1024 }).success).toBe(true);
  });

  it.each([
    { contentType: 'image/svg+xml', contentLength: 512 },
    { contentType: 'image/png', contentLength: 1025 },
    { contentType: 'image/png', contentLength: 0 },
    { contentType: 'image/png' },
  ])('refuses %o', (input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });
});

describe('a presigned download URL', () => {
  it('reads exactly the one object, for an hour', async () => {
    const signed = new URL(await createPresignedDownloadUrl('material-incidents/a.jpg'));

    expect(signed.pathname).toBe('/test-bucket/material-incidents/a.jpg');
    expect(signed.searchParams.get('X-Amz-Expires')).toBe('3600');
  });
});
