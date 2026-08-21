import { getHelperShifts } from '@/features/schedule/api/get-helper-shifts';
import { getFeatureFlag } from '@/lib/db/redis';
import type { PrismaClient } from '@/lib/prisma';

jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({
  getPayload: jest.fn(),
}));

jest.mock('next/cache', () => ({
  cacheLife: jest.fn(),
  cacheTag: jest.fn(),
}));

jest.mock('@/utils/is-pre-rendering', () => ({
  forceDynamicOnBuild: jest.fn().mockResolvedValue(false),
}));

jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));

jest.mock('@/lib/db/redis', () => ({
  getFeatureFlag: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  CourseType: {
    SHIFT: 'SHIFT',
    PROGRAM: 'PROGRAM',
  },
}));

jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    enrollment: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { getPayload } from 'payload';

describe('getHelperShifts', () => {
  const mockFind = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getPayload as unknown as jest.Mock).mockResolvedValue({
      find: mockFind,
    });
  });

  const sampleShifts = [
    {
      id: 'shift-open',
      title: 'Open Shift',
      description: 'An open shift',
      timeslot: { date: '2026-08-01', time: '08:00 - 12:00' },
      participants_max: 5,
      hide_when_full: true,
    },
    {
      id: 'shift-full',
      title: 'Full Shift',
      description: 'A full shift',
      timeslot: { date: '2026-08-01', time: '12:00 - 16:00' },
      participants_max: 2,
      hide_when_full: true,
    },
    {
      id: 'shift-full-override',
      title: 'Full Shift Override',
      description: 'Full shift with hide_when_full=false',
      timeslot: { date: '2026-08-01', time: '16:00 - 20:00' },
      participants_max: 2,
      hide_when_full: false,
    },
  ];

  it('returns all shifts if hide_full_helper_shifts feature flag is disabled', async () => {
    (getFeatureFlag as jest.Mock).mockResolvedValue(false);
    mockFind.mockResolvedValue({ docs: sampleShifts });

    const result = await getHelperShifts({}, 'de');

    expect(result).toHaveLength(3);
    expect(result.map((shift) => shift.id)).toEqual([
      'shift-open',
      'shift-full',
      'shift-full-override',
    ]);
  });

  it('hides full shift for unenrolled user when feature flag is active', async () => {
    (getFeatureFlag as jest.Mock).mockResolvedValue(true);
    mockFind.mockResolvedValue({ docs: sampleShifts });

    const mockPrisma = {
      enrollment: {
        groupBy: jest.fn().mockResolvedValue([
          { courseId: 'shift-open', _count: { courseId: 1 } },
          { courseId: 'shift-full', _count: { courseId: 2 } },
          { courseId: 'shift-full-override', _count: { courseId: 2 } },
        ]),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const result = await getHelperShifts({}, 'de', {
      prisma: mockPrisma as unknown as PrismaClient,
      user: undefined,
    });

    expect(result).toHaveLength(2);
    expect(result.map((shift) => shift.id)).toEqual(['shift-open', 'shift-full-override']);
  });

  it('includes full shift if user is enrolled in it', async () => {
    (getFeatureFlag as jest.Mock).mockResolvedValue(true);
    mockFind.mockResolvedValue({ docs: sampleShifts });

    const mockPrisma = {
      enrollment: {
        groupBy: jest.fn().mockResolvedValue([
          { courseId: 'shift-open', _count: { courseId: 1 } },
          { courseId: 'shift-full', _count: { courseId: 2 } },
          { courseId: 'shift-full-override', _count: { courseId: 2 } },
        ]),
        findMany: jest.fn().mockResolvedValue([{ courseId: 'shift-full' }]),
      },
    };

    const result = await getHelperShifts({}, 'de', {
      prisma: mockPrisma as unknown as PrismaClient,
      user: { uuid: 'user-123' },
    });

    expect(result).toHaveLength(3);
    expect(result.map((shift) => shift.id)).toEqual([
      'shift-open',
      'shift-full',
      'shift-full-override',
    ]);
  });

  /**
   * The organiser relationship carries the whole user document at `depth: 1`, and this result is
   * shared cache handed to every helper - so only the three fields the contact block renders may
   * ride along. Roles, the Hitobito payload and everything else must be dropped here.
   */
  describe('the organisers', () => {
    beforeEach(() => {
      (getFeatureFlag as jest.Mock).mockResolvedValue(false);
    });

    it('are narrowed to the fields the helper portal renders', async () => {
      mockFind.mockResolvedValue({
        docs: [
          {
            id: 'shift-1',
            title: 'Aufbau',
            description: 'Aufbau der Stände',
            timeslot: { date: '2026-08-01', time: '08:00 - 12:00' },
            organiser: [
              {
                id: 'org-1',
                fullName: 'Otto Organisator',
                email: 'otto@example.test',
                roles: ['admin'],
                hitobitoId: 4242,
              },
            ],
          },
        ],
      });

      const [shift] = await getHelperShifts({}, 'de');

      expect(shift?.organiser).toEqual([
        { id: 'org-1', fullName: 'Otto Organisator', email: 'otto@example.test' },
      ]);
    });

    it('default to an empty list on a shift that has none', async () => {
      mockFind.mockResolvedValue({
        docs: [
          {
            id: 'shift-1',
            title: 'Aufbau',
            description: 'Aufbau der Stände',
            timeslot: { date: '2026-08-01', time: '08:00 - 12:00' },
          },
        ],
      });

      const [shift] = await getHelperShifts({}, 'de');

      expect(shift?.organiser).toEqual([]);
    });

    /**
     * A relationship comes back as a bare ID string when it did not populate - which is also
     * what a pointer at a since-deleted user degrades to. Rendering it would put a nameless
     * contact row with a chat button going nowhere on the card.
     */
    it('drop entries that did not populate', async () => {
      mockFind.mockResolvedValue({
        docs: [
          {
            id: 'shift-1',
            title: 'Aufbau',
            description: 'Aufbau der Stände',
            timeslot: { date: '2026-08-01', time: '08:00 - 12:00' },
            organiser: ['org-unpopulated', { id: 'org-1', fullName: 'Otto', email: 'o@e.te' }],
          },
        ],
      });

      const [shift] = await getHelperShifts({}, 'de');

      expect(shift?.organiser).toEqual([{ id: 'org-1', fullName: 'Otto', email: 'o@e.te' }]);
    });
  });
});
