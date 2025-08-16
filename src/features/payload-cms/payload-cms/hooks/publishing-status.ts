import type { PublishingStatusType } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/type';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Config } from '@/features/payload-cms/payload-types';
import type {
  Block,
  CollectionConfig,
  CollectionSlug,
  FieldHookArgs,
  GlobalConfig,
  GlobalSlug,
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
 * Checks if two values are different.
 *
 * Returns false if one of the values is undefined or null.
 * Returns true if the values are different.
 *
 * @param locale
 * @param field
 * @param value1
 * @param value2
 */
const hasFieldDifferentValue = (
  locale: Config['locale'] | undefined,
  field: Field,
  value1: unknown,
  value2: unknown,
): boolean => {
  if (value1 === undefined || value2 === undefined) return false;
  if (value1 === null || value2 === null) return false;

  if (field.localized) {
    if (locale === undefined) throw new Error('Locale is undefined but field is localized');
    const v1 = value1 as Record<Config['locale'], string>;
    const v2 = value2 as Record<Config['locale'], string>;
    return JSON.stringify(v1[locale]) !== JSON.stringify(v2[locale]);
  }

  return !field.presentational && JSON.stringify(value1) !== JSON.stringify(value2);
};

/**
 * Strips internal links from a JSON object.
 *
 * traverse the JSON recursively and remove internal links
 * by replacing any nested fields.doc.value with '>> not comparable <<'
 *
 * @param value
 */
const stripInternalLinks = (value: unknown): unknown => {
  if (typeof value !== 'object' || value === null) return value;

  if (Array.isArray(value)) {
    return value.map((element) => stripInternalLinks(element));
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (Boolean(value.fields?.doc?.value)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    value.fields.doc.linkedDocId = value.fields.doc.value.id ?? '';

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    value.fields.doc.value = '>> not comparable <<';
  }

  for (const key in value) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    value[key] = stripInternalLinks(value[key]);
  }

  return value;
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
  'internalPageName',
  'internalStatus',
  'authors',
]);

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
// eslint-disable-next-line complexity
const hasDiffs = (
  locale: Config['locale'],
  fieldDefs: Field[],
  document1: PayloadDocument | undefined,
  document2: PayloadDocument | undefined,
): boolean => {
  if (document1 === undefined || document2 === undefined) return false;

  for (const field of fieldDefs) {
    if (ignoredFields.has(field.name ?? '')) continue; // skip ignored fields

    const { name, type, fields, tabs, blocks } = field;
    let value1 = document1 as unknown;
    let value2 = document2 as unknown;

    // unnamed fields which are not part of the data structure

    if (name !== undefined) {
      value1 = document1[name] as unknown;
      value2 = document2[name] as unknown;
    }

    switch (type) {
      case 'blocks': {
        if (blocks === undefined) throw new Error('Blocks are undefined');

        type BlockType = Record<string, unknown>;
        type LocalizedBlockType = Record<Config['locale'], BlockType[]>;

        const blocks1 = field.localized
          ? (value1 as LocalizedBlockType)[locale]
          : (value1 as BlockType[]);
        const blocks2 = field.localized
          ? (value2 as LocalizedBlockType)[locale]
          : (value2 as BlockType[]);

        // the following check is necessary for the case where there is not
        // previous version of the document, i.e. the document was just created
        // in that case the types are wrong...
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (blocks1 === undefined || blocks2 === undefined) return true;

        for (const block1 of blocks1) {
          const blockType = block1['blockType'];
          const block2 = blocks2.find((b) => b['id'] === block1['id']);
          if (block2 === undefined) return true; // block not found in document2

          const blockTypeDefinition = blocks.find((b) => b.slug === blockType);
          if (blockTypeDefinition === undefined) throw new Error('Block type not found');

          if (
            hasDiffs(
              locale,
              blockTypeDefinition['fields'] as Field[],
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
          let tabValue1 = document1 as PayloadDocument;
          let tabValue2 = document2 as PayloadDocument;

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
        const isValue1Iterable = Array.isArray(value1);
        if (isValue1Iterable) {
          for (const _value1 of value1 as { id: string }[]) {
            const idV1 = _value1.id;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
            const _value2 = value2.find((v) => v.id === idV1);
            if (_value2 === undefined) return true; // value isn't found in document2
            if (
              hasDiffs(
                locale,
                fields,
                _value1 as unknown as PayloadDocument,
                _value2 as PayloadDocument,
              )
            ) {
              return true;
            }
          }

          // verify that the array elements are in the same order
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          if (value1.length !== value2.length) return true;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          for (const [index, element] of value1.entries()) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (element.id !== value2[index].id) return true;
          }
        } else {
          if (hasDiffs(locale, fields, value1 as PayloadDocument, value2 as PayloadDocument))
            return true;
        }

        break; // no diff found, continue with the next field
      }

      // handle rich text
      case 'richText': {
        const strippedValue1 = stripInternalLinks(value1);
        const strippedValue2 = stripInternalLinks(value2);
        if (hasFieldDifferentValue(locale, field, strippedValue1, strippedValue2)) return true;
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

      // handle relationship fields
      case 'join':
      case 'relationship':
      case 'upload': {
        type UploadRecord = Record<Config['locale'], { id: string } | undefined>;
        type UploadRecordMany = Record<Config['locale'], { id: string }[] | undefined>;

        if (field.presentational) break;

        if (field.localized && field.hasMany === true) {
          const v1 = value1 as UploadRecordMany;
          const v2 = value2 as UploadRecordMany;
          if (v1[locale] === undefined || v2[locale] === undefined) continue;

          if (v1[locale].length !== v2[locale].length) return true; // different number of items

          for (const [index, element] of v1[locale].entries()) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            if (element.id !== v2[locale][index].id) return true; // different id
          }
          break; // no diff found, continue with the next field
        }

        if (!field.localized && field.hasMany === true) {
          const v1 = value1 as { id: string }[] | undefined;
          const v2 = value2 as { id: string }[] | undefined;
          if (v1 === undefined || v2 === undefined) continue;
          if (v1.length !== v2.length) return true; // different number of items
          if (v1.toString() !== v2.toString()) return true; // different ids
          break; // no diff found, continue with the next field
        }

        if (field.localized) {
          const v1 = value1 as UploadRecord;
          const v2 = value2 as UploadRecord;
          if (v1[locale] === undefined || v2[locale] === undefined) continue;

          if (v1[locale].id !== v2[locale].id) return true;
          break; // no diff found, continue with the next field
        }

        if (value1 === undefined || value2 === undefined) continue;
        const v1 = value1 as { id: string } | undefined;
        const v2 = value2 as { id: string } | undefined;
        if (v1?.id !== v2?.id) return true;
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

export const getPublishingStatusGlobal =
  (config: GlobalConfig) =>
  async (arguments_: FieldHookArgs): Promise<PublishingStatusType> => {
    const { data, req, global } = arguments_;
    const { payload } = req;

    const id = data?.['id'] as string | unknown;
    if (id == undefined) return {};

    const originalDocument = (await payload.findGlobal({
      slug: config.slug as GlobalSlug,
      select: { publishingStatus: false },
      depth: 0,
      locale: 'all',
      draft: false,
    })) as unknown as PayloadDocument;

    const draftDocument = (await payload.findGlobal({
      slug: config.slug as GlobalSlug,
      select: { publishingStatus: false },
      depth: 0,
      locale: 'all',
      draft: true,
    })) as unknown as PayloadDocument;

    const fieldDefinition = (global?.fields as unknown as Field[] | undefined) ?? undefined;
    if (fieldDefinition === undefined) throw new Error('Field definitions are undefined');

    const getLocaleState = (
      locale: Config['locale'],
    ): { pendingChanges: boolean; published: boolean } => {
      return {
        pendingChanges: hasDiffs(locale, fieldDefinition, draftDocument, originalDocument),
        published: (
          originalDocument['_localized_status']?.[locale] as unknown as {
            published: boolean;
          }
        )['published'],
      };
    };

    return {
      de: getLocaleState(LOCALE.DE),
      en: getLocaleState(LOCALE.EN),
      fr: getLocaleState(LOCALE.FR),
    };
  };

/**
 * Returns a field hook that retrieves the publishing status of a document.
 * @param config the collection configuration
 */
export const getPublishingStatus =
  (config: CollectionConfig) =>
  async (arguments_: FieldHookArgs): Promise<PublishingStatusType> => {
    const { data, req, collection } = arguments_;
    const { payload } = req;

    const id = data?.['id'] as string | undefined;

    // we cannot determine the publishing status if the document has no id
    // e.g. for a new document
    if (id == undefined) return {};

    const originalDocument = (await payload.findByID({
      collection: config.slug as CollectionSlug,
      id,
      // avoid infinite recursion
      select: { publishingStatus: false },
      depth: 0,
      locale: 'all',
      trash: true, // include trashed documents
      draft: false,
    })) as unknown as PayloadDocument;

    const draftDocument = (await payload.findByID({
      collection: config.slug as CollectionSlug,
      id,
      // avoid infinite recursion
      select: { publishingStatus: false },
      locale: 'all',
      depth: 0,
      trash: true, // include trashed documents
      draft: true,
    })) as unknown as PayloadDocument;

    const fieldDefinition = (collection?.fields as unknown as Field[] | undefined) ?? undefined;
    if (fieldDefinition === undefined) throw new Error('Field definitions are undefined');

    const getLocaleState = (
      locale: Config['locale'],
    ): {
      pendingChanges: boolean;
      published: boolean;
    } => {
      return {
        pendingChanges: hasDiffs(locale, fieldDefinition, draftDocument, originalDocument),
        published: (
          originalDocument['_localized_status']?.[locale] as unknown as {
            published: boolean;
          }
        )['published'],
      };
    };

    return {
      de: getLocaleState(LOCALE.DE),
      en: getLocaleState(LOCALE.EN),
      fr: getLocaleState(LOCALE.FR),
    };
  };
