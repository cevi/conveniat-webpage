import {
  canReferenceCollection,
  findDocumentReferences,
} from '@/features/payload-cms/payload-cms/utils/document-references';
import type { FlattenedField } from 'payload';

const DOCUMENT_ID = '66a1f0c2b7e4d93a1c5e8f01';
const OTHER_ID = '66a1f0c2b7e4d93a1c5e8f02';
const LOCALES = ['de', 'fr', 'en'];
const target = { collection: 'documents', id: DOCUMENT_ID };

// Payload flattens rows and unnamed tabs away and gives every group, tab, array and block its
// `flattenedFields`, which is the shape the sanitized config hands to the walker.
const pageFields = [
  { name: 'internalPageName', type: 'text' },
  {
    name: 'content',
    type: 'tab',
    label: { de: 'Seiteninhalt', en: 'Content', fr: 'Contenu' },
    flattenedFields: [
      {
        name: 'mainContent',
        label: { de: 'Hauptinhalt', en: 'Main content', fr: 'Contenu principal' },
        type: 'blocks',
        localized: true,
        blocks: [
          {
            slug: 'fileDownload',
            labels: { singular: 'File Download', plural: 'File Downloads' },
            flattenedFields: [
              { name: 'file', label: 'File', type: 'relationship', relationTo: 'documents' },
            ],
          },
          {
            slug: 'callToAction',
            labels: { singular: 'Call to Action', plural: 'Calls to Action' },
            flattenedFields: [
              {
                name: 'linkField',
                type: 'group',
                flattenedFields: [
                  {
                    name: 'reference',
                    label: 'Document to redirect to',
                    type: 'relationship',
                    relationTo: ['blog', 'generic-page', 'images', 'documents'],
                  },
                ],
              },
            ],
          },
          {
            slug: 'richTextSection',
            labels: { singular: 'Rich Text', plural: 'Rich Texts' },
            flattenedFields: [{ name: 'richTextSection', label: 'Text', type: 'richText' }],
          },
        ],
      },
    ],
  },
] as unknown as FlattenedField[];

const hofDashboardFields = [
  {
    name: 'documents',
    label: 'Official documents',
    type: 'array',
    flattenedFields: [
      { name: 'document', label: 'Document', type: 'upload', relationTo: 'documents' },
    ],
  },
] as unknown as FlattenedField[];

const emergencyCardFields = [
  { name: 'title', type: 'text' },
  {
    name: 'documents',
    label: 'Linked documents',
    type: 'relationship',
    relationTo: 'documents',
    hasMany: true,
  },
] as unknown as FlattenedField[];

const link = (relationTo: string): object => ({
  blockType: 'callToAction',
  linkField: { type: 'reference', reference: { relationTo, value: DOCUMENT_ID } },
});

describe('findDocumentReferences', () => {
  it('finds a file download block in the locale it was placed in', () => {
    const page = {
      internalPageName: 'Anmeldung',
      content: {
        mainContent: {
          de: [{ blockType: 'fileDownload', file: OTHER_ID }],
          fr: [{ blockType: 'fileDownload', file: DOCUMENT_ID }],
        },
      },
    };

    expect(findDocumentReferences(pageFields, page, target, LOCALES)).toEqual([
      {
        path: [
          { de: 'Seiteninhalt', en: 'Content', fr: 'Contenu' },
          { de: 'Hauptinhalt', en: 'Main content', fr: 'Contenu principal' },
          'File Download',
          'File',
        ],
        locale: 'fr',
      },
    ]);
  });

  it('finds a link to the document, but not a link to an image with the same id', () => {
    const fields = pageFields;

    expect(
      findDocumentReferences(
        fields,
        { content: { mainContent: { de: [link('documents')] } } },
        target,
        LOCALES,
      ).map((reference) => reference.locale),
    ).toEqual(['de']);
    expect(
      findDocumentReferences(
        fields,
        { content: { mainContent: { de: [link('images')] } } },
        target,
        LOCALES,
      ),
    ).toEqual([]);
  });

  it('finds a link inside rich text', () => {
    const richText = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'link',
                id: 'node-1',
                fields: {
                  linkType: 'internal',
                  doc: { relationTo: 'documents', value: DOCUMENT_ID },
                },
              },
            ],
          },
        ],
      },
    };
    const page = {
      content: {
        mainContent: { en: [{ blockType: 'richTextSection', richTextSection: richText }] },
      },
    };

    const references = findDocumentReferences(pageFields, page, target, LOCALES);

    expect(references).toHaveLength(1);
    expect(references[0]?.path.at(-1)).toBe('Text');
    expect(references[0]?.locale).toBe('en');
  });

  it('reports a document that is placed twice in one field only once', () => {
    const page = {
      content: {
        mainContent: {
          de: [
            { blockType: 'fileDownload', file: DOCUMENT_ID },
            { blockType: 'fileDownload', file: DOCUMENT_ID },
          ],
        },
      },
    };

    expect(findDocumentReferences(pageFields, page, target, LOCALES)).toHaveLength(1);
  });

  it('finds an upload in an array without a locale', () => {
    const settings = { documents: [{ document: OTHER_ID }, { document: DOCUMENT_ID }] };

    expect(findDocumentReferences(hofDashboardFields, settings, target, LOCALES)).toEqual([
      { path: ['Official documents', 'Document'], locale: undefined },
    ]);
  });

  it('finds the document in a has-many relationship, populated or not', () => {
    const fields = emergencyCardFields;

    expect(
      findDocumentReferences(fields, { documents: [OTHER_ID, DOCUMENT_ID] }, target, LOCALES),
    ).toHaveLength(1);
    expect(
      findDocumentReferences(fields, { documents: [{ id: DOCUMENT_ID }] }, target, LOCALES),
    ).toHaveLength(1);
    expect(findDocumentReferences(fields, { documents: [OTHER_ID] }, target, LOCALES)).toEqual([]);
  });

  it('tolerates drafts with missing and malformed values', () => {
    const page = {
      // eslint-disable-next-line unicorn/no-null -- Mongo stores a cleared locale as null
      content: { mainContent: { de: [{ blockType: 'removedBlock' }, 'garbage'], fr: null } },
    };

    expect(findDocumentReferences(pageFields, page, target, LOCALES)).toEqual([]);
  });
});

describe('canReferenceCollection', () => {
  it('tells fields that can hold a document from those that cannot', () => {
    const [title, documents] = emergencyCardFields;
    const [, content] = pageFields;

    expect(title && canReferenceCollection(title, 'documents')).toBe(false);
    expect(documents && canReferenceCollection(documents, 'documents')).toBe(true);
    expect(content && canReferenceCollection(content, 'documents')).toBe(true);
    expect(documents && canReferenceCollection(documents, 'images')).toBe(false);
  });
});
