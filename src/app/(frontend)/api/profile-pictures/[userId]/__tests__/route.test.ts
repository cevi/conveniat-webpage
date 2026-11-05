const mockSend = jest.fn();
jest.mock('@/lib/s3', () => ({
  S3_BUCKET_NAME: 'bucket',
  s3Client: { send: (command: unknown): unknown => mockSend(command) },
}));
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: (): Promise<unknown> => Promise.resolve({ profilePictureVersion: 'v1' }) },
  },
}));
jest.mock('@/utils/auth', () => ({ auth: (): Promise<unknown> => Promise.resolve({ user: {} }) }));
jest.mock('@/utils/auth-helpers', () => ({ isValidNextAuthUser: (): boolean => true }));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): object => ({ warn: jest.fn() }),
}));

import { GET } from '@/app/(frontend)/api/profile-pictures/[userId]/route';
import { NextRequest } from 'next/server';

const USER = '65f000000000000000000001';

/** The bucket, by key; a missing key fails the way S3 does. */
let objects: Record<string, string>;

const keysRead = (): string[] =>
  mockSend.mock.calls.map(([command]) => (command as { input: { Key: string } }).input.Key);

const get = (query: string): Promise<Response> =>
  GET(new NextRequest(`http://localhost/api/profile-pictures/${USER}?${query}`), {
    params: Promise.resolve({ userId: USER }),
  });

beforeEach(() => {
  mockSend.mockReset().mockImplementation((command: { input: { Key: string } }) => {
    const body = objects[command.input.Key];
    if (body === undefined) {
      return Promise.reject(
        Object.assign(new Error('The specified key does not exist.'), { name: 'NoSuchKey' }),
      );
    }
    return Promise.resolve({
      Body: {
        transformToWebStream: (): ReadableStream => new Response(body).body as ReadableStream,
      },
    });
  });
});

describe('GET /api/profile-pictures/[userId]', () => {
  it('serves the avatar, and the full-screen picture with size=640', async () => {
    objects = {
      [`profile-pictures/${USER}/v1.webp`]: 'avatar',
      [`profile-pictures/${USER}/v1-640.webp`]: 'large',
    };

    const avatar = await get('v=v1');
    const large = await get('v=v1&size=640');

    expect(await avatar.text()).toBe('avatar');
    expect(await large.text()).toBe('large');
  });

  it('serves the avatar for size=640 when the picture is older than the large size', async () => {
    objects = { [`profile-pictures/${USER}/v1.webp`]: 'avatar' };

    const response = await get('v=v1&size=640');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('avatar');
    expect(keysRead()).toEqual([
      `profile-pictures/${USER}/v1-640.webp`,
      `profile-pictures/${USER}/v1.webp`,
    ]);
  });
});
