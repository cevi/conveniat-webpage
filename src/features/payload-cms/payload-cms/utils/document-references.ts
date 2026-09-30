import type { Locale } from '@/types/types';
import type { FlattenedBlock, FlattenedField } from 'payload';

/** A field or block label as it is written in the config, before it is translated. */
export type ConfigLabel = string | Record<string, string>;

/** One reference to the target document inside the data of another document. */
export interface DocumentReference {
  /** labels of the fields and blocks leading to the referencing field, outermost first */
  path: ConfigLabel[];
  /** the locale the reference lives in, undefined for a field that is not localized */
  locale: Locale | undefined;
}

/** The ids one field holds that may point into a collection. */
export interface FieldReferences extends DocumentReference {
  ids: Set<string>;
}

interface WalkContext {
  path: ConfigLabel[];
  locale: Locale | undefined;
  locales: readonly string[];
  collection: string;
  references: FieldReferences[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toConfigLabel = (label: unknown, fallback: string): ConfigLabel => {
  if (typeof label === 'string' && label !== '') return label;
  if (isRecord(label) && Object.values(label).every((entry) => typeof entry === 'string')) {
    return label as Record<string, string>;
  }
  // label functions and `false` have nothing to show outside the admin form
  return fallback;
};

const blockLabel = (block: FlattenedBlock): ConfigLabel =>
  toConfigLabel(block.labels?.singular, block.slug);

const idOf = (value: unknown): unknown => (isRecord(value) ? value['id'] : value);

const relationTargets = (relationTo: string | string[], collection: string): boolean =>
  Array.isArray(relationTo) ? relationTo.includes(collection) : relationTo === collection;

/**
 * The id one stored relationship value points at in the collection. A single-collection
 * relationship stores the id (or, populated, the document); a polymorphic one wraps it in
 * `{ relationTo, value }`.
 */
const targetId = (
  relationTo: string | string[],
  value: unknown,
  collection: string,
): string | undefined => {
  let id = idOf(value);
  if (Array.isArray(relationTo)) {
    id = isRecord(value) && value['relationTo'] === collection ? idOf(value['value']) : undefined;
  }
  return typeof id === 'string' ? id : undefined;
};

/**
 * Rich text is a tree of editor nodes. Links, uploads and blocks inside it store their targets in
 * several shapes, and a Mongo ObjectId is unique across collections, so every string in it is a
 * candidate id that the caller matches against real ids. `id` keys are skipped, they hold the ids
 * of the nodes themselves.
 */
const collectStrings = (value: unknown, into: Set<string>): void => {
  if (typeof value === 'string') into.add(value);
  else if (Array.isArray(value)) for (const entry of value) collectStrings(entry, into);
  else if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (key !== 'id') collectStrings(entry, into);
    }
  }
};

const record = (context: WalkContext, label: ConfigLabel, ids: Set<string>): void => {
  if (ids.size === 0) return;
  const path = [...context.path, label];
  const key = JSON.stringify([path, context.locale]);
  const known = context.references.find(
    (reference) => JSON.stringify([reference.path, reference.locale]) === key,
  );
  if (known === undefined) context.references.push({ path, locale: context.locale, ids });
  else for (const id of ids) known.ids.add(id);
};

const walkFields = (fields: FlattenedField[], data: unknown, context: WalkContext): void => {
  if (!isRecord(data)) return;
  for (const field of fields) {
    const value = data[field.name];
    if (value === undefined || value === null) continue;

    // With `locale: 'all'` the outermost localized field holds one value per locale. Fields nested
    // inside it are stored once per locale already and carry no locale keys of their own.
    if (field.localized === true && context.locale === undefined && isRecord(value)) {
      for (const [locale, localizedValue] of Object.entries(value)) {
        if (!context.locales.includes(locale)) continue;
        walkField(field, localizedValue, { ...context, locale: locale as Locale });
      }
      continue;
    }
    walkField(field, value, context);
  }
};

function walkField(field: FlattenedField, value: unknown, context: WalkContext): void {
  const label = toConfigLabel('label' in field ? field.label : undefined, field.name);

  switch (field.type) {
    case 'relationship':
    case 'upload': {
      if (!relationTargets(field.relationTo, context.collection)) return;
      const values = Array.isArray(value) ? value : [value];
      const ids = values
        .map((entry) => targetId(field.relationTo, entry, context.collection))
        .filter((id) => id !== undefined);
      record(context, label, new Set(ids));
      return;
    }
    case 'richText': {
      const strings = new Set<string>();
      collectStrings(value, strings);
      record(context, label, strings);
      return;
    }
    case 'group':
    case 'tab': {
      walkFields(field.flattenedFields, value, { ...context, path: [...context.path, label] });
      return;
    }
    case 'array': {
      if (!Array.isArray(value)) return;
      for (const row of value) {
        walkFields(field.flattenedFields, row, { ...context, path: [...context.path, label] });
      }
      return;
    }
    case 'blocks': {
      if (!Array.isArray(value)) return;
      for (const row of value) {
        if (!isRecord(row)) continue;
        const block = field.blocks.find((candidate) => candidate.slug === row['blockType']);
        if (block === undefined) continue;
        walkFields(block.flattenedFields, row, {
          ...context,
          path: [...context.path, label, blockLabel(block)],
        });
      }
      return;
    }
    default: {
      return;
    }
  }
}

/**
 * Collects, per field, the ids `data` may reference in the collection. `data` is a document read
 * with `locale: 'all'` and `depth: 0`, and `fields` are the flattened fields of its collection or
 * global. Rich text reports every string it holds, so match the ids against real ones.
 */
export const collectReferences = (
  fields: FlattenedField[],
  data: unknown,
  collection: string,
  locales: readonly string[],
): FieldReferences[] => {
  const context: WalkContext = { path: [], locale: undefined, locales, collection, references: [] };
  walkFields(fields, data, context);
  return context.references;
};

/** Narrows collected references to the fields that hold one id. */
export const referencesTo = (references: FieldReferences[], id: string): DocumentReference[] =>
  references
    .filter((reference) => reference.ids.has(id))
    .map(({ path, locale }) => ({ path, locale }));

/**
 * Finds every field in `data` that references the target document, see {@link collectReferences}.
 */
export const findDocumentReferences = (
  fields: FlattenedField[],
  data: unknown,
  target: { collection: string; id: string },
  locales: readonly string[],
): DocumentReference[] =>
  referencesTo(collectReferences(fields, data, target.collection, locales), target.id);

/**
 * Whether a field can hold a reference to the collection, directly or through the fields nested in
 * it. Rich text counts as a possible reference because its links and uploads are configured per
 * editor.
 */
export const canReferenceCollection = (field: FlattenedField, collection: string): boolean => {
  switch (field.type) {
    case 'relationship':
    case 'upload': {
      return relationTargets(field.relationTo, collection);
    }
    case 'richText': {
      return true;
    }
    case 'group':
    case 'tab':
    case 'array': {
      return field.flattenedFields.some((nested) => canReferenceCollection(nested, collection));
    }
    case 'blocks': {
      return field.blocks.some((block) =>
        block.flattenedFields.some((nested) => canReferenceCollection(nested, collection)),
      );
    }
    default: {
      return false;
    }
  }
};
