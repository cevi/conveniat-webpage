jest.mock('@/features/payload-cms/payload-cms/utils/funktionen', () => ({
  refreshUserFunktionen: jest.fn(),
}));
jest.mock('@/features/payload-cms/payload-cms/utils/profile-pictures', () => ({
  toAvatar: jest.fn((photo: Buffer) => Promise.resolve(photo)),
  setProfilePicture: jest.fn(() => Promise.resolve('version')),
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): object => ({ info: jest.fn(), warn: jest.fn() }),
}));

import { setProfilePicture } from '@/features/payload-cms/payload-cms/utils/profile-pictures';
import {
  seedProfilePicturesOfFunktionen,
  uploadedPictureUrl,
} from '@/features/payload-cms/payload-cms/utils/seed-profile-pictures';
import { LEITUNG_ROLE_CLASS } from '@/features/payload-cms/payload-cms/utils/sync-funktionen';
import type { GroupRoleHolder } from '@/lib/hitobito/services/group.service';
import type { BasePayload } from 'payload';

const ORIGIN = 'https://db.example.ch';
const pictureOf = (personId: string): string =>
  `${ORIGIN}/rails/active_storage/blobs/redirect/blob-${personId}/profile.jpg`;

const holder = (personId: string, picture: string): GroupRoleHolder => ({
  personId,
  email: '',
  firstName: '',
  lastName: '',
  nickname: '',
  picture,
});

/** Ressort Infrastruktur 5001 and Ressort Programm 5002, with their leaders. */
const LEADERS: Record<string, GroupRoleHolder[]> = {
  '5001': [holder('11', pictureOf('11')), holder('12', pictureOf('12'))],
  '5002': [holder('13', `${ORIGIN}/packs/media/images/profile.svg`), holder('14', pictureOf('14'))],
};

/** 11 has no picture yet, 12 uploaded one, 13 has none in Cevi.DB, 14 never logged in. */
/* eslint-disable unicorn/no-null -- what Payload stores for an empty field */
const USERS = [
  { id: 'user-11', cevi_db_uuid: 11, profilePictureVersion: null },
  { id: 'user-12', cevi_db_uuid: 12, profilePictureVersion: 'own' },
  { id: 'user-13', cevi_db_uuid: 13, profilePictureVersion: null },
];
/* eslint-enable unicorn/no-null */

const find = jest.fn(({ collection }: { collection: string }) =>
  Promise.resolve({
    docs: collection === 'funktionen' ? [{ groupId: '5001' }, { groupId: '5002' }] : USERS,
  }),
);
const payload = { find } as unknown as BasePayload;
const listPeopleWithRole = jest.fn((groupId: string, roleClass: string) =>
  Promise.resolve(roleClass === LEITUNG_ROLE_CLASS ? (LEADERS[groupId] ?? []) : []),
);
const fetchMock = jest.fn(() =>
  Promise.resolve(
    new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }),
  ),
);

describe('seedProfilePicturesOfFunktionen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = fetchMock;
  });

  it('gives only the leaders without a picture their Cevi.DB picture', async () => {
    const result = await seedProfilePicturesOfFunktionen(payload, { listPeopleWithRole }, ORIGIN);

    expect(result).toEqual({
      holders: 4,
      seeded: 1,
      kept: 1,
      withoutPicture: 1,
      withoutUser: 1,
      failed: 0,
    });
    expect(setProfilePicture).toHaveBeenCalledTimes(1);
    expect(setProfilePicture).toHaveBeenCalledWith(
      payload,
      'user-11',
      expect.any(Buffer),
      undefined,
    );
    expect(fetchMock).toHaveBeenCalledWith(new URL(pictureOf('11')), expect.anything());
  });

  it('never downloads for someone who uploaded a picture of their own', async () => {
    await seedProfilePicturesOfFunktionen(payload, { listPeopleWithRole }, ORIGIN);

    expect(fetchMock).not.toHaveBeenCalledWith(new URL(pictureOf('12')), expect.anything());
    expect(setProfilePicture).not.toHaveBeenCalledWith(
      payload,
      'user-12',
      expect.anything(),
      expect.anything(),
    );
  });

  it('counts a failed download and carries on', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));

    const result = await seedProfilePicturesOfFunktionen(payload, { listPeopleWithRole }, ORIGIN);

    expect(result.failed).toBe(1);
    expect(setProfilePicture).not.toHaveBeenCalled();
  });

  it('changes nothing when Cevi.DB cannot be read', async () => {
    listPeopleWithRole.mockRejectedValueOnce(new Error('session expired'));

    await expect(
      seedProfilePicturesOfFunktionen(payload, { listPeopleWithRole }, ORIGIN),
    ).rejects.toThrow('session expired');
    expect(setProfilePicture).not.toHaveBeenCalled();
  });
});

describe('uploadedPictureUrl', () => {
  it('accepts an uploaded picture on the Cevi.DB origin only', () => {
    expect(uploadedPictureUrl(pictureOf('11'), ORIGIN)?.href).toBe(pictureOf('11'));
    expect(uploadedPictureUrl(`${ORIGIN}/packs/media/images/profile.svg`, ORIGIN)).toBeUndefined();
    expect(
      uploadedPictureUrl(
        'https://evil.example/rails/active_storage/blobs/redirect/x/y.jpg',
        ORIGIN,
      ),
    ).toBeUndefined();
    expect(uploadedPictureUrl('', ORIGIN)).toBeUndefined();
  });
});
