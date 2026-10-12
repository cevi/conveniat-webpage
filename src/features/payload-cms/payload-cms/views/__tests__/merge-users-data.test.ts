jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));

import {
  listUserReferencePaths,
  replaceUserReferences,
} from '@/features/payload-cms/payload-cms/views/merge-users-data';
import type { FlattenedBlock, FlattenedField } from 'payload';

const SOURCE = '0123456789abcdef01234567';
const TARGET = '89abcdef0123456789abcdef';

/** Stands in for the driver's ObjectId, which is told apart by `_bsontype` alone. */
class ObjectId {
  readonly _bsontype = 'ObjectId';
  constructor(private readonly hex: string) {}
  toString(): string {
    return this.hex;
  }
}

const context = { localeCodes: ['de', 'fr'], blocks: new Map<string, FlattenedBlock>() };
const fields = (definition: unknown): FlattenedField[] => definition as FlattenedField[];

describe('finding where a document refers to a user', () => {
  it('lists relationships to users and leaves the others out', () => {
    const paths = listUserReferencePaths(
      fields([
        { name: 'organiser', type: 'relationship', relationTo: 'users', hasMany: true },
        { name: 'image', type: 'upload', relationTo: 'images' },
        { name: 'title', type: 'text' },
      ]),
      context,
    );

    expect(paths).toEqual(['organiser']);
  });

  it('follows groups, arrays and blocks down to the relationship', () => {
    const author = { name: 'author', type: 'relationship', relationTo: 'users' };
    const paths = listUserReferencePaths(
      fields([
        { name: 'review', type: 'group', flattenedFields: [author] },
        { name: 'rows', type: 'array', flattenedFields: [author] },
        { name: 'layout', type: 'blocks', blocks: [{ slug: 'quote', flattenedFields: [author] }] },
      ]),
      context,
    );

    expect(paths).toEqual(['review.author', 'rows.author', 'layout.author']);
  });

  it('names one path per locale for a localized field, and only once below it', () => {
    const paths = listUserReferencePaths(
      fields([
        {
          name: 'content',
          type: 'group',
          localized: true,
          flattenedFields: [
            { name: 'author', type: 'relationship', relationTo: 'users', localized: true },
          ],
        },
      ]),
      context,
    );

    expect(paths).toEqual(['content.de.author', 'content.fr.author']);
  });

  it('points at the value of a relationship that may name several collections', () => {
    const paths = listUserReferencePaths(
      fields([{ name: 'owner', type: 'relationship', relationTo: ['users', 'hoefe'] }]),
      context,
    );

    expect(paths).toEqual(['owner.value']);
  });

  it('ends at a block that contains itself', () => {
    const nested = { slug: 'nested', flattenedFields: [] as unknown[] };
    nested.flattenedFields.push(
      { name: 'author', type: 'relationship', relationTo: 'users' },
      { name: 'children', type: 'blocks', blocks: [], blockReferences: ['nested'] },
    );

    const paths = listUserReferencePaths(
      fields([{ name: 'layout', type: 'blocks', blocks: [], blockReferences: ['nested'] }]),
      { ...context, blocks: new Map([['nested', nested as unknown as FlattenedBlock]]) },
    );

    expect(paths).toEqual(['layout.author']);
  });
});

describe('pointing a document at the user that stays', () => {
  const target = new ObjectId(TARGET);

  it('replaces the id wherever it sits and keeps its form', () => {
    const other = new ObjectId('ffffffffffffffffffffffff');
    const document = {
      organiser: new ObjectId(SOURCE),
      rows: [{ author: new ObjectId(SOURCE) }, { author: other }],
      input: { userId: SOURCE },
    };

    expect(replaceUserReferences(document, SOURCE, target)).toEqual({
      organiser: target,
      rows: [{ author: target }, { author: other }],
      input: { userId: TARGET },
    });
  });

  it('names the target once in a list that named both users', () => {
    const other = new ObjectId('ffffffffffffffffffffffff');
    const authors = [target, other, new ObjectId(SOURCE)];

    expect(replaceUserReferences(authors, SOURCE, target)).toEqual([target, other]);
  });

  it('returns the very same value when nothing refers to the source', () => {
    const document = { organiser: target, createdAt: new Date(0), rows: [{ title: 'Uster' }] };

    expect(replaceUserReferences(document, SOURCE, target)).toBe(document);
  });
});
