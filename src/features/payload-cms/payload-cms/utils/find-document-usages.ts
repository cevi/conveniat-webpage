import { enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import type {
  ConfigLabel,
  DocumentReference,
  FieldReferences,
} from '@/features/payload-cms/payload-cms/utils/document-references';
import {
  canReferenceCollection,
  collectReferences,
  referencesTo,
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
  data: Record<string, unknown>;
  references: FieldReferences[];
}

type AdminUser = TypedUser | null;

const TARGET = 'documents';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toLabel = (label: unknown, fallback: string): ConfigLabel => {
  if (typeof label === 'string' && label !== '') return label;
  if (isRecord(label)) return label as Record<string, string>;
  return fallback;
};

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
  if (!isRoutable(source.slug)) return [];

  const referencedLocales = new Set(references.map((reference) => reference.locale));
  // a field that is not localized shows on every locale of the page
  const locales = referencedLocales.has(undefined)
    ? enabledLocales
    : enabledLocales.filter((locale) => referencedLocales.has(locale));

  const seo = source.data['seo'];
  const urlSlugs = isRecord(seo) ? seo['urlSlug'] : undefined;

  return locales.flatMap((locale) => {
    if (!isPublishedIn(source.data, locale)) return [];
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

  const { docs } = await payload.find({
    collection: collection.slug,
    // the latest version is the one the admin link opens and the editor would change
    draft: true,
    locale: 'all',
    depth: 0,
    pagination: false,
    select,
    overrideAccess: false,
    user,
  });

  const adminRoute = payload.config.routes.admin;
  return docs.map((document) => {
    const data = document as unknown as Record<string, unknown>;
    const id = String(data['id']);
    return {
      slug: collection.slug,
      groupLabel: toLabel(collection.labels.plural, collection.slug),
      title: toTitle(data[titleField]) ?? id,
      adminUrl: `${adminRoute}/collections/${collection.slug}/${id}`,
      data,
      references: collectReferences(collection.flattenedFields, data, TARGET, enabledLocales),
    };
  });
};

const scanGlobal = async (
  payload: Payload,
  user: AdminUser,
  global: SanitizedGlobalConfig,
): Promise<ReferencingSource[]> => {
  if (referencingFieldNames(global.flattenedFields).length === 0) return [];

  const data = (await payload.findGlobal({
    slug: global.slug,
    draft: true,
    locale: 'all',
    depth: 0,
    overrideAccess: false,
    user,
  })) as unknown as Record<string, unknown>;

  return [
    {
      slug: global.slug,
      groupLabel: toLabel(global.label, global.slug),
      title: undefined,
      adminUrl: `${payload.config.routes.admin}/globals/${global.slug}`,
      data,
      references: collectReferences(global.flattenedFields, data, TARGET, enabledLocales),
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
 * Reads every collection document and global that can reference a document, in the latest version
 * the user may read, once per request. A source the user cannot read is left out.
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

/**
 * Counts, per referenced id, the collection documents and globals that reference it. The keys can
 * include strings from rich text that are no document id; look the counts up by real ids.
 */
export const countDocumentUsages = async (payload: Payload): Promise<Map<string, number>> => {
  const sources = await scanReferencingSources(payload, await getAdminUser(payload));
  const counts = new Map<string, number>();
  for (const source of sources) {
    const ids = new Set(source.references.flatMap((reference) => [...reference.ids]));
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
};

/** The `linked` list query parameter set by the usage toggle above the documents list. */
export const LINKED_QUERY_PARAMETER = 'linked';

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
