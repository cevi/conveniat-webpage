import { skipSyncOfRestrictedDocuments } from '@/features/payload-cms/payload-cms/plugins/search/skip-sync';
import type { PayloadRequest } from 'payload';

interface PermissionFixture {
  special_permissions: { public: boolean; logged_in: boolean };
  permissions: { group_id: number; note: string }[];
}

const PERMISSIONS: Record<string, PermissionFixture> = {
  public: { special_permissions: { public: true, logged_in: false }, permissions: [] },
  loggedIn: { special_permissions: { public: false, logged_in: true }, permissions: [] },
  group: {
    special_permissions: { public: false, logged_in: false },
    permissions: [{ group_id: 42, note: '' }],
  },
};

const buildRequest = (
  findByID: jest.Mock = jest.fn(({ id }: { id: string }) => Promise.resolve(PERMISSIONS[id])),
): { request: PayloadRequest; deleteFromIndex: jest.Mock; logError: jest.Mock } => {
  const deleteFromIndex = jest.fn(() => Promise.resolve({ docs: [] }));
  const logError = jest.fn();
  const request = {
    payload: { findByID, delete: deleteFromIndex, logger: { error: logError } },
  } as unknown as PayloadRequest;
  return { request, deleteFromIndex, logError };
};

const skip = async (permissions: unknown, request: PayloadRequest): Promise<boolean> =>
  await skipSyncOfRestrictedDocuments({
    collectionSlug: 'generic-page',
    doc: { id: 'page-1', content: { permissions } },
    locale: 'de',
    req: request,
  });

describe('skipSyncOfRestrictedDocuments', () => {
  it.each([
    ['without a permission', undefined],
    ['with a public permission id', 'public'],
    ['with a populated public permission', PERMISSIONS['public']],
  ])('indexes a page %s', async (_, permissions) => {
    const { request, deleteFromIndex } = buildRequest();

    expect(await skip(permissions, request)).toBe(false);
    expect(deleteFromIndex).not.toHaveBeenCalled();
  });

  it.each([
    ['that requires a login', 'loggedIn'],
    ['that is limited to a Cevi.DB group', 'group'],
    ['with a populated group permission', PERMISSIONS['group']],
    ['whose permission no longer exists', 'trashed'],
  ])('skips a page %s and removes its index entry', async (_, permissions) => {
    const { request, deleteFromIndex } = buildRequest();

    expect(await skip(permissions, request)).toBe(true);
    expect(deleteFromIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'search-collection',
        where: {
          and: [
            { 'doc.relationTo': { equals: 'generic-page' } },
            { 'doc.value': { equals: 'page-1' } },
          ],
        },
      }),
    );
  });

  it('skips a page when the permission cannot be loaded', async () => {
    const { request, logError } = buildRequest(
      jest.fn(() => Promise.reject(new Error('database is down'))),
    );

    expect(await skip('public', request)).toBe(true);
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
