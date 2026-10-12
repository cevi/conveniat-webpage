/**
 * @jest-environment node
 */
/* eslint-disable unicorn/no-null -- Payload answers a missing document with `null` */

const findByID = jest.fn();
const find = jest.fn();

jest.mock('payload', () => ({
  getPayload: jest.fn(() => Promise.resolve({ findByID, find })),
}));
jest.mock('@payload-config', () => ({}), { virtual: true });

const getFeatureFlag = jest.fn();
jest.mock('@/lib/db/redis', () => ({
  getFeatureFlag: (key: string): unknown => getFeatureFlag(key),
}));

const hasAccessToThisUser = jest.fn();
jest.mock('@/features/payload-cms/payload-cms/access-rules/roles', () => ({
  EDITOR_ROLES: ['editor'],
  hasAccessToThisUser: (arguments_: unknown): unknown => hasAccessToThisUser(arguments_),
}));

jest.mock('@/features/payload-cms/payload-cms/collections/camp-schedule-entry-collection', () => ({
  LEADER_NOTES_CONTEXT: 'scheduleLeaderNotes',
}));

const getHofDirectory = jest.fn();
jest.mock('@/features/payload-cms/payload-cms/utils/hof-directory', () => ({
  getHofDirectory: (): unknown => getHofDirectory(),
}));

jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));

import { getLeaderNotesOfEntry, getQuartiereOfViewer } from '@/features/schedule/api/viewer';

const viewer = { uuid: 'user-1', group_ids: [] };
const notes = { safety: 'Gutes Schuhwerk.' };

/** The registrations Cevi.DB knows of one person, as the billing keeps them. */
const registeredAs = (...roleTypes: (string | null)[]): void => {
  find.mockResolvedValue({ docs: roleTypes.map((roleType) => ({ roleType })) });
};

beforeEach(() => {
  jest.clearAllMocks();
  hasAccessToThisUser.mockReturnValue(false);
  getFeatureFlag.mockResolvedValue(false);
  findByID.mockImplementation(({ collection }: { collection: string }) =>
    Promise.resolve(
      collection === 'users' ? { cevi_db_uuid: 4711, hoefe: ['hof-1'] } : { leaders: notes },
    ),
  );
});

describe('getLeaderNotesOfEntry', () => {
  it('hands the notes to somebody registered as a Hilfsleiter:in', async () => {
    registeredAs('Event::Role::AssistantLeader');

    await expect(getLeaderNotesOfEntry(viewer, 'entry-1', 'de')).resolves.toEqual(notes);
  });

  it('keeps them from a participant, and never reads the block for one', async () => {
    registeredAs('Event::Camp::Role::Participant');

    await expect(getLeaderNotesOfEntry(viewer, 'entry-1', 'de')).resolves.toBeUndefined();
    expect(findByID).not.toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'camp-schedule-entry' }),
    );
  });

  it('does not make a leader of somebody whose registration has no role', async () => {
    registeredAs(null, '');

    await expect(getLeaderNotesOfEntry(viewer, 'entry-1', 'de')).resolves.toBeUndefined();
  });

  it('keeps them from somebody who is not registered for the camp at all', async () => {
    registeredAs();

    await expect(getLeaderNotesOfEntry(viewer, 'entry-1', 'de')).resolves.toBeUndefined();
  });

  it('hands them to an editor, who needs no registration', async () => {
    hasAccessToThisUser.mockReturnValue(true);

    await expect(getLeaderNotesOfEntry(viewer, 'entry-1', 'de')).resolves.toEqual(notes);
    expect(find).not.toHaveBeenCalled();
  });
});

describe('getQuartiereOfViewer', () => {
  beforeEach(() => {
    getHofDirectory.mockResolvedValue(
      new Map([['hof-1', { name: 'Cevi Uster', quartier: { id: 'q3', name: 'Quartier 3' } }]]),
    );
  });

  it('finds the Quartier through the Hof of the registration', async () => {
    await expect(getQuartiereOfViewer(viewer)).resolves.toEqual([{ id: 'q3', name: 'Quartier 3' }]);
  });

  it('is empty for a guest, so the programme shows the whole camp', async () => {
    await expect(getQuartiereOfViewer()).resolves.toEqual([]);
  });

  it('is empty while the camp keeps the allocation to itself', async () => {
    getFeatureFlag.mockResolvedValue(true);

    await expect(getQuartiereOfViewer(viewer)).resolves.toEqual([]);
  });

  it('is empty for a user Payload no longer has', async () => {
    findByID.mockResolvedValue(null);

    await expect(getQuartiereOfViewer(viewer)).resolves.toEqual([]);
  });
});
