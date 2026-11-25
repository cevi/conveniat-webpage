import { getLocalizedFieldPaths } from '@/features/payload-cms/payload-cms/services/field-introspection';
import {
  collectProofreadSegments,
  proofreadWithGemini,
  toFindings,
} from '@/features/payload-cms/payload-cms/services/gemini-proofread';
import type { Field } from 'payload';
import { fetch } from 'undici';

jest.mock('undici', () => ({ Agent: jest.fn(), fetch: jest.fn() }));

const fetchMock = jest.mocked(fetch);

/** A `generateContent` answer whose text is `findings` as JSON. */
const geminiAnswer = (findings: unknown[]): Response =>
  Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify({ findings }) }] } }],
  });

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

/** A rich text state of one paragraph; each string is a text node, every second one bold. */
const richText = (...texts: string[]): unknown => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: texts.map((text, index) => ({ type: 'text', text, format: index % 2 })),
      },
    ],
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

    const { segments, truncated } = collectProofreadSegments(
      data,
      getLocalizedFieldPaths(fields),
      'de',
    );

    expect(truncated).toBe(false);
    expect(segments).toEqual([
      {
        id: 0,
        path: 'title',
        fieldType: 'text',
        label: 'Titel',
        text: data.title,
        value: data.title,
      },
      {
        id: 1,
        path: 'mainContent.0.richTextSection',
        fieldType: 'richText',
        label: 'Text',
        text: 'Über die CeviDB anmelden.',
        value: data.mainContent[0]?.richTextSection,
      },
      {
        id: 2,
        path: 'mainContent.1.items.0.line',
        fieldType: 'textarea',
        label: 'Line',
        text: 'Jede Abteilung melden ihre Höfe.',
        value: 'Jede Abteilung melden ihre Höfe.',
      },
    ]);
  });

  it('checks the beginning of a field too long for the budget and says the rest is unchecked', () => {
    const longText = `Das Aufbaulger beginnt. ${'Wir bauen den Hof auf. '.repeat(2000)}`;
    const data = {
      title: 'Kurz',
      mainContent: [{ blockType: 'richTextSection', richTextSection: richText(longText) }],
    };

    const { segments, truncated } = collectProofreadSegments(
      data,
      getLocalizedFieldPaths(fields),
      'de',
    );

    expect(truncated).toBe(true);
    expect(segments.map(({ path }) => path)).toEqual(['title', 'mainContent.0.richTextSection']);
    expect(segments[1]?.text.startsWith('Das Aufbaulger beginnt.')).toBe(true);
    expect(segments.reduce((sum, { text }) => sum + text.length, 0)).toBe(30_000);
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
      value: 'Der Hof und der Hof',
    },
    {
      id: 1,
      path: 'content',
      fieldType: 'richText' as const,
      label: 'Text',
      text: 'Bitte über die CeviDB anmelden.',
      value: richText('Bitte über die CeviDB anmelden.'),
    },
    {
      id: 2,
      path: 'intro',
      fieldType: 'richText' as const,
      label: 'Einleitung',
      text: 'Das Aufbaulger beginnt.',
      value: richText('Das Aufbau', 'lger', ' beginnt.'),
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

  it('cannot apply a place that spans normal and bold text', () => {
    const [result] = toFindings([finding(2, 'Aufbaulger', 'Aufbaulager')], segments);
    expect(result?.applicable).toBe(false);
  });
});

describe('proofreadWithGemini', () => {
  const segments = [
    {
      id: 0,
      path: 'title',
      fieldType: 'text' as const,
      label: 'Titel',
      text: 'Das Aufbaulger',
      value: 'Das Aufbaulger',
    },
  ];
  const aufbaulager = {
    segmentId: 0,
    category: 'spelling',
    original: 'Aufbaulger',
    suggestion: 'Aufbaulager',
    explanation: 'Tippfehler.',
  };

  beforeEach(() => fetchMock.mockReset());

  it('lets the lighter model answer when Flash is overloaded', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('busy', { status: 503 }) as never)
      .mockResolvedValueOnce(geminiAnswer([aufbaulager]) as never);

    const result = await proofreadWithGemini(segments, 'de', 'key');

    expect(result.model).toBe('gemini-3.5-flash-lite');
    expect(result.findings.map(({ suggestion }) => suggestion)).toEqual(['Aufbaulager']);
    const urls = fetchMock.mock.calls.map(([url]) => url as string);
    expect(urls[0]).toContain('gemini-3.6-flash:');
    expect(urls[1]).toContain('gemini-3.5-flash-lite:');
  });

  it('fails without findings when the answer is no JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ candidates: [{ content: { parts: [{ text: 'Sorry' }] } }] }) as never,
    );

    await expect(proofreadWithGemini(segments, 'de', 'key')).rejects.toMatchObject({
      reason: 'failed',
    });
  });
});
