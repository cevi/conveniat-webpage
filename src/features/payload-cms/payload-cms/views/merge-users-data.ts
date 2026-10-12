import prisma from '@/lib/db/prisma';
import type { Prisma } from '@/lib/prisma/client';
import type { BasePayload, FlattenedBlock, FlattenedField, SanitizedConfig } from 'payload';

/*
 * Merging two user records of one person. A user is referenced from both stores: by foreign
 * keys in Postgres and by relationship fields in Payload. Neither list is written down here.
 * The foreign keys are read from the Postgres catalogue and the relationship fields from the
 * Payload config, so a model or a field added later is moved along without anyone remembering
 * this file. A hand-kept list would lose data quietly: `PresenceLog` and `PhotoContestVote`
 * cascade on delete.
 */

/** Payload's own bookkeeping per user. It is dropped with the user instead of being moved. */
const COLLECTIONS_DROPPED_WITH_THE_USER = [
  'payload-preferences',
  'payload-locked-documents',
] as const;
const DROPPED_WITH_THE_USER = new Set<string>(COLLECTIONS_DROPPED_WITH_THE_USER);

/** How many rows or documents of one table or collection point at a user. */
export interface ReferenceCount {
  store: 'postgres' | 'payload';
  name: string;
  count: number;
}

interface PathContext {
  localeCodes: string[];
  blocks: Map<string, FlattenedBlock>;
  /** Slugs of the blocks around the current field, so a block nested in itself ends. */
  blockChain?: string[];
}

/**
 * The Mongo paths under which a document with these fields stores a reference to a user. Arrays
 * need no marker, a dotted Mongo query walks into them by itself.
 */
export const listUserReferencePaths = (
  fields: FlattenedField[],
  context: PathContext,
  prefix = '',
  parentIsLocalized = false,
): string[] =>
  fields.flatMap((field): string[] => {
    if (field.type === 'join' || ('virtual' in field && Boolean(field.virtual))) return [];
    // Payload localizes a field once: below a localized parent it is stored plainly
    const localized = field.localized === true && !parentIsLocalized;
    const paths = localized
      ? context.localeCodes.map((code) => `${prefix}${field.name}.${code}`)
      : [`${prefix}${field.name}`];
    const inside = (subFields: FlattenedField[], chain = context.blockChain): string[] =>
      paths.flatMap((path) =>
        listUserReferencePaths(
          subFields,
          { ...context, ...(chain === undefined ? {} : { blockChain: chain }) },
          `${path}.`,
          parentIsLocalized || localized,
        ),
      );

    switch (field.type) {
      case 'relationship':
      case 'upload': {
        if (typeof field.relationTo === 'string') return field.relationTo === 'users' ? paths : [];
        return field.relationTo.includes('users') ? paths.map((path) => `${path}.value`) : [];
      }
      case 'group':
      case 'array':
      case 'tab': {
        return inside(field.flattenedFields);
      }
      case 'blocks': {
        const chain = context.blockChain ?? [];
        return [...field.blocks, ...(field.blockReferences ?? [])]
          .map((block) => (typeof block === 'string' ? context.blocks.get(block) : block))
          .filter(
            (block): block is FlattenedBlock => block !== undefined && !chain.includes(block.slug),
          )
          .flatMap((block) => inside(block.flattenedFields, [...chain, block.slug]));
      }
      default: {
        return [];
      }
    }
  });

const isObjectId = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && '_bsontype' in value;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

/**
 * Returns `value` with every reference to the source user pointing at the target instead, and
 * the same object when nothing in it changed. Ids are unique across the database, so a value
 * equal to the source id is a reference to that user wherever in the document it sits. A list
 * that named both users names the target once afterwards.
 *
 * @param value a document, or any part of one, as the Mongo driver returns it
 * @param sourceId id of the user that goes away
 * @param targetObjectId `_id` of the user that stays, as stored in Mongo
 */
export const replaceUserReferences = (
  value: unknown,
  sourceId: string,
  targetObjectId: unknown,
): unknown => {
  const targetId = String(targetObjectId);
  const isTarget = (entry: unknown): boolean =>
    (isObjectId(entry) || typeof entry === 'string') && String(entry) === targetId;

  const replace = (current: unknown): unknown => {
    if (typeof current === 'string') return current === sourceId ? targetId : current;
    if (isObjectId(current)) return String(current) === sourceId ? targetObjectId : current;

    if (Array.isArray(current)) {
      const replaced = current.map((entry) => replace(entry));
      if (replaced.every((entry, index) => entry === current[index])) return current;
      return replaced.filter(
        (entry, index) =>
          !isTarget(entry) || replaced.findIndex((other) => isTarget(other)) === index,
      );
    }

    if (isPlainObject(current)) {
      const entries = Object.entries(current).map(([key, entry]) => [key, replace(entry)] as const);
      if (entries.every(([key, entry]) => entry === current[key])) return current;
      return Object.fromEntries(entries);
    }

    return current;
  };

  return replace(value);
};

type MongoCollection = BasePayload['db']['collections'][string]['collection'];

interface ReferencingCollection {
  name: string;
  collection: MongoCollection;
  filter: Record<string, unknown>;
  paths: string[];
}

const versioned = (paths: string[]): string[] => paths.map((path) => `version.${path}`);

/** Every Mongo collection that can hold a reference to a user, drafts and versions included. */
const listReferencingCollections = (payload: BasePayload): ReferencingCollection[] => {
  const config: SanitizedConfig = payload.config;
  const context: PathContext = {
    localeCodes: config.localization === false ? [] : config.localization.localeCodes,
    blocks: new Map((config.blocks ?? []).map((block) => [block.slug, block])),
  };

  const collections = config.collections
    .filter(({ slug }) => !DROPPED_WITH_THE_USER.has(slug))
    .flatMap(({ slug, flattenedFields, versions }): ReferencingCollection[] => {
      const paths = listUserReferencePaths(flattenedFields, context);
      const versionModel = payload.db.versions[slug];
      return [
        ...(payload.db.collections[slug] === undefined
          ? []
          : [
              {
                name: slug,
                collection: payload.db.collections[slug].collection,
                filter: {},
                paths,
              },
            ]),
        ...(versions === undefined || versionModel === undefined
          ? []
          : [
              {
                name: `${slug} (versions)`,
                collection: versionModel.collection,
                filter: {},
                paths: versioned(paths),
              },
            ]),
      ];
    });

  const globals = config.globals.flatMap(
    ({ slug, flattenedFields, versions }): ReferencingCollection[] => {
      const paths = listUserReferencePaths(flattenedFields, context);
      const versionModel = payload.db.versions[slug];
      return [
        {
          name: slug,
          collection: payload.db.globals.collection,
          filter: { globalType: slug },
          paths,
        },
        ...(versions === undefined || versionModel === undefined
          ? []
          : [
              {
                name: `${slug} (versions)`,
                collection: versionModel.collection,
                filter: {},
                paths: versioned(paths),
              },
            ]),
      ];
    },
  );

  return [...collections, ...globals].filter(({ paths }) => paths.length > 0);
};

/** The `_id` of a user as Mongo stores it, which is what relationship fields hold. */
const findUserObjectId = async (payload: BasePayload, userId: string): Promise<unknown> => {
  const users = payload.db.collections['users'];
  if (users === undefined) throw new Error('The users collection is missing');
  const user = (await users.findById(userId).select('_id').lean()) as { _id: unknown } | null;
  if (user === null) throw new Error(`User ${userId} does not exist`);
  return user._id;
};

const referencesTo = (
  { filter, paths }: ReferencingCollection,
  userId: string,
  userObjectId: unknown,
): Record<string, unknown> => ({
  ...filter,
  $or: paths.map((path) => ({ [path]: { $in: [userObjectId, userId] } })),
});

interface UserForeignKey {
  /** Table and column, quoted by Postgres. */
  table: string;
  column: string;
  /** The other columns of every unique index the column is part of. */
  uniqueWith: string[][];
}

type PrismaExecutor = Pick<
  Prisma.TransactionClient,
  '$queryRaw' | '$queryRawUnsafe' | '$executeRawUnsafe'
>;

/** Every column with a foreign key to `User`, read from the catalogue of the live database. */
const listUserForeignKeys = async (database: PrismaExecutor): Promise<UserForeignKey[]> =>
  database.$queryRaw<UserForeignKey[]>`
    SELECT
      c.conrelid::regclass::text AS "table",
      quote_ident(a.attname) AS "column",
      coalesce(
        (
          SELECT json_agg(others.columns)
          FROM (
            SELECT coalesce(
              json_agg(quote_ident(other.attname)) FILTER (WHERE other.attnum <> a.attnum),
              '[]'::json
            ) AS columns
            FROM pg_index i
            JOIN pg_attribute other ON other.attrelid = i.indrelid AND other.attnum = ANY (i.indkey)
            WHERE i.indrelid = c.conrelid AND i.indisunique AND a.attnum = ANY (i.indkey)
            GROUP BY i.indexrelid
          ) others
        ),
        '[]'::json
      ) AS "uniqueWith"
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND c.confrelid = '"User"'::regclass AND cardinality(c.conkey) = 1
    ORDER BY 1, 2
  `;

/**
 * Counts what points at a user in both stores, table by table. It is what a merge would move,
 * shown to the admin before they confirm.
 */
export const countUserReferences = async (
  payload: BasePayload,
  userId: string,
): Promise<ReferenceCount[]> => {
  const userObjectId = await findUserObjectId(payload, userId);

  const foreignKeys = await listUserForeignKeys(prisma);
  const rowsPerTable = new Map<string, number>();
  for (const { table, column } of foreignKeys) {
    const [row] = await prisma.$queryRawUnsafe<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM ${table} WHERE ${column} = $1`,
      userId,
    );
    rowsPerTable.set(table, (rowsPerTable.get(table) ?? 0) + (row?.count ?? 0));
  }

  const documents = await Promise.all(
    listReferencingCollections(payload).map(async (referencing) => ({
      name: referencing.name,
      count: await referencing.collection.countDocuments(
        referencesTo(referencing, userId, userObjectId),
      ),
    })),
  );

  return [
    ...[...rowsPerTable].map(([name, count]) => ({
      store: 'postgres' as const,
      name: name.replaceAll('"', ''),
      count,
    })),
    ...documents.map((entry) => ({ store: 'payload' as const, ...entry })),
  ].filter(({ count }) => count > 0);
};

/**
 * Moves every row that points at the source user to the target and removes the source from
 * Postgres, in one transaction. Where both users already have the same row, a membership of
 * the same chat or a vote for the same photo, the target's row stays and the source's goes.
 */
const mergeInPostgres = async (sourceId: string, targetId: string): Promise<void> => {
  await prisma.$transaction(async (transaction) => {
    for (const { table, column, uniqueWith } of await listUserForeignKeys(transaction)) {
      for (const others of uniqueWith) {
        const sameRow = others.map(
          (other) => `source.${other} IS NOT DISTINCT FROM target.${other}`,
        );
        await transaction.$executeRawUnsafe(
          `DELETE FROM ${table} source USING ${table} target
           WHERE ${[`source.${column} = $1`, `target.${column} = $2`, ...sameRow].join(' AND ')}`,
          sourceId,
          targetId,
        );
      }
      await transaction.$executeRawUnsafe(
        `UPDATE ${table} SET ${column} = $2 WHERE ${column} = $1`,
        sourceId,
        targetId,
      );
    }

    // an entry for each other turns into an entry for oneself
    await transaction.addressBookEntry.deleteMany({
      where: { ownerId: targetId, contactId: targetId },
    });
    // no foreign key by design, see the model
    await transaction.documentDownload.updateMany({
      where: { userId: sourceId },
      data: { userId: targetId },
    });
    await transaction.user.deleteMany({ where: { uuid: sourceId } });
  });
};

/** Points every Payload document, draft and version that names the source at the target. */
const mergeInPayload = async (
  payload: BasePayload,
  sourceId: string,
  targetId: string,
): Promise<void> => {
  const sourceObjectId = await findUserObjectId(payload, sourceId);
  const targetObjectId = await findUserObjectId(payload, targetId);

  for (const referencing of listReferencingCollections(payload)) {
    const documents = referencing.collection.find(
      referencesTo(referencing, sourceId, sourceObjectId),
    );
    for await (const document of documents) {
      const changed = Object.entries(document)
        .map(
          ([key, value]) => [key, replaceUserReferences(value, sourceId, targetObjectId)] as const,
        )
        .filter(([key, value]) => key !== '_id' && value !== document[key]);
      if (changed.length === 0) continue;
      // through the driver: a save through Payload would validate drafts and write new versions
      await referencing.collection.updateOne(
        { _id: document._id },
        { $set: Object.fromEntries(changed) },
      );
    }
  }
};

/**
 * Merges the source user into the target: everything that points at the source points at the
 * target afterwards, and the source is deleted. The target keeps its own profile. Only when it
 * was never linked to Cevi.DB does it take over the source's Cevi.DB id and what comes from
 * there, so that the person's next login finds it.
 *
 * The two stores share no transaction. Postgres goes first and all of it at once, and moving
 * the Payload references can be repeated, so a merge that stopped before the source was deleted
 * is finished by running it again.
 *
 * @param payload the Payload instance
 * @param sourceId id of the user that goes away
 * @param targetId id of the user that stays
 */
export const mergeUsers = async (
  payload: BasePayload,
  sourceId: string,
  targetId: string,
): Promise<void> => {
  if (sourceId === targetId) throw new Error('A user cannot be merged into itself');
  const [source, target] = await Promise.all([
    payload.findByID({ collection: 'users', id: sourceId, depth: 0 }),
    payload.findByID({ collection: 'users', id: targetId, depth: 0 }),
  ]);

  await mergeInPostgres(sourceId, targetId);
  await mergeInPayload(payload, sourceId, targetId);

  for (const collection of COLLECTIONS_DROPPED_WITH_THE_USER) {
    await payload.delete({ collection, where: { 'user.value': { equals: sourceId } } });
  }
  await payload.delete({ collection: 'users', id: sourceId });

  // after the delete: the Cevi.DB id and the email are unique
  if (typeof target.cevi_db_uuid !== 'number' && typeof source.cevi_db_uuid === 'number') {
    await payload.update({
      collection: 'users',
      id: targetId,
      data: {
        cevi_db_uuid: source.cevi_db_uuid,
        email: source.email,
        fullName: source.fullName,
        ...(typeof source.nickname === 'string' ? { nickname: source.nickname } : {}),
        groups: source.groups ?? [],
      },
    });
  }
};
