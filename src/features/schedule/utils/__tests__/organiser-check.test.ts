import { isOrganiserOf } from '@/features/schedule/utils/organiser-check';

const ME = '6952e118844a16df281b3c6e';
const SOMEBODY_ELSE = '6952e091dadf4f28c0c5c5c3';

/** Stand-in for a Mongo `ObjectId`, which only yields its hex through `toHexString()`. */
const objectId = (hex: string): object => ({
  toHexString: (): string => hex,
  toString: (): string => hex,
});

describe('isOrganiserOf', () => {
  it('recognises an organiser in a populated relationship', () => {
    expect(isOrganiserOf([{ id: ME, fullName: 'Cyrill' }], ME)).toBe(true);
  });

  it('recognises an organiser in a relationship of bare id strings', () => {
    expect(isOrganiserOf([SOMEBODY_ELSE, ME], ME)).toBe(true);
  });

  /**
   * The shape that made a real organiser look like a stranger: reading `.id` off a bare
   * `ObjectId` is `undefined`, which equals no user id.
   */
  it('recognises an organiser in a relationship of raw ObjectIds', () => {
    expect(isOrganiserOf([objectId(SOMEBODY_ELSE), objectId(ME)], ME)).toBe(true);
  });

  it('recognises an organiser in a relationship that mixes the shapes', () => {
    expect(isOrganiserOf([SOMEBODY_ELSE, objectId(ME)], ME)).toBe(true);
  });

  it('rejects somebody who does not organise the entry', () => {
    expect(isOrganiserOf([{ id: SOMEBODY_ELSE }, SOMEBODY_ELSE], ME)).toBe(false);
  });

  it('rejects an anonymous visitor', () => {
    const noUser: string | undefined = undefined;
    expect(isOrganiserOf([{ id: ME }], noUser)).toBe(false);
    expect(isOrganiserOf([{ id: ME }], '')).toBe(false);
  });

  it('treats an entry with no organisers as organised by nobody', () => {
    expect(isOrganiserOf([], ME)).toBe(false);
    // eslint-disable-next-line unicorn/no-null
    expect(isOrganiserOf(null, ME)).toBe(false);
  });

  /**
   * An unusable entry must not stringify to `[object Object]` and accidentally match, nor throw.
   */
  it('ignores entries that carry no usable id', () => {
    // eslint-disable-next-line unicorn/no-null
    expect(isOrganiserOf([null, undefined, {}, 42], ME)).toBe(false);
  });
});
