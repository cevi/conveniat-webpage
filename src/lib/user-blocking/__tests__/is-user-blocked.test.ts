import prisma from '@/lib/db/prisma';
import {
  filterOutBlockedUserIds,
  invalidateBlockedStatusCache,
  isUserBlocked,
} from '@/lib/user-blocking/is-user-blocked';

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

/* eslint-disable @typescript-eslint/unbound-method */
const mockFindUnique = prisma.user.findUnique as unknown as jest.Mock;
const mockFindMany = prisma.user.findMany as unknown as jest.Mock;
/* eslint-enable @typescript-eslint/unbound-method */

describe('isUserBlocked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateBlockedStatusCache();
  });

  it('returns false without querying the database for an empty user id', async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    await expect(isUserBlocked(undefined)).resolves.toBe(false);
    await expect(isUserBlocked('')).resolves.toBe(false);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns true for a blocked user', async () => {
    mockFindUnique.mockResolvedValue({ blocked: true });
    await expect(isUserBlocked('user-1')).resolves.toBe(true);
  });

  it('returns false for a user that is not blocked', async () => {
    mockFindUnique.mockResolvedValue({ blocked: false });
    await expect(isUserBlocked('user-1')).resolves.toBe(false);
  });

  it('treats an unknown user as not blocked', async () => {
    // eslint-disable-next-line unicorn/no-null
    mockFindUnique.mockResolvedValue(null);
    await expect(isUserBlocked('unknown-user')).resolves.toBe(false);
  });

  it('fails open when the database is unavailable', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      /* silence expected error log */
    });
    mockFindUnique.mockRejectedValue(new Error('connection refused'));

    await expect(isUserBlocked('user-1')).resolves.toBe(false);
    consoleSpy.mockRestore();
  });

  it('caches the result to avoid a database round-trip per request', async () => {
    mockFindUnique.mockResolvedValue({ blocked: true });

    await isUserBlocked('user-1');
    await isUserBlocked('user-1');
    await isUserBlocked('user-1');

    expect(mockFindUnique).toHaveBeenCalledTimes(1);
  });

  it('re-reads the status after the cache was invalidated', async () => {
    mockFindUnique.mockResolvedValue({ blocked: false });
    await expect(isUserBlocked('user-1')).resolves.toBe(false);

    mockFindUnique.mockResolvedValue({ blocked: true });
    invalidateBlockedStatusCache('user-1');

    await expect(isUserBlocked('user-1')).resolves.toBe(true);
    expect(mockFindUnique).toHaveBeenCalledTimes(2);
  });

  it('only invalidates the given user', async () => {
    mockFindUnique.mockResolvedValue({ blocked: false });
    await isUserBlocked('user-1');
    await isUserBlocked('user-2');
    expect(mockFindUnique).toHaveBeenCalledTimes(2);

    invalidateBlockedStatusCache('user-1');
    await isUserBlocked('user-1');
    await isUserBlocked('user-2');

    expect(mockFindUnique).toHaveBeenCalledTimes(3);
  });
});

describe('filterOutBlockedUserIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty list untouched', async () => {
    await expect(filterOutBlockedUserIds([])).resolves.toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('removes blocked users while preserving the original order', async () => {
    mockFindMany.mockResolvedValue([{ uuid: 'user-2' }]);

    await expect(filterOutBlockedUserIds(['user-1', 'user-2', 'user-3'])).resolves.toEqual([
      'user-1',
      'user-3',
    ]);
  });

  it('keeps all users when none of them is blocked', async () => {
    mockFindMany.mockResolvedValue([]);
    await expect(filterOutBlockedUserIds(['user-1', 'user-2'])).resolves.toEqual([
      'user-1',
      'user-2',
    ]);
  });

  it('fails open when the database is unavailable', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {
      /* silence expected error log */
    });
    mockFindMany.mockRejectedValue(new Error('connection refused'));

    await expect(filterOutBlockedUserIds(['user-1'])).resolves.toEqual(['user-1']);
    consoleSpy.mockRestore();
  });
});
