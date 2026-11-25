import { getLocalizedFieldPaths } from '@/features/payload-cms/payload-cms/services/field-introspection';
import {
  collectProofreadSegments,
  toFindings,
} from '@/features/payload-cms/payload-cms/services/gemini-proofread';
import type { Field } from 'payload';

const fields: Field[] = [
  { name: 'title', type: 'text', localized: true, label: { de: 'Titel', en: 'Title' } },
  { name: 'urlSlug', type: 'text', localized: true },
  { name: 'internalNote', type: 'text' },
  {
    type: 'tabs',
    tabs: [
      {
        label: 'Inhalt',
        fields: [
          {
            name: 'mainContent',
            type: 'blocks',
            localized: true,
            blocks: [
              {
                slug: 'richTextSection',
                fields: [{ name: 'richTextSection', type: 'richText', label: 'Text' }],
              },
              {
                slug: 'summaryBox',
                fields: [
                  { name: 'heading', type: 'text' },
                  { name: 'items', type: 'array', fields: [{ name: 'line', type: 'textarea' }] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

const richText = (value: string): unknown => ({
  root: {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'text', text: value }] }],
  },
});

describe('collectProofreadSegments', () => {
  it('collects the localized text with the paths the admin form knows', () => {
    const data = {
      title: 'Anmeldung für das Aufbaulger',
      urlSlug: 'anmeldung',
      internalNote: 'nur intern',
      mainContent: [
        { blockType: 'richTextSection', richTextSection: richText('Über die CeviDB anmelden.') },
        {
          blockType: 'summaryBox',
          heading: '',
          items: [{ line: 'Jede Abteilung melden ihre Höfe.' }],
        },
      ],
    };

    const segments = collectProofreadSegments(data, getLocalizedFieldPaths(fields), 'de');

    expect(segments).toEqual([
      { id: 0, path: 'title', fieldType: 'text', label: 'Titel', text: data.title },
      {
        id: 1,
        path: 'mainContent.0.richTextSection',
        fieldType: 'richText',
        label: 'Text',
        text: 'Über die CeviDB anmelden.',
      },
      {
        id: 2,
        path: 'mainContent.1.items.0.line',
        fieldType: 'textarea',
        label: 'Line',
        text: 'Jede Abteilung melden ihre Höfe.',
      },
    ]);
  });
});

const finding = (
  segmentId: number,
  original: string,
  suggestion: string,
): Parameters<typeof toFindings>[0][number] => ({
  segmentId,
  category: 'spelling',
  original,
  suggestion,
  explanation: '',
});

describe('toFindings', () => {
  const segments = [
    {
      id: 0,
      path: 'title',
      fieldType: 'text' as const,
      label: 'Titel',
      text: 'Der Hof und der Hof',
    },
    {
      id: 1,
      path: 'content',
      fieldType: 'richText' as const,
      label: 'Text',
      text: 'Bitte über die CeviDB anmelden.',
    },
  ];

  it('points at the place with the text around it', () => {
    const [result] = toFindings([finding(1, 'CeviDB', 'Cevi.DB')], segments);

    expect(result).toMatchObject({
      path: 'content',
      fieldLabel: 'Text',
      before: 'Bitte über die ',
      after: ' anmelden.',
      applicable: true,
    });
  });

  it('drops a quote that is not in the text, an unknown segment and a non-change', () => {
    expect(
      toFindings(
        [
          finding(1, 'Cevi DB', 'Cevi.DB'),
          finding(7, 'Hof', 'Höfe'),
          finding(1, 'CeviDB', 'CeviDB'),
          finding(1, 'CeviDB', 'Cevi.DB'),
          finding(1, 'CeviDB', 'Cevi.DB'),
        ],
        segments,
      ),
    ).toHaveLength(1);
  });

  it('cannot apply a place that occurs twice in its field', () => {
    const [result] = toFindings([finding(0, 'Hof', 'Höfe')], segments);
    expect(result?.applicable).toBe(false);
  });
});
