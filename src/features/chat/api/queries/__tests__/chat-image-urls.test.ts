import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';

const ADMIN_GROUP_ID = 4242;

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [4242],
    CEVIDB_GROUP_WEB_CORE_TEAM: [],
    CEVIDB_GROUP_TRANSLATION_TEAM: [],
    CEVIDB_GROUP_PROGRAM_TEAM: [],
    CEVIDB_GROUP_MATERIAL_TEAM: [],
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: [],
  },
}));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): { warn: () => void; debug: () => void } => ({
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));
jest.mock('@/lib/db/redis', () => ({ getFeatureFlag: jest.fn().mockResolvedValue(true) }));
// Only the wire transformer; a direct caller never serializes anything.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));

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

const CHAT_ID = '0190a5b2-0000-7000-8000-000000000001';
const OTHER_CHAT_ID = '0190a5b2-0000-7000-8000-000000000002';

let chatCapabilities: string[];

/** One chat with one member; the capability lookup reads the chat through the shared client. */
const prisma = {
  chat: {
    findUnique: jest.fn(() => Promise.resolve({ capabilities: chatCapabilities })),
  },
  chatMembership: {
    findUnique: jest.fn(
      ({ where }: { where: { userId_chatId: { userId: string; chatId: string } } }) => {
        const { userId, chatId } = where.userId_chatId;
        const isMember = userId === 'member-1' && chatId === CHAT_ID;
        // eslint-disable-next-line unicorn/no-null
        return Promise.resolve(isMember ? { userId } : null);
      },
    ),
  },
};
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  get default(): unknown {
    return prisma;
  },
}));

import { getUploadUrl } from '@/features/chat/api/mutations/get-upload-url';
import { getDownloadUrl } from '@/features/chat/api/queries/get-download-url';

const member = { uuid: 'member-1', group_ids: [], name: 'Anna Muster', email: 'a@example.test' };
const outsider = { uuid: 'outsider-1', group_ids: [], name: 'Max Muster', email: 'm@example.test' };
const admin = {
  uuid: 'admin-1',
  group_ids: [ADMIN_GROUP_ID],
  name: 'Erika Beispiel',
  email: 'e@example.test',
};

const createCaller = createCallerFactory(createTRPCRouter({ getUploadUrl, getDownloadUrl }));

const callerAs = (user: unknown): ReturnType<typeof createCaller> =>
  createCaller({ user, prisma, locale: 'de' } as unknown as Context);

const ownImage = `chat-images/${CHAT_ID}/1700000000000-abc123.jpg`;

const pngUpload = { chatId: CHAT_ID, contentType: 'image/png', contentLength: 2048 } as const;

beforeEach(() => {
  chatCapabilities = ['PICTURE_UPLOAD'];
});

describe('chat image downloads', () => {
  it('signs a link to an image of the chat for a member', async () => {
    const { url } = await callerAs(member).getDownloadUrl({ chatId: CHAT_ID, key: ownImage });

    const signed = new URL(url);
    expect(signed.pathname).toBe(`/test-bucket/${ownImage}`);
    expect(signed.searchParams.get('X-Amz-Signature')).toBeTruthy();
  });

  it('answers not found to someone who only knows the chat id', async () => {
    await expect(
      callerAs(outsider).getDownloadUrl({ chatId: CHAT_ID, key: ownImage }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('lets an admin see the images of a chat they are not in', async () => {
    await expect(
      callerAs(admin).getDownloadUrl({ chatId: CHAT_ID, key: ownImage }),
    ).resolves.toHaveProperty('url');
  });

  it.each([
    ['an image of another chat', `chat-images/${OTHER_CHAT_ID}/1700000000000-abc123.jpg`],
    ['an export', 'exports/participants.csv'],
    ['a form upload', 'form-submission-upload.pdf'],
    ['a path out of the prefix', `chat-images/${CHAT_ID}/../../exports/participants.csv`],
    ['a nested path', `chat-images/${CHAT_ID}/../${OTHER_CHAT_ID}/x.jpg`],
    ['the bare prefix', `chat-images/${CHAT_ID}/`],
  ])('refuses a member %s', async (_, key) => {
    await expect(callerAs(member).getDownloadUrl({ chatId: CHAT_ID, key })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('refuses an admin a key outside the chat as well', async () => {
    await expect(
      callerAs(admin).getDownloadUrl({ chatId: CHAT_ID, key: 'exports/participants.csv' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('chat image uploads', () => {
  it('signs an upload into the chat, bound to the declared type and size', async () => {
    const { url, key } = await callerAs(member).getUploadUrl(pngUpload);

    expect(key).toMatch(new RegExp(String.raw`^chat-images/${CHAT_ID}/[^/]+\.png$`));
    const signed = new URL(url);
    expect(signed.pathname).toBe(`/test-bucket/${key}`);
    // The storage recomputes the signature over these headers, so a different body size or
    // content type is refused with SignatureDoesNotMatch.
    expect(signed.searchParams.get('X-Amz-SignedHeaders')?.split(';')).toEqual(
      expect.arrayContaining(['content-length', 'content-type']),
    );
  });

  it('takes the extension from the content type', async () => {
    const { key } = await callerAs(member).getUploadUrl({
      ...pngUpload,
      contentType: 'image/jpeg',
    });

    expect(key.endsWith('.jpg')).toBe(true);
  });

  it('answers not found to someone who only knows the chat id', async () => {
    await expect(callerAs(outsider).getUploadUrl(pngUpload)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('refuses a member when the chat has picture upload turned off', async () => {
    chatCapabilities = [];

    await expect(callerAs(member).getUploadUrl(pngUpload)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it.each(['image/svg+xml', 'text/html', 'application/pdf', ''])(
    'refuses the content type %j',
    async (contentType) => {
      await expect(
        callerAs(member).getUploadUrl({ ...pngUpload, contentType } as unknown as typeof pngUpload),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    },
  );

  it.each([0, 20 * 1024 * 1024 + 1])('refuses a size of %d bytes', async (contentLength) => {
    await expect(
      callerAs(member).getUploadUrl({ ...pngUpload, contentLength }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('refuses a request without a size, as sent by a client from before the limit', async () => {
    await expect(
      callerAs(member).getUploadUrl({
        chatId: CHAT_ID,
        fileName: 'photo.png',
        contentType: 'image/png',
      } as unknown as typeof pngUpload),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
