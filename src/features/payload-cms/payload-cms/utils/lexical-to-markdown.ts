export interface LexicalNode {
  type: string;
  text?: string;
  format?: number;
  children?: LexicalNode[];
}

export interface LexicalRichText {
  root?: LexicalNode;
}

/**
 * Serializes a lexical rich text tree into the lightweight markdown dialect the
 * chat renders (see `format-message-content.tsx`).
 *
 * Both ways of breaking a line in the editor have to survive this conversion:
 * `paragraph` nodes for a hard break (enter) and `linebreak` nodes for a soft
 * break (shift+enter, and every newline of a pasted text block).
 */
export const serializeLexicalToMarkdown = (node: LexicalNode | null | undefined): string => {
  if (node === undefined || node === null) return '';
  if (node.type === 'text') {
    let text = node.text ?? '';
    if (node.format !== undefined && (node.format & 1) !== 0) text = `*${text}*`; // Bold
    if (node.format !== undefined && (node.format & 2) !== 0) text = `_${text}_`; // Italic
    return text;
  }
  // A soft line break carries no children and no text, so it has to be handled
  // before the generic branches below, which would silently drop it.
  if (node.type === 'linebreak') return '\n';
  if (node.type === 'link' || node.type === 'autolink') {
    const nodeObject = node as unknown as Record<string, unknown>;
    const fields = (nodeObject['fields'] ?? {}) as Record<string, unknown>;
    const url = (fields['url'] ?? nodeObject['url'] ?? '') as string;
    const childrenText = node.children
      ? node.children.map((child) => serializeLexicalToMarkdown(child)).join('')
      : '';
    if (url !== '') {
      if (childrenText === url) return childrenText;
      return `[${childrenText}](${url})`;
    }
    return childrenText;
  }
  if (node.children !== undefined) {
    const childrenText = node.children.map((child) => serializeLexicalToMarkdown(child)).join('');
    if (node.type === 'paragraph') return childrenText + '\n';
    if (node.type === 'listitem') return `- ${childrenText}\n`;
    return childrenText;
  }
  return '';
};

export const getLexicalText = (richText: unknown): string => {
  if (richText === undefined || richText === null || richText === '') return '';
  if (typeof richText === 'string') return richText;
  const lexicalRichText = richText as LexicalRichText;
  if (lexicalRichText.root !== undefined) {
    return serializeLexicalToMarkdown(lexicalRichText.root).trim();
  }
  return JSON.stringify(richText);
};
