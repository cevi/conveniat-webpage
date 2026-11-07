import { defaultPublicPermission } from '@/features/payload-cms/payload-cms/shared-fields/permissions-field';
import type { PayloadRequest } from 'payload';

const PUBLIC_PERMISSION_ID = '65f0c1a2b3d4e5f6a7b8c9d0';

/** A request whose Payload answers the lookup with `docs`. */
const requestWith = (find: jest.Mock): PayloadRequest =>
  ({ context: {}, payload: { find } }) as unknown as PayloadRequest;

const publicPermission = (): jest.Mock =>
  jest.fn().mockResolvedValue({ docs: [{ id: PUBLIC_PERMISSION_ID }] });

describe('defaultPublicPermission', () => {
  it('is the permission marked public', async () => {
    const find = publicPermission();

    await expect(defaultPublicPermission({ req: requestWith(find) })).resolves.toBe(
      PUBLIC_PERMISSION_ID,
    );
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'permissions',
        where: { 'special_permissions.public': { equals: true } },
      }),
    );
  });

  it('is empty when no permission is marked public', async () => {
    const find = jest.fn().mockResolvedValue({ docs: [] });

    await expect(defaultPublicPermission({ req: requestWith(find) })).resolves.toBeUndefined();
  });

  it('looks the permission up once for all documents read in one request', async () => {
    const find = publicPermission();
    const request = requestWith(find);

    // a list of 50 pages fills the default of every page without a permission at once
    const ids = await Promise.all(
      Array.from({ length: 50 }, () => defaultPublicPermission({ req: request })),
    );

    expect(new Set(ids)).toEqual(new Set([PUBLIC_PERMISSION_ID]));
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('looks it up again in the next request, so a changed public permission shows at once', async () => {
    const find = publicPermission();

    await defaultPublicPermission({ req: requestWith(find) });
    await defaultPublicPermission({ req: requestWith(find) });

    expect(find).toHaveBeenCalledTimes(2);
  });

  it('tries again within the request after a failed lookup', async () => {
    const find = jest
      .fn()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValue({ docs: [{ id: PUBLIC_PERMISSION_ID }] });
    const request = requestWith(find);

    await expect(defaultPublicPermission({ req: request })).rejects.toThrow('connection reset');
    await expect(defaultPublicPermission({ req: request })).resolves.toBe(PUBLIC_PERMISSION_ID);
  });
});
