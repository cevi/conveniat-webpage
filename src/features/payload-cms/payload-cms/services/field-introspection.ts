import type { Field } from 'payload';

export interface LocalizedFieldReference {
  path: string[];
  type: 'text' | 'textarea' | 'richText';
}

/**
 * Extracts paths recursively for translatable fields.
 *
 * The key insight: when a parent field (like a `blocks` or `array` field)
 * is `localized: true`, the entire subtree is locale-specific as a unit.
 * Fields INSIDE that subtree are typically NOT individually `localized`,
 * because the parent already handles localization. We still need to
 * translate all text/richText leaves inside those subtrees.
 *
 * `insideLocalizedParent` tracks whether we're already inside a localized
 * parent, so we can pick up non-localized text/richText fields too.
 */
export function getLocalizedFieldPaths(
  fields: Field[],
  currentPath: string[] = [],
  insideLocalizedParent = false,
): LocalizedFieldReference[] {
  const localizedFields: LocalizedFieldReference[] = [];

  for (const field of fields) {
    // Skip non-translatable field types
    if (field.type === 'ui' || field.type === 'upload' || field.type === 'relationship') {
      continue;
    }

    // Skip fields that should not be automatically translated (e.g. unique identifiers, slugs)
    if ('name' in field && (field.name === 'urlSlug' || field.name === 'slug')) {
      continue;
    }

    // Skip select, radio, checkbox, date, number, point, json, email, code fields
    // These are structural/config fields that should not be translated
    if (
      field.type === 'select' ||
      field.type === 'radio' ||
      field.type === 'checkbox' ||
      field.type === 'date' ||
      field.type === 'number' ||
      field.type === 'point' ||
      field.type === 'json' ||
      field.type === 'email' ||
      field.type === 'code'
    ) {
      continue;
    }

    if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        const tabPath = [...currentPath];
        if ('name' in tab && tab.name) {
          tabPath.push(tab.name);
        }
        localizedFields.push(...getLocalizedFieldPaths(tab.fields, tabPath, insideLocalizedParent));
      }
      continue;
    }

    if (field.type === 'group' || field.type === 'row' || field.type === 'collapsible') {
      const groupPath = [...currentPath];
      if ('name' in field && field.name) {
        groupPath.push(field.name);
      }
      // If this group itself is localized, children are inside a localized parent
      const childIsLocalized =
        insideLocalizedParent || ('localized' in field && field.localized === true);
      localizedFields.push(...getLocalizedFieldPaths(field.fields, groupPath, childIsLocalized));
      continue;
    }

    if (field.type === 'array') {
      const arrayPath = [...currentPath];
      if ('name' in field && field.name) {
        arrayPath.push(field.name);
      }
      // If this array itself is localized, children are inside a localized parent
      const childIsLocalized =
        insideLocalizedParent || ('localized' in field && field.localized === true);
      localizedFields.push(
        ...getLocalizedFieldPaths(field.fields, [...arrayPath, '[]'], childIsLocalized),
      );
      continue;
    }

    if (field.type === 'blocks') {
      const blocksPath = [...currentPath];
      if ('name' in field && field.name) {
        blocksPath.push(field.name);
      }
      // If this blocks field is localized, children are inside a localized parent
      const childIsLocalized =
        insideLocalizedParent || ('localized' in field && field.localized === true);
      for (const block of field.blocks) {
        localizedFields.push(
          ...getLocalizedFieldPaths(
            block.fields,
            [...blocksPath, '[]', block.slug],
            childIsLocalized,
          ),
        );
      }
      continue;
    }

    // Leaf nodes: translate if the field itself is localized, OR if we're
    // inside a localized parent (meaning the parent handles localization)
    if ('name' in field && (field.localized || insideLocalizedParent)) {
      if (field.type === 'text' || field.type === 'textarea') {
        localizedFields.push({ path: [...currentPath, field.name], type: field.type });
      } else if (field.type === 'richText') {
        localizedFields.push({ path: [...currentPath, field.name], type: 'richText' });
      }
    }
  }

  return localizedFields;
}
