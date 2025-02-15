import { Block, CollectionConfig, CollectionSlug, FieldHookArgs, Tab } from 'payload';
import { Config } from '@/payload-types';
import { LOCALE } from '@/payload-cms/locales';

type Field = {
  name: string;
  type: string;
  localized: boolean;
  presentational: boolean;
  fields?: Field[];
  tabs?: (Tab & { name: string })[];
  blocks?: (Block & { slug: string })[];
};

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

  const ignoredFields = new Set(['Versions', 'updatedAt', 'createdAt', '_status']);

  for (const field of fieldDefs) {
    if (ignoredFields.has(field.name)) continue; // skip ignored fields

    const { name, type, fields, tabs, blocks } = field;
    const value1 = document1[name] as unknown;
    const value2 = document2[name] as unknown;

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

        break; // no diff found, continue with the next field
      }

      case 'tabs': {
        if (tabs === undefined) throw new Error('Tabs are undefined');

        for (const tab of tabs) {
          const tabName = tab.name;
          const tabValue1 = document1[tabName] as unknown as PayloadDocument;
          const tabValue2 = document2[tabName] as unknown as PayloadDocument;
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
        if (hasDiffs(locale, fields, value1 as PayloadDocument, value2 as PayloadDocument))
          return true;
        break; // no diff found, continue with the next field
      }

      // handle relationship fields

      // handle leaf fields
      case 'textarea':
      case 'text':
      case 'select':
      case 'richText':
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
        if (field.localized) {
          const v1 = value1 as UploadRecord;
          const v2 = value2 as UploadRecord;
          if (v1[locale] === undefined || v2[locale] === undefined) return false;

          if (v1[locale].id !== v2[locale].id) return true;
          break; // no diff found, continue with the next field
        }

        if (value1 === undefined || value2 === undefined) return false;
        const v1 = value1 as { id: string } | undefined;
        const v2 = value2 as { id: string } | undefined;
        if (!field.presentational && v1?.id !== v2?.id) return true;
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
 * Returns a field hook that retrieves the publishing status of a document.
 * @param config the collection configuration
 */
export const getPublishingStatus =
  (config: CollectionConfig) => async (arguments_: FieldHookArgs) => {
    const { data, req, collection } = arguments_;
    const { payload } = req;

    const id = data?.['id'] as string | undefined;

    if (id == undefined) throw new Error('Document ID is undefined');

    const originalDocument = (await payload.findByID({
      collection: config.slug as CollectionSlug,
      id,
      // avoid infinite recursion
      select: { publishingStatus: false },
      locale: 'all',
      draft: false,
    })) as unknown as PayloadDocument;

    const draftDocument = (await payload.findByID({
      collection: config.slug as CollectionSlug,
      id,
      // avoid infinite recursion
      select: { publishingStatus: false },
      locale: 'all',
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
