import {
  isStarredRow,
  MAX_STAR_CHANGES_PER_SYNC,
  pendingStarChanges,
  reconcileStars,
  type StarRowWrites,
  type StarSyncBatch,
} from '@/lib/star-sync';
import type { StarRecord } from '@/lib/tanstack-db';

type Device = Map<string, StarRecord>;

let clock = 1;

/** What `setLocalStar` does to the stored rows. */
const setStar = (device: Device, id: string, starred: boolean): void => {
  clock += 1;
  device.set(id, { id, starred, starredAt: clock, synced: false });
};

const apply = (device: Device, writes: StarRowWrites): void => {
  for (const row of [...writes.insert, ...writes.update]) device.set(row.id, row);
  for (const id of writes.delete) device.delete(id);
};

/** The database side of `updateStars`, for one user. */
const answer = (database: Set<string>, batch: StarSyncBatch): string[] => {
  for (const { courseId, starred } of batch.changes) {
    if (starred) database.add(courseId);
    else database.delete(courseId);
  }
  return [...database];
};

const sync = (device: Device, database: Set<string>): void => {
  const batch = pendingStarChanges([...device.values()]);
  const remoteIds = answer(database, batch);
  apply(device, reconcileStars([...device.values()], batch.sentAt, remoteIds, clock));
};

const shownStars = (device: Device): string[] =>
  [...device.values()]
    .filter((row) => isStarredRow(row))
    .map((row) => row.id)
    .sort();

describe('star sync', () => {
  it('restores the stars from the database on a device without any', () => {
    const database = new Set(['seilbruecke', 'theater']);
    const device: Device = new Map();

    sync(device, database);

    expect(shownStars(device)).toEqual(['seilbruecke', 'theater']);
  });

  it('keeps a star removed offline removed once the device is back online', () => {
    const database = new Set<string>();
    const device: Device = new Map();
    setStar(device, 'seilbruecke', true);
    sync(device, database);

    setStar(device, 'seilbruecke', false); // offline: nothing is sent
    expect(shownStars(device)).toEqual([]);

    sync(device, database);

    expect([...database]).toEqual([]);
    expect(shownStars(device)).toEqual([]);
    expect(device.size).toBe(0);
  });

  it('removes a star on this device that was removed on another one', () => {
    const database = new Set(['seilbruecke']);
    const phone: Device = new Map();
    const tablet: Device = new Map();
    sync(phone, database);
    sync(tablet, database);

    setStar(phone, 'seilbruecke', false);
    sync(phone, database);
    sync(tablet, database);

    expect([...database]).toEqual([]);
    expect(shownStars(tablet)).toEqual([]);
  });

  it('keeps a change made while the request was out for the next sync', () => {
    const database = new Set(['seilbruecke']);
    const device: Device = new Map();
    sync(device, database);

    const batch = pendingStarChanges([...device.values()]);
    const remoteIds = answer(database, batch);
    setStar(device, 'seilbruecke', false); // tapped before the answer arrived
    apply(device, reconcileStars([...device.values()], batch.sentAt, remoteIds, clock));

    expect(shownStars(device)).toEqual([]);
    sync(device, database);
    expect([...database]).toEqual([]);
  });

  it('sends a star stored before the sync kept its state as an addition', () => {
    const database = new Set<string>();
    const device: Device = new Map([['theater', { id: 'theater', starredAt: 1 }]]);

    sync(device, database);

    expect([...database]).toEqual(['theater']);
    expect(device.get('theater')?.synced).toBe(true);
  });

  it('shows a star again that the database keeps, like an organiser block', () => {
    const device: Device = new Map();
    setStar(device, 'eigener-block', false);
    const batch = pendingStarChanges([...device.values()]);

    apply(device, reconcileStars([...device.values()], batch.sentAt, ['eigener-block'], clock));

    expect(shownStars(device)).toEqual(['eigener-block']);
  });

  it('sends no more changes than one request may carry and keeps the rest', () => {
    const database = new Set<string>();
    const device: Device = new Map();
    for (let index = 0; index <= MAX_STAR_CHANGES_PER_SYNC; index += 1) {
      setStar(device, `block-${String(index)}`, true);
    }

    sync(device, database);

    expect(database.size).toBe(MAX_STAR_CHANGES_PER_SYNC);
    expect(pendingStarChanges([...device.values()]).changes).toHaveLength(1);
    sync(device, database);
    expect(database.size).toBe(MAX_STAR_CHANGES_PER_SYNC + 1);
  });
});
