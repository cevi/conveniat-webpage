jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
  },
}));

let leads = false;
jest.mock('@/features/payload-cms/payload-cms/utils/is-leader', () => ({
  isLeader: (): Promise<boolean> => Promise.resolve(leads),
}));

import { readStoryImage } from '@/features/story/payload-cms/story-images-collection';
import type { PayloadRequest } from 'payload';

const requestOf = (user: { id: string; groups: { id: number }[] } | null): PayloadRequest =>
  ({ user, payload: {} }) as unknown as PayloadRequest;

const read = (user: { id: string; groups: { id: number }[] } | null): unknown =>
  readStoryImage({ req: requestOf(user) } as Parameters<typeof readStoryImage>[0]);

describe('who may fetch a picture of the story', () => {
  beforeEach(() => {
    leads = false;
    jest.useFakeTimers().setSystemTime(new Date('2027-07-27T19:00:00.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('lets the editors see every picture, also of figures still to come', async () => {
    await expect(read({ id: 'editor', groups: [{ id: 107 }] })).resolves.toBe(true);
  });

  it('gives a guest and a participant who does not lead nothing', async () => {
    await expect(read(null)).resolves.toBe(false);
    await expect(read({ id: 'participant', groups: [] })).resolves.toBe(false);
  });

  it('gives a Leitende/r only the pictures of figures that have appeared', async () => {
    leads = true;
    await expect(read({ id: 'leader', groups: [] })).resolves.toEqual({
      visibleFrom: { less_than_equal: '2027-07-27T19:00:00.000Z' },
    });
  });
});
