import type { Field } from 'payload';

// Not exported by Payload. Publishing one language ("Deutsch veröffentlichen") runs it to lay
// the new draft of that language over the other languages of the published version, and
// `patches/payload@3.93.0.patch` makes it pair rows by id. This test fails if an upgrade drops
// the patch while Payload still pairs rows by position.
import { mergeLocalizedData } from '../../../../../node_modules/payload/dist/utilities/mergeLocalizedData.js';

// Shaped like a sanitized config, which gives every row and block an `id` field.
const fields: Field[] = [
  {
    name: 'sections',
    type: 'array',
    fields: [
      { name: 'id', type: 'text' },
      { name: 'title', type: 'text', localized: true },
      {
        name: 'fields',
        type: 'blocks',
        blocks: [
          {
            slug: 'text',
            fields: [
              { name: 'id', type: 'text' },
              { name: 'label', type: 'text', localized: true },
            ],
          },
          {
            slug: 'checkbox',
            fields: [
              { name: 'id', type: 'text' },
              { name: 'label', type: 'richText', localized: true },
            ],
          },
        ],
      },
    ],
  },
];

const richText = (text: string): Record<string, unknown> => ({ root: { children: [{ text }] } });

const published = {
  sections: [
    {
      id: 'lunch',
      title: { de: 'Mittagessen', fr: 'Repas de midi' },
      fields: [{ id: 'diet', blockType: 'text', label: { de: 'Essen', fr: 'Régime' } }],
    },
    {
      id: 'rules',
      title: { de: 'Regeln', fr: 'Règles' },
      fields: [
        {
          id: 'arrival',
          blockType: 'checkbox',
          label: { de: richText('Anreise'), fr: richText('Arrivée') },
        },
      ],
    },
  ],
};

describe('publishing a single locale', () => {
  it('keeps the other locales on their rows when a row was inserted before them', () => {
    // The German draft adds a section in front of the published ones.
    const germanDraft = {
      sections: [
        {
          id: 'contact',
          title: { de: 'Kontaktangaben' },
          fields: [{ id: 'name', blockType: 'text', label: { de: 'Vorname' } }],
        },
        {
          id: 'lunch',
          title: { de: 'Mittagessen' },
          fields: [{ id: 'diet', blockType: 'text', label: { de: 'Essgewohnheiten' } }],
        },
        {
          id: 'rules',
          title: { de: 'Regeln' },
          fields: [{ id: 'arrival', blockType: 'checkbox', label: { de: richText('Anreise') } }],
        },
      ],
    };

    const merged = mergeLocalizedData({
      configBlockReferences: [],
      dataWithLocales: germanDraft,
      docWithLocales: published,
      fields,
      localesToUpdate: ['de'],
    });

    expect(merged['sections']).toEqual([
      {
        id: 'contact',
        title: { de: 'Kontaktangaben' },
        fields: [{ id: 'name', blockType: 'text', label: { de: 'Vorname' } }],
      },
      {
        id: 'lunch',
        title: { de: 'Mittagessen', fr: 'Repas de midi' },
        fields: [{ id: 'diet', blockType: 'text', label: { de: 'Essgewohnheiten', fr: 'Régime' } }],
      },
      {
        id: 'rules',
        title: { de: 'Regeln', fr: 'Règles' },
        fields: [
          {
            id: 'arrival',
            blockType: 'checkbox',
            label: { de: richText('Anreise'), fr: richText('Arrivée') },
          },
        ],
      },
    ]);
  });
});
