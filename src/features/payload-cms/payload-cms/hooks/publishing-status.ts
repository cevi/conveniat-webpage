import type { PublishingStatusType } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/type';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { replaceInlinedDocumentWithDocumentId } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Config } from '@/features/payload-cms/payload-types';
import type {
  Block,
  CollectionConfig,
  CollectionSlug,
  FieldHookArgs,
  GlobalConfig,
  GlobalSlug,
  JSONField,
  Tab,
} from 'payload';

interface Field {
  name?: string;
  type: string;
  hasMany?: boolean;
  localized: boolean;
  presentational: boolean;
  fields?: Field[];
  tabs?: (Tab & { name?: string })[];
  blocks?: (Block & { slug: string })[];
}

type PayloadDocument = Record<string, Record<Config['locale'], string>>;

/**
 * The name of the field that keeps the publishing status of a collection document.
 *
 * Comparing a draft against the published version reads both in every locale. A list of 50
 * pages did that for every row and took a second, so the result is kept on the latest version.
 */
export const STORED_PUBLISHING_STATUS = '_publishing_status_cache';

/**
 * Checks if a field without sub-fields holds a different value in the two versions, in one locale.
 *
 * A missing value and `null` both mean "no value". A localized field the locale has no value in
 * may be missing, `null` or `{}`, depending on how the version was saved.
 *
 * @param locale the locale to compare
 * @param field the field definition
 * @param value1 the value in one version
 * @param value2 the value in the other version
 */
const hasFieldDifferentValue = (
  locale: Config['locale'] | undefined,
  field: Field,
  value1: unknown,
  value2: unknown,
): boolean => {
  if (field.presentational) return false;
  if (field.localized && locale === undefined) {
    throw new Error('Locale is undefined but field is localized');
  }

  const inLocale = (value: unknown): unknown =>
    field.localized && locale !== undefined
      ? (value as Record<string, unknown> | null | undefined)?.[locale]
      : value;

  return JSON.stringify(inLocale(value1) ?? null) !== JSON.stringify(inLocale(value2) ?? null);
};

/**
 * Reduces a relationship or upload value to what it points at, so a draft and the published
 * version compare equal exactly when they link the same documents.
 *
 * At depth 0 Payload stores a plain id, `{ relationTo, value }` for a field with several target
 * collections, or a list of either. A populated document is reduced to its id. A missing value
 * and `null` both mean "no target".
 *
 * @param value the stored value of the field
 */
const relationTarget = (value: unknown): unknown => {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.map((element) => relationTarget(element));
  if (typeof value !== 'object') return value;
  if ('relationTo' in value && 'value' in value) {
    return { relationTo: value.relationTo, value: relationTarget(value.value) };
  }
  if ('id' in value) return value.id;
  return value;
};

/**
 * Copies rich text with every internal link reduced to the document it points at, so two
 * versions compare equal exactly when their links point at the same documents.
 *
 * It copies rather than changes the value: the same document is compared once per locale.
 *
 * @param value rich text, or a part of it
 */
const normalizeInternalLinks = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((element) => normalizeInternalLinks(element));
  if (typeof value !== 'object' || value === null) return value;

  const copy: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) copy[key] = normalizeInternalLinks(child);

  const fields = copy['fields'];
  if (typeof fields === 'object' && fields !== null && 'doc' in fields) {
    copy['fields'] = { ...fields, doc: relationTarget(fields.doc) };
  }
  return copy;
};

/**
 *
 * A list of fields that should be ignored when checking for unpublished changes.
 * The ignore list contains meta-data fields that are not relevant for rendering
 * the page, e.g., internal state fields.
 *
 */
const ignoredFields = new Set([
  'Versions',
  'updatedAt',
  'createdAt',
  '_status',
  // the publishing bookkeeping itself, which this status reports on
  '_localized_status',
  '_locale',
  '_disable_unpublishing',
  STORED_PUBLISHING_STATUS,
  'internalPageName',
  'internalStatus',
  'authors',
  'lastEditedByUser',
  'allowsEditsByUser',
  // the title of a block in the admin panel, never shown on the page
  'blockName',
]);

const delocalizedFields = new WeakMap<Field[], Field[]>();

/**
 * The fields below a localized field, as they are stored: read with `locale: 'all'`, Payload keys
 * only the outermost localized field by locale, and everything inside it holds plain values,
 * whatever their own `localized` says.
 *
 * @param fields the fields inside a localized field
 */
const delocalize = (fields: Field[]): Field[] => {
  const known = delocalizedFields.get(fields);
  if (known !== undefined) return known;

  const result = fields.map((field) => ({
    ...field,
    localized: false,
    ...(field.fields === undefined ? {} : { fields: delocalize(field.fields) }),
    ...(field.tabs === undefined
      ? {}
      : { tabs: field.tabs.map((tab) => ({ ...tab, fields: delocalize(tab.fields as Field[]) })) }),
    ...(field.blocks === undefined
      ? {}
      : {
          blocks: field.blocks.map((block) => ({
            ...block,
            fields: delocalize(block.fields as Field[]),
          })),
        }),
  })) as Field[];
  delocalizedFields.set(fields, result);
  return result;
};

/**
 * Recursively checks if two documents have differences.
 *
 * If the document is invalid, i.e. it contains undefined values,
 * it will return false (no diffs). This may happen after a schema change.
 *
 * @param locale the locale for which to check the diffs
 * @param fieldDefs the field definitions of the document
 * @param document1
 * @param document2
 */

const hasDiffs = (
  locale: Config['locale'],
  fieldDefs: Field[],
  document1: PayloadDocument | undefined,
  document2: PayloadDocument | undefined,
): boolean => {
  if (document1 === undefined && document2 === undefined) return false;
  if (document1 === undefined || document2 === undefined) return true;

  for (const field of fieldDefs) {
    if (ignoredFields.has(field.name ?? '')) continue; // skip ignored fields

    const { name, type, fields, tabs, blocks } = field;
    let value1 = document1 as unknown;
    let value2 = document2 as unknown;

    // unnamed fields which are not part of the data structure

    if (name !== undefined) {
      try {
        value1 = document1[name];
        value2 = document2[name];
      } catch {}
    }

    switch (type) {
      case 'blocks': {
        if (blocks === undefined) throw new Error('Blocks are undefined');

        type BlockType = Record<string, unknown>;
        type LocalizedBlockType = Record<Config['locale'], BlockType[]>;

        // a blocks field without blocks may be missing or empty, depending on how it was saved
        const blocks1 =
          (field.localized
            ? (value1 as LocalizedBlockType | undefined)?.[locale]
            : (value1 as BlockType[] | undefined)) ?? [];
        const blocks2 =
          (field.localized
            ? (value2 as LocalizedBlockType | undefined)?.[locale]
            : (value2 as BlockType[] | undefined)) ?? [];

        for (const block1 of blocks1) {
          const blockType = block1['blockType'];
          const block2 = blocks2.find((b) => b['id'] === block1['id']);
          if (block2 === undefined) return true; // block not found in document2

          const blockTypeDefinition = blocks.find((b) => b.slug === blockType);
          if (blockTypeDefinition === undefined) throw new Error('Block type not found');
          const blockFields = blockTypeDefinition['fields'] as Field[];

          if (
            hasDiffs(
              locale,
              field.localized ? delocalize(blockFields) : blockFields,
              block1 as PayloadDocument,
              block2 as PayloadDocument,
            )
          )
            return true;
        }

        // verify that the blocks are in the same order
        if (blocks1.length !== blocks2.length) return true;
        for (const [index, element] of blocks1.entries()) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          if (element['id'] !== blocks2[index]['id']) return true;
        }

        break; // no diff found, continue with the next field
      }

      case 'tabs': {
        if (tabs === undefined) throw new Error('Tabs are undefined');

        for (const tab of tabs) {
          const tabName = tab.name;
          let tabValue1 = document1;
          let tabValue2 = document2;

          if (tabName !== undefined) {
            tabValue1 = document1[tabName] as unknown as PayloadDocument;
            tabValue2 = document2[tabName] as unknown as PayloadDocument;
          }

          const tabFields = tab.fields as Field[];
          if (hasDiffs(locale, tabFields, tabValue1, tabValue2)) {
            return true;
          }
        }

        break; // no diff found, continue with the next field
      }

      // handle nested with sub-fields (fields: Field[])
      case 'group':
      case 'row':
      case 'collapsible':
      case 'array': {
        if (fields === undefined) throw new Error('Fields are undefined');

        if (type === 'group' && field.localized) {
          const v1 = (
            value1 as Record<Config['locale'], PayloadDocument | undefined> | undefined
          )?.[locale];
          const v2 = (
            value2 as Record<Config['locale'], PayloadDocument | undefined> | undefined
          )?.[locale];
          if (hasDiffs(locale, delocalize(fields), v1, v2)) return true;
          break;
        }

        let rowFields = fields;
        if (type === 'array') {
          // a localized array holds its rows per locale, e.g. the main menu
          if (field.localized) {
            value1 = (value1 as Record<string, unknown> | null | undefined)?.[locale];
            value2 = (value2 as Record<string, unknown> | null | undefined)?.[locale];
            rowFields = delocalize(fields);
          }
          // an array without rows may be missing or empty, depending on how it was saved
          value1 = value1 ?? [];
          value2 = value2 ?? [];
        }

        if (Array.isArray(value1)) {
          if (!Array.isArray(value2)) return true;
          if (value1.length !== value2.length) return true;

          for (const _value1 of value1 as ({ id: string } & Record<string, unknown>)[]) {
            const idV1 = _value1.id;

            const _value2 = (value2 as { id: string }[]).find((v) => v.id === idV1);
            if (_value2 === undefined) return true; // value isn't found in document2
            if (
              hasDiffs(
                locale,
                rowFields,
                _value1 as unknown as PayloadDocument,
                _value2 as unknown as PayloadDocument,
              )
            ) {
              return true;
            }
          }

          // verify that the array elements are in the same order
          for (const [index, element] of (
            value1 as ({ id: string } & Record<string, unknown>)[]
          ).entries()) {
            if (element.id !== (value2 as { id: string }[])[index]?.id) return true;
          }
        } else {
          if (hasDiffs(locale, fields, value1 as PayloadDocument, value2 as PayloadDocument))
            return true;
        }

        break; // no diff found, continue with the next field
      }

      // handle rich text
      case 'richText': {
        const normalizedValue1 = replaceInlinedDocumentWithDocumentId(
          normalizeInternalLinks(value1),
        );
        const normalizedValue2 = replaceInlinedDocumentWithDocumentId(
          normalizeInternalLinks(value2),
        );
        if (hasFieldDifferentValue(locale, field, normalizedValue1, normalizedValue2)) return true;
        break; // no diff found, continue with the next field
      }

      // handle leaf fields
      case 'textarea':
      case 'text':
      case 'select':
      case 'radio':
      case 'point':
      case 'number':
      case 'email':
      case 'date':
      case 'json':
      case 'code':
      case 'checkbox': {
        if (hasFieldDifferentValue(locale, field, value1, value2)) return true;
        break; // no diff found, continue with the next field
      }

      // a join lists the documents that point at this one; it is not content of this document
      case 'join': {
        break; // continue with the next field
      }

      // handle relationship fields
      case 'relationship':
      case 'upload': {
        if (field.presentational) break;

        const v1 = field.localized
          ? (value1 as Record<string, unknown> | null | undefined)?.[locale]
          : value1;
        const v2 = field.localized
          ? (value2 as Record<string, unknown> | null | undefined)?.[locale]
          : value2;

        if (JSON.stringify(relationTarget(v1)) !== JSON.stringify(relationTarget(v2))) return true;
        break; // no diff found, continue with the next field
      }

      // ignored fields
      case 'ui': {
        break; // continue with the next field
      }

      // fallback for unimplemented field types
      default: {
        throw new Error(`Field type ${field.type} not implemented`);
      }
    }
  }

  return false;
};

/**
 * The publishing status of every locale, from both versions read with `locale: 'all'`.
 *
 * @param fieldDefinition the fields of the collection or global
 * @param originalDocument the published version
 * @param draftDocument the latest draft
 */
const localeStates = (
  fieldDefinition: Field[],
  originalDocument: PayloadDocument,
  draftDocument: PayloadDocument,
): PublishingStatusType => {
  const getLocaleState = (
    locale: Config['locale'],
  ): {
    pendingChanges: boolean;
    published: boolean;
  } => ({
    pendingChanges: hasDiffs(locale, fieldDefinition, draftDocument, originalDocument),
    // A locale that was never saved has no entry, e.g. `en` on a konekta document.
    published:
      (
        originalDocument['_localized_status']?.[locale] as unknown as
          { published?: boolean } | undefined
      )?.published === true,
  });

  return {
    de: getLocaleState(LOCALE.DE),
    en: getLocaleState(LOCALE.EN),
    fr: getLocaleState(LOCALE.FR),
  };
};

/** The status shown while it cannot be worked out, e.g. for a document without a draft yet. */
const unknownStatus = (): PublishingStatusType => ({
  de: { pendingChanges: false, published: false },
  en: { pendingChanges: false, published: false },
  fr: { pendingChanges: false, published: false },
});

export const getPublishingStatusGlobal =
  (config: GlobalConfig) =>
  async (arguments_: FieldHookArgs): Promise<PublishingStatusType> => {
    const { data, req, global } = arguments_;
    const { payload } = req;

    const id = data?.['id'] as string | undefined;
    if (id == undefined) return {};

    try {
      const fieldDefinition = (global?.fields as unknown as Field[] | undefined) ?? undefined;
      if (fieldDefinition === undefined) throw new Error('Field definitions are undefined');

      // every locale at once, like a collection: hasDiffs expects localized fields keyed by locale
      const [originalDocument, draftDocument] = (await Promise.all([
        payload.findGlobal({
          slug: config.slug as GlobalSlug,
          select: { publishingStatus: false },
          depth: 0,
          locale: 'all',
          draft: false,
        }),
        payload.findGlobal({
          slug: config.slug as GlobalSlug,
          select: { publishingStatus: false },
          depth: 0,
          locale: 'all',
          draft: true,
        }),
      ])) as unknown as [PayloadDocument, PayloadDocument];

      return localeStates(fieldDefinition, originalDocument, draftDocument);
    } catch {
      // if the document is not found, we return an empty publishing status
      // this may happen if the document was just created and has no draft yet
      return unknownStatus();
    }
  };

/**
 * The field that keeps the publishing status, for every collection that has `publishingStatus`.
 *
 * Only `getPublishingStatus` writes it, straight to one version in the database, and only while
 * that version is unchanged since the comparison. Every write through Payload empties it,
 * including the autosave that changes the latest version in place, so a value that is there
 * was worked out for exactly that version.
 */
export const storedPublishingStatusField: JSONField = {
  name: STORED_PUBLISHING_STATUS,
  type: 'json',
  admin: { disabled: true },
  access: {
    create: () => false,
    update: () => false,
  },
  hooks: {
    beforeChange: [(): null => null],
  },
};

/** The latest version of a document, as it was before the comparison. */
interface LatestVersion {
  id: string;
  /** the version's own timestamp, which every save of the version through Payload changes */
  updatedAt: string;
}

/**
 * Compares the published version of a document against its latest draft, in every locale, and
 * names the latest version as it was before.
 *
 * The latest version is looked up first. Should it change meanwhile, the status is not stored,
 * see {@link storePublishingStatus}.
 *
 * @param slug the collection of the document
 * @param fieldDefinition the fields of the collection
 * @param id the document
 * @param payload the Payload instance
 */
const computePublishingStatus = async (
  slug: CollectionSlug,
  fieldDefinition: Field[],
  id: string,
  payload: FieldHookArgs['req']['payload'],
): Promise<{ status: PublishingStatusType; latestVersion: LatestVersion | undefined }> => {
  const { docs } = await payload.db.findVersions({
    collection: slug,
    where: { and: [{ parent: { equals: id } }, { latest: { equals: true } }] },
    select: { updatedAt: true },
    sort: '-updatedAt',
    limit: 1,
    pagination: false,
  });
  const latestVersion = docs[0] as { id: string; updatedAt?: unknown } | undefined;

  const read = (draft: boolean): Promise<unknown> =>
    payload.findByID({
      collection: slug,
      id,
      // avoid infinite recursion
      select: { publishingStatus: false, [STORED_PUBLISHING_STATUS]: false },
      // hasDiffs skips a join it does not get, and with locale 'all' Payload looks a join
      // up on a field that does not exist, scanning the whole joined collection. The cast:
      // for a slug only known at runtime, Payload types `joins` as never.
      joins: false as never,
      depth: 0,
      locale: 'all',
      trash: true, // include trashed documents
      draft,
    });

  const [originalDocument, draftDocument] = (await Promise.all([read(false), read(true)])) as [
    PayloadDocument,
    PayloadDocument,
  ];

  return {
    status: localeStates(fieldDefinition, originalDocument, draftDocument),
    latestVersion:
      typeof latestVersion?.updatedAt === 'string'
        ? { id: latestVersion.id, updatedAt: latestVersion.updatedAt }
        : undefined,
  };
};

/**
 * Keeps the status on the version it was worked out for.
 *
 * It sets the one field with `$set`, through the version model: Payload's own `updateVersion`
 * replaces the whole `version` with what it is given, which would empty the draft. Neither
 * creates a version or runs hooks, and `timestamps: false` keeps the version's `updatedAt`, which
 * Payload finds the latest version by. The write only lands while the version still has the
 * `updatedAt` it had before the comparison: an autosave changes the version in place, and its
 * `updatedAt` with it.
 *
 * @param slug the collection of the document
 * @param version the latest version, as it was before the comparison
 * @param status the status
 * @param request the request reading the document
 */
const storePublishingStatus = async (
  slug: CollectionSlug,
  version: LatestVersion,
  status: PublishingStatusType,
  request: FieldHookArgs['req'],
): Promise<void> => {
  // A version saved in a transaction that is still open cannot be written from outside it. The
  // next draft read stores the status instead.
  if (request.transactionID !== undefined) return;

  const versions = request.payload.db.versions[slug];
  if (versions === undefined) return;

  try {
    await versions.updateOne(
      { _id: version.id, updatedAt: version.updatedAt },
      { $set: { [`version.${STORED_PUBLISHING_STATUS}`]: status } },
      { timestamps: false },
    );
  } catch (error) {
    // the status is still shown, the next draft read just works it out again
    request.payload.logger.warn({
      err: error,
      msg: `Could not store the publishing status of version ${version.id} of ${slug}`,
    });
  }
};

/**
 * Returns a field hook that retrieves the publishing status of a document.
 *
 * It returns the stored status when the version being read has one, and otherwise
 * compares the published version against the latest draft, as it always did. A draft read then
 * stores the result on the latest version, so the next list shows it without reading the
 * document again.
 *
 * @param config the collection configuration
 */
export const getPublishingStatus =
  (config: CollectionConfig) =>
  async (arguments_: FieldHookArgs): Promise<PublishingStatusType> => {
    const { data, req, collection, draft } = arguments_;

    const id = data?.['id'] as string | undefined;

    // we cannot determine the publishing status if the document has no id
    // e.g. for a new document
    if (id == undefined) return {};

    const storedStatus = data?.[STORED_PUBLISHING_STATUS] as
      PublishingStatusType | null | undefined;
    if (typeof storedStatus === 'object' && storedStatus !== null) return storedStatus;

    const slug = config.slug as CollectionSlug;
    let computed: Awaited<ReturnType<typeof computePublishingStatus>>;
    try {
      const fieldDefinition = (collection?.fields as unknown as Field[] | undefined) ?? undefined;
      if (fieldDefinition === undefined) throw new Error('Field definitions are undefined');

      computed = await computePublishingStatus(slug, fieldDefinition, id, req.payload);
    } catch {
      // if the document is not found, we return an empty publishing status
      // this may happen if the document was just created and has no draft yet
      return unknownStatus();
    }

    // A draft read returns the latest version, which is where the status is kept. The published
    // document never carries one, so a read of it has nothing to store for.
    if (draft === true && computed.latestVersion !== undefined) {
      await storePublishingStatus(slug, computed.latestVersion, computed.status, req);
    }

    return computed.status;
  };
