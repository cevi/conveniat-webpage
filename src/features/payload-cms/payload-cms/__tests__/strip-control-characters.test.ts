import { stripControlCharactersFromData } from '@/features/payload-cms/payload-cms/hooks/strip-control-characters';
import type { CollectionBeforeChangeHook } from 'payload';

type HookArguments = Parameters<CollectionBeforeChangeHook>[0];

const runHook = (data: Record<string, unknown>): Record<string, unknown> =>
  stripControlCharactersFromData({ data } as unknown as HookArguments) as Record<string, unknown>;

describe('stripControlCharactersFromData', () => {
  it('removes a pasted control character from a top level field', () => {
    const data = runHook({ description: 'bis und mit Fröschli\u0002 Kinder' });
    expect(data['description']).toBe('bis und mit Fröschli Kinder');
  });

  it('removes control characters from nested blocks and rich text nodes', () => {
    const data = runHook({
      mainContent: [
        {
          blockType: 'richTextSection',
          richTextSection: {
            root: { children: [{ type: 'text', text: 'Fröschli\u0002 Kinder' }] },
          },
        },
      ],
    });

    const [block] = data['mainContent'] as {
      richTextSection: { root: { children: { text: string }[] } };
    }[];
    expect(block?.richTextSection.root.children[0]?.text).toBe('Fröschli Kinder');
  });

  it('keeps tabs, line feeds and carriage returns', () => {
    const data = runHook({ description: 'erste Zeile\r\nzweite\tZeile' });
    expect(data['description']).toBe('erste Zeile\r\nzweite\tZeile');
  });

  it('leaves values that are not strings untouched', () => {
    const publishedAt = new Date('2027-07-26T00:00:00.000Z');
    const data = runHook({ publishedAt, limit: 50, draft: false, author: undefined });

    expect(data['publishedAt']).toBe(publishedAt);
    expect(data['limit']).toBe(50);
    expect(data['draft']).toBe(false);
    expect(data['author']).toBeUndefined();
  });
});
