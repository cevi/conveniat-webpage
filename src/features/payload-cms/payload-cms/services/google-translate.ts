import { environmentVariables } from '@/config/environment-variables';

interface TranslateResult {
  translatedText: string;
}

interface GoogleTranslateResponse {
  data: {
    translations: {
      translatedText: string;
      detectedSourceLanguage: string;
    }[];
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHTMLEntities(text: string): string {
  if (!text) return text;
  return text
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&nbsp;', ' ');
}

export async function translateTexts(
  texts: string[],
  targetLang: string,
  sourceLang: string,
  format: 'text' | 'html' = 'text',
): Promise<TranslateResult[]> {
  const apiKey = environmentVariables.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY is not configured.');
  }

  if (texts.length === 0) return [];

  // Google Translate v2 limit is 128 segments per request
  const BATCH_SIZE = 128;
  const results: TranslateResult[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    let lastError: Error | undefined;
    let attempt = 0;
    const maxAttempts = 3;
    let success = false;

    while (attempt < maxAttempts && !success) {
      try {
        const url = new URL('https://translation.googleapis.com/language/translate/v2');
        url.searchParams.append('key', apiKey);

        // Use a timeout to avoid hanging indefinitely and trigger retries
        const signal = AbortSignal.timeout(60000); // 60 seconds

        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: batch,
            target: targetLang,
            source: sourceLang,
            format: format,
          }),
          signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Google Translate API Error ${response.status}: ${errorBody}`);
        }

        const data = (await response.json() as unknown) as GoogleTranslateResponse;
        const batchResults = data.data.translations.map((t) => ({
          translatedText: format === 'text' ? decodeHTMLEntities(t.translatedText) : t.translatedText,
        }));
        results.push(...batchResults);
        success = true;
      } catch (error) {
        attempt++;
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxAttempts) {
          console.warn(`Translation attempt ${attempt} failed, retrying in ${attempt * 1000}ms...`, lastError.message);
          await sleep(attempt * 1000);
        }
      }
    }

    if (!success) {
      throw lastError || new Error('Unknown translation error');
    }

    // Small delay between batches to prevent overwhelming the API or network
    if (i + BATCH_SIZE < texts.length) {
      await sleep(100);
    }
  }

  return results;
}

export interface LexicalNode {
  type?: string;
  text?: string;
  format?: number;
  style?: string;
  mode?: string;
  version?: number;
  children?: LexicalNode[];
  root?: { children?: LexicalNode[] };
  [key: string]: unknown;
}

const INLINE_TYPES = new Set(['text', 'link', 'autolink', 'linebreak']);

function escapeHTML(string_: string): string {
  return string_
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function serializeToHTML(children: LexicalNode[], referenceMap: LexicalNode[]): string {
  let html = '';
  for (const child of children) {
    switch (child.type) {
      case 'text': {
        const index = referenceMap.length;
        referenceMap.push(child);
        html += `<span data-text-index="${index}" data-format="${child.format || 0}" data-style="${child.style || ''}">${escapeHTML(child.text || '')}</span>`;
        break;
      }
      case 'linebreak': {
        html += `<br/>`;

        break;
      }
      case 'link':
      case 'autolink': {
        const index = referenceMap.length;
        referenceMap.push(child);
        html += `<a data-index="${index}">${serializeToHTML(child.children || [], referenceMap)}</a>`;

        break;
      }
      default: {
        const index = referenceMap.length;
        referenceMap.push(child);
        html += `<span class="untranslatable" data-index="${index}"></span>`;
      }
    }
  }
  return html;
}

function parseHTMLToLexical(html: string, referenceMap: LexicalNode[]): LexicalNode[] {
  const tokens = html.split(/(<[^>]+>)/g).filter(Boolean);
  const root: LexicalNode = { type: 'root', children: [] };
  const stack: LexicalNode[] = [root];

  for (const token of tokens) {
    const parent = stack.at(-1);

    if (token.startsWith('</')) {
      stack.pop();
    } else if (token.startsWith('<br')) {
      parent?.children?.push({ type: 'linebreak', version: 1 });
    } else if (token.startsWith('<span') || token.startsWith('<a')) {
      const matchIndex = token.match(/data-index="(\d+)"/);

      if (token.includes('class="untranslatable"') && matchIndex) {
        const index = Number.parseInt(matchIndex[1] || '0', 10);
        const originalNode = referenceMap[index];
        if (originalNode) parent?.children?.push({ ...originalNode });
        if (!token.endsWith('/>') && !token.includes('</span')) {
          stack.push({ type: 'ignore', children: [] });
        }
        continue;
      }

      if (token.startsWith('<a') && matchIndex) {
        const index = Number.parseInt(matchIndex[1] || '0', 10);
        const originalNode = referenceMap[index];
        const newNode = { ...originalNode, children: [] };
        parent?.children?.push(newNode);
        if (!token.endsWith('/>')) stack.push(newNode);
      } else if (token.startsWith('<span')) {
        const matchTextIndex = token.match(/data-text-index="(\d+)"/);
        let newNode: LexicalNode = {};

        if (matchTextIndex) {
          const index = Number.parseInt(matchTextIndex[1] || '0', 10);
          const originalNode = referenceMap[index];
          if (originalNode) {
            newNode = { ...originalNode };
            delete newNode.children;
          }
        }

        const matchFormat = token.match(/data-format="(\d+)"/);
        const matchStyle = token.match(/data-style="([^"]*)"/);
        
        newNode.type = 'text';
        newNode.text = '';
        if (!('mode' in newNode)) newNode.mode = 'normal';
        if (!('version' in newNode)) newNode.version = 1;
        if (!('detail' in newNode)) newNode['detail'] = 0;
        
        if (matchFormat) {
          newNode.format = Number.parseInt(matchFormat[1] || '0', 10);
        } else if (!('format' in newNode)) {
          newNode.format = 0;
        }

        if (matchStyle?.[1]) newNode.style = matchStyle[1];

        parent?.children?.push(newNode);
        if (!token.endsWith('/>')) stack.push(newNode);
      }
    } else if (parent) {
      const text = decodeHTMLEntities(token);
      if (parent.type === 'text') {
        parent.text = (parent.text || '') + text;
      } else if (parent.type !== 'ignore') {
        parent.children?.push({
          type: 'text',
          format: 0,
          mode: 'normal',
          version: 1,
          text,
        });
      }
    }
  }
  return root.children || [];
}

export async function translateLexicalRichText(
  lexicalJson: LexicalNode | null | undefined,
  targetLang: string,
  sourceLang: string,
): Promise<LexicalNode | null | undefined> {
  if (!lexicalJson || typeof lexicalJson !== 'object') return lexicalJson;

  // deep clone
  const clone = structuredClone(lexicalJson);
  const units: { node: LexicalNode; html: string }[] = [];
  const referenceMap: LexicalNode[] = [];

  function collectUnits(node: LexicalNode | null | undefined): void {
    if (typeof node !== 'object' || node === null) return;

    if (Array.isArray(node.children)) {
      const isUnit =
        node.type &&
        !INLINE_TYPES.has(node.type) &&
        node.children.some((child: LexicalNode) => child.type && INLINE_TYPES.has(child.type));

      if (isUnit) {
        const html = serializeToHTML(node.children, referenceMap);
        if (html.trim() !== '') {
          units.push({ node, html });
        }
      } else {
        for (const child of node.children) {
          collectUnits(child);
        }
      }
    } else if (node.root && Array.isArray(node.root.children)) {
      collectUnits(node.root);
    }
  }

  collectUnits(clone);

  if (units.length === 0) { return clone; }

  const htmls = units.map((u) => u.html);
  const results = await translateTexts(htmls, targetLang, sourceLang, 'html');

  for (const [index, unit] of units.entries()) {
    const translatedHtml = results[index]?.translatedText || '';
    const newChildren = parseHTMLToLexical(translatedHtml, referenceMap);
    unit.node.children = newChildren;
  }

  return clone;
}
