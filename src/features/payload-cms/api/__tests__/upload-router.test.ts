import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): object => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));
// Only the wire transformer; a direct caller never serializes anything.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));

/** Calls counted so far per rate limit key; the window never ends within a test. */
const rateLimitCounts = new Map<string, number>();
jest.mock('@/lib/db/redis', () => ({
  redis: {
    eval: (_script: string, _keys: number, key: string): Promise<number> => {
      const count = (rateLimitCounts.get(key) ?? 0) + 1;
      rateLimitCounts.set(key, count);
      return Promise.resolve(count);
    },
  },
}));

// A real public client with made-up credentials: signing is local, so the URL can be read back.
jest.mock('@/lib/s3', () => {
  const { S3Client } =
    jest.requireActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  return {
    S3_BUCKET_NAME: 'test-bucket',
    s3Client: { send: jest.fn() },
    s3ClientPublic: new S3Client({
      credentials: { accessKeyId: 'test-key', secretAccessKey: 'test-secret' },
      region: 'us-east-1',
      forcePathStyle: true,
      endpoint: 'http://storage.example.test',
      requestChecksumCalculation: 'WHEN_REQUIRED',
    }),
  };
});

const find = jest.fn();
const create = jest.fn();
jest.mock('payload', () => ({
  getPayload: jest.fn(() => Promise.resolve({ find, create })),
}));

import { uploadRouter } from '@/features/payload-cms/api/upload-router';
import { s3Client } from '@/lib/s3';
import sharp from 'sharp';

interface S3Command {
  constructor: { name: string };
  input: { Key: string };
}
const send = (s3Client as unknown as { send: jest.Mock<Promise<unknown>, [S3Command]> }).send;

const ANNA = 'anna-uuid';
const BEAT = 'beat-uuid';

const createCaller = createCallerFactory(uploadRouter);
const as = (uuid: string): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name: uuid, email: `${uuid}@example.test` },
    prisma: {},
    locale: 'de',
  } as unknown as Context);

/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- ESLint cannot resolve sharp's types */
const photo = (width: number, height: number): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: '#26785a' } })
    .jpeg()
    .toBuffer();
/* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

/** The bucket holds this one upload; every other command just succeeds. */
const storeUpload = (bytes: Buffer): void => {
  send.mockImplementation((command) =>
    Promise.resolve(
      command.constructor.name === 'GetObjectCommand'
        ? {
            ContentLength: bytes.length,
            ContentType: 'image/jpeg',
            Body: {
              transformToByteArray: (): Promise<Uint8Array> =>
                Promise.resolve(new Uint8Array(bytes)),
            },
          }
        : {},
    ),
  );
};

const deletedKeys = (): string[] =>
  send.mock.calls
    .filter(([command]) => command.constructor.name === 'DeleteObjectCommand')
    .map(([command]) => command.input.Key);

interface CompleteInput {
  key: string;
  description: string;
  originalFilename: string;
}
const completeInput = (key: string): CompleteInput => ({
  key,
  description: 'Lagerfeuer am Abend',
  originalFilename: 'lagerfeuer.jpg',
});

beforeEach(() => {
  jest.clearAllMocks();
  rateLimitCounts.clear();
  find.mockResolvedValue({ totalDocs: 0 });
});

describe('the upload URL for a submitted image', () => {
  it('is only valid for the declared type and size, under the user’s own prefix', async () => {
    const { url, key } = await as(ANNA).createUploadUrl({
      contentType: 'image/png',
      contentLength: 2048,
    });

    expect(key).toMatch(/^temp\/anna-uuid\/[\w-]+\.png$/);
    const signed = new URL(url);
    expect(signed.pathname).toBe(`/test-bucket/${key}`);
    expect(signed.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;content-type;host');
    expect(signed.searchParams.get('X-Amz-Expires')).toBe('600');
  });

  it('is refused for a file over 50 MB and for a type that is not a photo', async () => {
    await expect(
      as(ANNA).createUploadUrl({ contentType: 'image/jpeg', contentLength: 50 * 1024 * 1024 + 1 }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      as(ANNA).createUploadUrl({ contentType: 'image/svg+xml' as 'image/png', contentLength: 10 }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('is handed out 30 times in a row, then no more, without holding back anybody else', async () => {
    const input = { contentType: 'image/jpeg', contentLength: 2048 } as const;
    for (let call = 0; call < 30; call++) await as(ANNA).createUploadUrl(input);

    await expect(as(ANNA).createUploadUrl(input)).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
      message: expect.stringContaining('ein paar Minuten') as string,
    });
    await expect(as(BEAT).createUploadUrl(input)).resolves.toBeDefined();
  });
});

describe('completing an upload', () => {
  it('stores the image and removes the temporary upload', async () => {
    storeUpload(await photo(1920, 1080));
    const key = `temp/${ANNA}/0190a5b2.jpg`;

    await expect(as(ANNA).completeUserUpload(completeInput(key))).resolves.toEqual({
      success: true,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'userSubmittedImages',
        data: expect.objectContaining({ uploaded_by: ANNA }) as unknown,
      }),
    );
    expect(deletedKeys()).toEqual([key]);
  });

  it('removes an upload it turns away, here an image that is too small', async () => {
    storeUpload(await photo(640, 480));
    const key = `temp/${ANNA}/0190a5b2.jpg`;

    await expect(as(ANNA).completeUserUpload(completeInput(key))).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    expect(create).not.toHaveBeenCalled();
    expect(deletedKeys()).toEqual([key]);
  });

  it.each([`temp/${BEAT}/0190a5b2.jpg`, `temp/${ANNA}/../${BEAT}/0190a5b2.jpg`, 'temp/old.jpg'])(
    'leaves %s alone, which is not the caller’s own upload',
    async (key) => {
      await expect(as(ANNA).completeUserUpload(completeInput(key))).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });

      expect(send).not.toHaveBeenCalled();
    },
  );
});
