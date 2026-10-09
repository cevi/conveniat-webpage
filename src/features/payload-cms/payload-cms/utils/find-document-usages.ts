import { enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import type {
  ConfigLabel,
  DocumentReference,
  FieldReferences,
} from '@/features/payload-cms/payload-cms/utils/document-references';
import {
  canReferenceCollection,
  collectReferences,
  isRecord,
  LINKED_QUERY_PARAMETER,
  referencesTo,
  toConfigLabel,
} from '@/features/payload-cms/payload-cms/utils/document-references';
import { findPrefixByCollectionSlugAndLocale } from '@/features/payload-cms/route-resolution-table';
import { slugToUrlMapping } from '@/features/payload-cms/slug-to-url-mapping';
import { getLanguagePrefix } from '@/features/payload-cms/utils/get-language-prefix';
import type { Locale } from '@/types/types';
import { headers } from 'next/headers';
import type {
  BaseFilter,
  CollectionSlug,
  FlattenedField,
  Payload,
  SanitizedCollectionConfig,
  SanitizedGlobalConfig,
  SelectType,
  TypedUser,
} from 'payload';
import { Forbidden } from 'payload';
import { cache } from 'react';

/** A collection document or global whose data references the document. */
export interface DocumentUsage {
  /** the collection or global label, like "Seiten" or "Hof-Dashboard Einstellungen" */
  groupLabel: ConfigLabel;
  /** the title of the referencing document, undefined for a global */
  title: ConfigLabel | undefined;
  adminUrl: string;
  /** public pages of the referencing document, one per published locale it references from */
  publicUrls: { locale: Locale; url: string }[];
  references: DocumentReference[];
}

/** A collection document or global that may reference documents, as the scan read it. */
interface ReferencingSource {
  slug: string;
  groupLabel: ConfigLabel;
  title: ConfigLabel | undefined;
  adminUrl: string;
  /** the published version, which the public URLs are built from */
  published: Record<string, unknown> | undefined;
  /** the references of the published and of the latest version together */
  references: FieldReferences[];
}

type AdminUser = TypedUser | null;

const TARGET = 'documents';

/** A title read with `locale: 'all'` is a record of locales when the field is localized. */
const toTitle = (value: unknown): ConfigLabel | undefined => {
  if (typeof value === 'string' && value !== '') return value;
  if (isRecord(value)) {
    const entries = Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '',
    );
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
  return undefined;
};

const referencingFieldNames = (fields: FlattenedField[]): string[] =>
  fields.filter((field) => canReferenceCollection(field, TARGET)).map((field) => field.name);

const isRoutable = (slug: string): boolean =>
  slugToUrlMapping.some((mapping) => mapping.slug === slug);

const isPublishedIn = (data: Record<string, unknown>, locale: Locale): boolean => {
  const status = data['_localized_status'];
  if (!isRecord(status)) return false;
  const localeStatus = status[locale];
  return isRecord(localeStatus) && localeStatus['published'] === true;
};

/**
 * The public URL of a routable page in each locale it references the document from, in the order of
 * the enabled locales.
 */
const publicUrlsOf = (
  source: ReferencingSource,
  references: DocumentReference[],
): DocumentUsage['publicUrls'] => {
  const { published } = source;
  if (published === undefined || !isRoutable(source.slug)) return [];

  const referencedLocales = new Set(references.map((reference) => reference.locale));
  // a field that is not localized shows on every locale of the page
  const locales = referencedLocales.has(undefined)
    ? enabledLocales
    : enabledLocales.filter((locale) => referencedLocales.has(locale));

  const seo = published['seo'];
  const urlSlugs = isRecord(seo) ? seo['urlSlug'] : undefined;

  return locales.flatMap((locale) => {
    if (!isPublishedIn(published, locale)) return [];
    const urlSlug = isRecord(urlSlugs) ? urlSlugs[locale] : urlSlugs;
    if (typeof urlSlug !== 'string') return [];
    const segments = [
      getLanguagePrefix(locale),
      findPrefixByCollectionSlugAndLocale(source.slug as CollectionSlug, locale),
      urlSlug,
    ].filter((segment) => segment !== '');
    return [{ locale, url: `/${segments.join('/')}` }];
  });
};

const scanCollection = async (
  payload: Payload,
  user: AdminUser,
  collection: SanitizedCollectionConfig,
): Promise<ReferencingSource[]> => {
  const fieldNames = referencingFieldNames(collection.flattenedFields);
  if (fieldNames.length === 0) return [];

  const titleField = collection.admin.useAsTitle ?? 'id';
  const select = Object.fromEntries([
    ...fieldNames.map((name) => [name, true]),
    [titleField, true],
    ...(isRoutable(collection.slug)
      ? [
          ['seo', { urlSlug: true }],
          ['_localized_status', true],
        ]
      : []),
  ]) as SelectType;

  const read = async (draft: boolean): Promise<Record<string, unknown>[]> => {
    const { docs } = await payload.find({
      collection: collection.slug,
      draft,
      locale: 'all',
      depth: 0,
      pagination: false,
      select,
      overrideAccess: false,
      user,
    });
    return docs as unknown as Record<string, unknown>[];
  };
  // A link that is live on the published page and one that waits in a newer draft both keep the
  // document in use, so a collection with drafts is read in both versions.
  const [published, latest] = await Promise.all([
    read(false),
    Boolean(collection.versions?.drafts) ? read(true) : [],
  ]);

  const versions = new Map<
    string,
    { published?: Record<string, unknown>; latest?: Record<string, unknown> }
  >();
  for (const document of published) versions.set(String(document['id']), { published: document });
  for (const document of latest) {
    const id = String(document['id']);
    versions.set(id, { ...versions.get(id), latest: document });
  }

  const adminRoute = payload.config.routes.admin;
  return [...versions].map(([id, version]) => ({
    slug: collection.slug,
    groupLabel: toConfigLabel(collection.labels.plural, collection.slug),
    // the admin link opens the latest version, so its title is the one the editor recognizes
    title: toTitle((version.latest ?? version.published)?.[titleField]) ?? id,
    adminUrl: `${adminRoute}/collections/${collection.slug}/${id}`,
    published: version.published,
    references: [version.published, version.latest].flatMap((data) =>
      data === undefined
        ? []
        : collectReferences(collection.flattenedFields, data, TARGET, enabledLocales),
    ),
  }));
};

const scanGlobal = async (
  payload: Payload,
  user: AdminUser,
  global: SanitizedGlobalConfig,
): Promise<ReferencingSource[]> => {
  if (referencingFieldNames(global.flattenedFields).length === 0) return [];

  const read = async (draft: boolean): Promise<Record<string, unknown>> =>
    (await payload.findGlobal({
      slug: global.slug,
      draft,
      locale: 'all',
      depth: 0,
      overrideAccess: false,
      user,
    })) as unknown as Record<string, unknown>;
  const versions = await Promise.all(
    Boolean(global.versions?.drafts) ? [read(false), read(true)] : [read(false)],
  );

  return [
    {
      slug: global.slug,
      groupLabel: toConfigLabel(global.label, global.slug),
      title: undefined,
      adminUrl: `${payload.config.routes.admin}/globals/${global.slug}`,
      published: versions[0],
      references: versions.flatMap((data) =>
        collectReferences(global.flattenedFields, data, TARGET, enabledLocales),
      ),
    },
  ];
};

/**
 * The admin user of the current request, resolved once so the cached scan below is shared by the
 * list cells, the list filter and the sidebar, which each receive a different user object.
 */
const getAdminUser = cache(async (payload: Payload): Promise<AdminUser> => {
  const { user } = await payload.auth({ headers: await headers() });
  return user;
});

/**
 * Reads every collection document and global that can reference a document, in its published and
 * its latest version, once per request. A source the user cannot read is left out.
 */
const scanReferencingSources = cache(
  async (payload: Payload, user: AdminUser): Promise<ReferencingSource[]> => {
    const scans = [
      // Payload's own collections are bookkeeping: a lock or a folder is not a use of the document
      ...payload.config.collections
        .filter((collection) => !collection.slug.startsWith('payload-'))
        .map((collection) => ({
          slug: collection.slug,
          run: (): Promise<ReferencingSource[]> => scanCollection(payload, user, collection),
        })),
      ...payload.config.globals.map((global) => ({
        slug: global.slug,
        run: (): Promise<ReferencingSource[]> => scanGlobal(payload, user, global),
      })),
    ];

    const results = await Promise.all(
      scans.map(async ({ slug, run }) => {
        try {
          return await run();
        } catch (error) {
          // a source the user may not read is not theirs to see
          if (error instanceof Forbidden) return [];
          // a broken source hides its references, the others still show
          payload.logger.warn({ err: error, msg: `Could not scan ${slug} for document usage` });
          return [];
        }
      }),
    );
    return results.flat();
  },
);

/**
 * Lists every collection document and global that references the document.
 */
export const findDocumentUsages = async (
  payload: Payload,
  documentId: string,
): Promise<DocumentUsage[]> => {
  const sources = await scanReferencingSources(payload, await getAdminUser(payload));
  return sources.flatMap((source): DocumentUsage[] => {
    const references = referencesTo(source.references, documentId);
    if (references.length === 0) return [];
    return [
      {
        groupLabel: source.groupLabel,
        title: source.title,
        adminUrl: source.adminUrl,
        publicUrls: publicUrlsOf(source, references),
        references,
      },
    ];
  });
};

const countUsages = cache(
  async (payload: Payload, user: AdminUser): Promise<Map<string, number>> => {
    const sources = await scanReferencingSources(payload, user);
    const counts = new Map<string, number>();
    for (const source of sources) {
      const ids = new Set(source.references.flatMap((reference) => [...reference.ids]));
      for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  },
);

/**
 * Counts, per referenced id, the collection documents and globals that reference it, once per
 * request. The keys can include strings from rich text that are no document id; look the counts up
 * by real ids.
 */
export const countDocumentUsages = async (payload: Payload): Promise<Map<string, number>> =>
  countUsages(payload, await getAdminUser(payload));

/**
 * Narrows the documents list to linked (`?linked=yes`) or unlinked (`?linked=no`) documents. Payload
 * only filters on stored fields, and the usage is computed, so the filter is an id list instead.
 */
export const filterDocumentsByUsage: BaseFilter = async ({ req }) => {
  const linked = req.query[LINKED_QUERY_PARAMETER];
  // eslint-disable-next-line unicorn/no-null -- BaseFilter returns null for no constraint
  if (linked !== 'yes' && linked !== 'no') return null;

  const [counts, { docs }] = await Promise.all([
    countDocumentUsages(req.payload),
    req.payload.find({
      collection: TARGET,
      depth: 0,
      pagination: false,
      select: { filename: true },
      overrideAccess: false,
      req,
    }),
  ]);
  const linkedIds = docs.map((document) => document.id).filter((id) => counts.has(id));
  return { id: linked === 'yes' ? { in: linkedIds } : { not_in: linkedIds } };
};
