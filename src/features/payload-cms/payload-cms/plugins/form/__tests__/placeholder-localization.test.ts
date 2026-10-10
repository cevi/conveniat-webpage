jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    FEATURE_ENABLE_HOF_DASHBOARD: true,
  },
}));

jest.mock('@payloadcms/richtext-lexical', () => ({
  lexicalEditor: jest.fn(() => ({})),
  defaultEditorLexicalConfig: {},
}));

jest.mock('@/features/payload-cms/payload-cms/plugins/lexical-editor', () => ({
  minimalEditorFeatures: [],
}));

import { formFieldsTab } from '@/features/payload-cms/payload-cms/plugins/form/tabs/form-fields-tab';
import type { ArrayField, BlocksField, Field, GroupField } from 'payload';

describe('form fields placeholder localization', () => {
  it('ensures all form field blocks with a placeholder field have localized set to true', () => {
    const sectionsField = formFieldsTab.fields.find(
      (f): f is ArrayField => 'name' in f && f.name === 'sections',
    );
    const formSectionGroup = sectionsField?.fields.find(
      (f): f is GroupField => 'name' in f && f.name === 'formSection',
    );
    const fieldsBlocks = formSectionGroup?.fields.find(
      (f): f is BlocksField => 'name' in f && f.name === 'fields',
    );

    expect(fieldsBlocks).toBeDefined();

    const findPlaceholderFields = (fields: Field[]): Field[] => {
      const placeholders: Field[] = [];
      for (const field of fields) {
        if ('name' in field && field.name === 'placeholder') {
          placeholders.push(field);
        }
        if ('fields' in field && Array.isArray(field.fields)) {
          placeholders.push(...findPlaceholderFields(field.fields));
        }
      }
      return placeholders;
    };

    const blocksWithPlaceholder: { slug: string; placeholder: Field }[] = [];
    for (const block of fieldsBlocks?.blocks ?? []) {
      const placeholders = findPlaceholderFields(block.fields);
      for (const placeholder of placeholders) {
        blocksWithPlaceholder.push({ slug: block.slug, placeholder });
      }
    }

    expect(blocksWithPlaceholder.length).toBeGreaterThanOrEqual(5);

    const slugs = blocksWithPlaceholder.map((b) => b.slug);
    expect(slugs).toContain('email');
    expect(slugs).toContain('number');
    expect(slugs).toContain('select');
    expect(slugs).toContain('text');
    expect(slugs).toContain('textarea');

    for (const { slug, placeholder } of blocksWithPlaceholder) {
      expect({
        slug,
        localized: 'localized' in placeholder ? placeholder.localized : undefined,
      }).toEqual({
        slug,
        localized: true,
      });
    }
  });
});
