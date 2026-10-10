import type { Payload } from 'payload';

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

interface DatabaseAdapterWithUpdate {
  updateOne: (args: {
    collection: string;
    where: { id: { equals: number | string } };
    data: Record<string, unknown>;
  }) => Promise<unknown>;
  updateVersion: (args: {
    collection: string;
    id: number | string;
    where: { id: { equals: number | string } };
    versionData: Record<string, unknown>;
  }) => Promise<unknown>;
}

/**
 * Rewrites string placeholders on `email`, `number`, and `select` blocks in forms and their versions
 * to `{ de: value }`.
 *
 * Existing placeholders were stored as plain strings before the placeholder fields were
 * localized. Without this migration, saving a form in the admin panel keeps the placeholder
 * only in the locale the editor is editing and wipes it for the others.
 *
 * Runs on startup and is idempotent: placeholders that are already localized objects or not
 * strings are left untouched.
 *
 * @param payload The Payload instance.
 */
export const migrateFormPlaceholders = async (payload: Payload): Promise<void> => {
  try {
    const { docs: forms } = await payload.find({
      collection: 'forms',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      locale: 'all',
    });

    const db = payload.db as unknown as Partial<DatabaseAdapterWithUpdate>;

    let migratedForms = 0;
    for (const form of forms) {
      const formDocument = form as unknown as FormDocumentData;
      if (migrateFormDocumentPlaceholders(formDocument)) {
        try {
          if (typeof db.updateOne === 'function') {
            await db.updateOne({
              collection: 'forms',
              where: { id: { equals: form.id } },
              data: {
                sections: formDocument.sections,
                ...(Array.isArray(formDocument.fields) ? { fields: formDocument.fields } : {}),
              },
            });
          }
          migratedForms += 1;
        } catch (error: unknown) {
          payload.logger.warn(
            { err: error, formId: form.id },
            'Failed to migrate placeholders on form',
          );
        }
      }
    }

    let migratedVersions = 0;
    const { docs: versions } = await payload.findVersions({
      collection: 'forms',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      locale: 'all',
    });

    for (const versionDocument of versions) {
      const rawVersionDocument = versionDocument as unknown as {
        id: number | string;
        version?: unknown;
      };
      const versionData = rawVersionDocument.version;
      if (
        typeof versionData === 'object' &&
        versionData !== null &&
        migrateFormDocumentPlaceholders(versionData)
      ) {
        try {
          if (typeof db.updateVersion === 'function') {
            await db.updateVersion({
              collection: 'forms',
              id: rawVersionDocument.id,
              where: { id: { equals: rawVersionDocument.id } },
              versionData: {
                ...versionDocument,
                version: versionData,
              },
            });
          }
          migratedVersions += 1;
        } catch (error: unknown) {
          payload.logger.warn(
            { err: error, versionId: rawVersionDocument.id },
            'Failed to migrate placeholders on form version',
          );
        }
      }
    }

    if (migratedForms > 0 || migratedVersions > 0) {
      payload.logger.info(
        { forms: migratedForms, versions: migratedVersions },
        `Migrated placeholders to localized format across ${String(migratedForms)} forms and ${String(migratedVersions)} versions`,
      );
    }
  } catch (error: unknown) {
    payload.logger.error({ err: error }, 'Migrating form placeholders failed');
  }
};
