jest.mock('@/lib/s3', () => ({
  S3_BUCKET_NAME: 'bucket',
  s3Client: { send: jest.fn(() => Promise.resolve({})) },
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): object => ({ info: jest.fn(), warn: jest.fn() }),
}));

import {
  setProfilePicture,
  toProfilePicture,
} from '@/features/payload-cms/payload-cms/utils/profile-pictures';
import { s3Client } from '@/lib/s3';
import type { BasePayload } from 'payload';
import sharp from 'sharp';

interface S3Command {
  constructor: { name: string };
  input: { Key: string };
}
const send = (s3Client as unknown as { send: jest.Mock<Promise<unknown>, [S3Command]> }).send;
const update = jest.fn();
const payload = { update } as unknown as BasePayload;

/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- ESLint cannot resolve sharp's types */
const photo = (width: number, height: number): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: '#26785a' } })
    .jpeg()
    .toBuffer();

describe('toProfilePicture', () => {
  it('crops a photo to a 192px avatar and a 640px full-screen square, both webp', async () => {
    const { avatar, large } = await toProfilePicture(await photo(1200, 800));
    expect(await sharp(avatar).metadata()).toMatchObject({
      format: 'webp',
      width: 192,
      height: 192,
    });
    expect(await sharp(large).metadata()).toMatchObject({
      format: 'webp',
      width: 640,
      height: 640,
    });
  });

  it('does not enlarge a small photo for the full-screen square', async () => {
    const { large } = await toProfilePicture(await photo(500, 400));
    expect(await sharp(large).metadata()).toMatchObject({ width: 400, height: 400 });
  });
  /* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

  it('refuses what is not a photo', async () => {
    await expect(toProfilePicture(Buffer.from('<html></html>'))).rejects.toThrow();
    await expect(
      toProfilePicture(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'),
      ),
    ).rejects.toThrow();
  });
});

describe('setProfilePicture', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores the picture, points the user at it, then deletes the previous one', async () => {
    const version = await setProfilePicture(
      payload,
      'user-1',
      { avatar: Buffer.from('a'), large: Buffer.from('b') },
      'old',
    );

    expect(version).toMatch(/^[0-9a-f]{16}$/);
    expect(send.mock.calls.map(([command]) => command.input.Key)).toEqual([
      `profile-pictures/user-1/${version ?? ''}.webp`,
      `profile-pictures/user-1/${version ?? ''}-640.webp`,
      'profile-pictures/user-1/old.webp',
      'profile-pictures/user-1/old-640.webp',
    ]);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        data: { profilePictureVersion: version },
        context: { profilePictureUpload: true },
      }),
    );
  });

  it('removes the picture without storing one', async () => {
    await setProfilePicture(payload, 'user-1', undefined, 'old');

    expect(update).toHaveBeenCalledWith(
      // what Payload clears a field with
      expect.objectContaining({ data: { profilePictureVersion: null } }),
    );
    expect(send.mock.calls.map(([command]) => command.input.Key)).toEqual([
      'profile-pictures/user-1/old.webp',
      'profile-pictures/user-1/old-640.webp',
    ]);
  });
});
