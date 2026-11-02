import type { BasePayload } from 'payload';

/**
 * Block slugs whose placeholder fields were migrated from plain strings to localized strings.
 */
export const TARGET_BLOCK_TYPES = new Set(['email', 'number', 'select']);

export interface FormBlockData {
  blockType?: string;
  placeholder?: unknown;
  fields?: unknown;
}

export interface FormSectionData {
  formSection?: {
    fields?: unknown;
  } | null;
  fields?: unknown;
}

export interface FormDocumentData {
  id?: number | string;
  sections?: unknown;
  fields?: unknown;
  version?: unknown;
}

/**
 * Rewrites a string placeholder to a localized object `{ de: value }` in a block,
 * and recursively in any nested blocks (such as in `conditionedBlock`).
 *
 * Leaves non-string placeholders (already localized objects, null, undefined) untouched.
 *
 * @param block The block object to inspect and potentially mutate.
 * @returns Whether any placeholder was migrated in this block or its descendants.
 */
export const migratePlaceholderInBlock = (block: FormBlockData): boolean => {
  let migrated = false;

  if (
    typeof block.blockType === 'string' &&
    TARGET_BLOCK_TYPES.has(block.blockType) &&
    typeof block.placeholder === 'string'
  ) {
    block.placeholder = { de: block.placeholder };
    migrated = true;
  }

  if (Array.isArray(block.fields)) {
    for (const nestedField of block.fields) {
      if (
        typeof nestedField === 'object' &&
        nestedField !== null &&
        migratePlaceholderInBlock(nestedField as FormBlockData)
      ) {
        migrated = true;
      }
    }
  }

  return migrated;
};

/**
 * Traverses sections and their `formSection.fields`, migrating string placeholders
 * on `email`, `number`, and `select` blocks to `{ de: value }`.
 *
 * @param sections The form sections array.
 * @returns Whether any placeholder was migrated.
 */
export const migrateSectionsPlaceholders = (sections?: unknown): boolean => {
  if (!Array.isArray(sections)) return false;
  let migrated = false;

  for (const section of sections) {
    if (typeof section !== 'object' || section === null) continue;
    const sec = section as FormSectionData;
    const formSection = sec.formSection;
    if (typeof formSection === 'object' && formSection !== null) {
      const fields = formSection.fields;
      if (Array.isArray(fields)) {
        for (const field of fields) {
          if (
            typeof field === 'object' &&
            field !== null &&
            migratePlaceholderInBlock(field as FormBlockData)
          ) {
            migrated = true;
          }
        }
      }
    }

    if (Array.isArray(sec.fields)) {
      for (const field of sec.fields) {
        if (
          typeof field === 'object' &&
          field !== null &&
          migratePlaceholderInBlock(field as FormBlockData)
        ) {
          migrated = true;
        }
      }
    }
  }

  return migrated;
};

/**
 * Migrates string placeholders on a form document or a form version document.
 * Checks both `sections` and top-level `fields`.
 *
 * @param formDocument The form or form version data document.
 * @returns Whether any placeholder was migrated.
 */
export const migrateFormDocumentPlaceholders = (formDocument: FormDocumentData): boolean => {
  let migrated = false;

  if ('sections' in formDocument && migrateSectionsPlaceholders(formDocument.sections)) {
    migrated = true;
  }

  if (Array.isArray(formDocument.fields)) {
    for (const field of formDocument.fields) {
      if (
        typeof field === 'object' &&
        field !== null &&
        migratePlaceholderInBlock(field as FormBlockData)
      ) {
        migrated = true;
      }
    }
  }

  return migrated;
};

type MongoCollection = BasePayload['db']['collections'][string]['collection'];

/** Rewrites the placeholders of one Mongo collection and returns how many documents it changed. */
const migrateCollection = async (
  payload: BasePayload,
  name: string,
  collection: MongoCollection,
  prefix: '' | 'version.',
): Promise<number> => {
  const cursor = collection.find(
    {},
    { projection: { [`${prefix}sections`]: 1, [`${prefix}fields`]: 1 } },
  );
  let migrated = 0;

  for await (const document of cursor) {
    const stored: unknown = prefix === '' ? document : document['version'];
    if (typeof stored !== 'object' || stored === null) continue;
    const formDocument = stored as FormDocumentData;
    if (!migrateFormDocumentPlaceholders(formDocument)) continue;

    const { sections, fields } = formDocument;
    const changes: Record<string, unknown> = {};
    if (Array.isArray(sections)) changes[`${prefix}sections`] = sections;
    if (Array.isArray(fields)) changes[`${prefix}fields`] = fields;

    try {
      // the raw driver, so an older version whose other fields predate the current schema
      // is not cast against it, which failed for every such version with a CastError
      await collection.updateOne({ _id: document._id }, { $set: changes });
      migrated += 1;
    } catch (error: unknown) {
      payload.logger.error(
        { err: error, source: name, id: String(document._id) },
        'Failed to migrate the placeholders of a form document',
      );
    }
  }
  return migrated;
};

/**
 * Rewrites string placeholders on `email`, `number`, and `select` blocks in forms and their versions
 * to `{ de: value }`.
 *
 * Existing placeholders were stored as plain strings before the placeholder fields were
 * localized. Without this migration, saving a form in the admin panel keeps the placeholder
 * only in the locale the editor is editing and wipes it for the others.
 *
 * Runs as a Payload migration, and is idempotent: placeholders that are already localized
 * objects or not strings are left untouched. A form or version that fails is logged and keeps its
 * plain placeholder, since nothing retries it.
 *
 * @param payload The Payload instance.
 */
export const migrateFormPlaceholders = async (payload: BasePayload): Promise<void> => {
  const forms = payload.db.collections['forms'];
  const versions = payload.db.versions['forms'];

  const migratedForms =
    forms === undefined ? 0 : await migrateCollection(payload, 'forms', forms.collection, '');
  const migratedVersions =
    versions === undefined
      ? 0
      : await migrateCollection(payload, 'forms (versions)', versions.collection, 'version.');

  if (migratedForms > 0 || migratedVersions > 0) {
    payload.logger.info(
      { forms: migratedForms, versions: migratedVersions },
      `Migrated placeholders to localized format across ${String(migratedForms)} forms and ${String(migratedVersions)} versions`,
    );
  }
};
