import type { SerializedLexicalNode } from '@payloadcms/richtext-lexical/lexical';

export interface CustomAutoLinkNode extends SerializedLexicalNode {
  fields?: { url?: string };
  children?: SerializedLexicalNode[];
}

export function escapeHTML(string_: string): string {
  if (typeof string_ !== 'string') return '';
  return string_
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
