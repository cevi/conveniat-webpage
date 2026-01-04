import type {
  SerializedEditorState,
  SerializedLexicalNode,
} from '@payloadcms/richtext-lexical/lexical';

interface TextNode {
  type: 'text';
  version: 1;
  text: string;
  format: number; // 0=normal, 1=bold, 2=italic, 3=bold+italic
  detail: number;
  mode: 'normal';
  style: string;
}

interface ParagraphNode {
  type: 'paragraph';
  version: 1;
  children: SerializedLexicalNode[];
  direction: 'ltr' | 'rtl' | null;
  format: '' | 'left' | 'center' | 'right' | 'justify';
  indent: number;
  textFormat: number;
  textStyle: string;
}

interface ListItemNode {
  type: 'listitem';
  version: 1;
  children: SerializedLexicalNode[];
  direction: 'ltr' | null;
  format: '';
  indent: number;
  value: number;
}

interface ListNode {
  type: 'list';
  version: 1;
  listType: 'bullet' | 'number';
  start: number;
  tag: 'ul' | 'ol';
  children: ListItemNode[];
  direction: 'ltr' | null;
  format: '';
  indent: number;
}

/**
 * Converts simple Markdown text to Lexical JSON format.
 * Supports:
 * - Paragraphs (blank lines separate paragraphs)
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Bullet lists: lines starting with "- " or "* "
 */
export function convertMarkdownToLexical(markdown: string): SerializedEditorState {
  const lines = markdown.split('\n');
  const children: SerializedLexicalNode[] = [];

  let currentListItems: ListItemNode[] = [];

  const flushList = (): void => {
    if (currentListItems.length > 0) {
      const listNode: ListNode = {
        type: 'list',
        version: 1,
        listType: 'bullet',
        start: 1,
        tag: 'ul',
        children: currentListItems,
        direction: 'ltr',
        format: '',
        indent: 0,
      };
      children.push(listNode as unknown as SerializedLexicalNode);
      currentListItems = [];
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for bullet list item
    if (/^[-*]\s+/.test(trimmedLine)) {
      const content = trimmedLine.replace(/^[-*]\s+/, '');
      const listItem: ListItemNode = {
        type: 'listitem',
        version: 1,
        children: [createParagraphNode(parseInlineFormatting(content))],
        direction: 'ltr',
        format: '',
        indent: 0,
        value: currentListItems.length + 1,
      };
      currentListItems.push(listItem);
    } else if (trimmedLine === '') {
      // Empty line - flush list if any and skip
      flushList();
    } else {
      // Regular paragraph
      flushList();
      children.push(createParagraphNode(parseInlineFormatting(trimmedLine)));
    }
  }

  // Flush any remaining list items
  flushList();

  return {
    root: {
      type: 'root',
      version: 1,
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
    },
  };
}

function createParagraphNode(textNodes: TextNode[]): ParagraphNode {
  return {
    type: 'paragraph',
    version: 1,
    children: textNodes as unknown as SerializedLexicalNode[],
    direction: 'ltr',
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
  };
}

/**
 * Parse inline formatting (bold, italic) from text.
 * **bold**, *italic*, ***bold+italic***
 */
function parseInlineFormatting(text: string): TextNode[] {
  const nodes: TextNode[] = [];
  // Regex to match bold (**...**), italic (*...*), or bold+italic (***...***)
  // We process bold+italic first, then bold, then italic
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add any text before this match as normal text
    if (match.index > lastIndex) {
      nodes.push(createTextNode(text.slice(lastIndex, match.index), 0));
    }

    if (match[2]) {
      // Bold + Italic: ***text***
      nodes.push(createTextNode(match[2], 3));
    } else if (match[3]) {
      // Bold: **text**
      nodes.push(createTextNode(match[3], 1));
    } else if (match[4]) {
      // Italic: *text*
      nodes.push(createTextNode(match[4], 2));
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(createTextNode(text.slice(lastIndex), 0));
  }

  // If no matches, return the whole text as normal
  if (nodes.length === 0) {
    nodes.push(createTextNode(text, 0));
  }

  return nodes;
}

function createTextNode(text: string, format: number): TextNode {
  return {
    type: 'text',
    version: 1,
    text,
    format,
    detail: 0,
    mode: 'normal',
    style: '',
  };
}

/**
 * Converts Lexical JSON to simple Markdown.
 * This is the reverse operation for pre-filling the editor.
 */
export function convertLexicalToMarkdown(editorState: SerializedEditorState): string {
  const rootChildren = editorState.root.children;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!rootChildren || rootChildren.length === 0) return '';

  const lines: string[] = [];

  for (const node of rootChildren) {
    lines.push(nodeToMarkdown(node as unknown as ParagraphNode | ListNode));
  }

  return lines.join('\n\n');
}

function nodeToMarkdown(node: ParagraphNode | ListNode): string {
  if (node.type === 'paragraph') {
    return childrenToMarkdown(node.children as unknown as TextNode[]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (node.type === 'list') {
    return node.children
      .map((item: ListItemNode) => {
        const paragraphChild = item.children[0] as unknown as ParagraphNode;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const content = paragraphChild
          ? childrenToMarkdown(paragraphChild.children as unknown as TextNode[])
          : '';
        return `- ${content}`;
      })
      .join('\n');
  }

  return '';
}

function childrenToMarkdown(children: TextNode[]): string {
  return children
    .map((child) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (child.type === 'text') {
        let text = child.text;
        // Format: 0=normal, 1=bold, 2=italic, 3=bold+italic
        switch (child.format) {
          case 3: {
            text = `***${text}***`;

            break;
          }
          case 1: {
            text = `**${text}**`;

            break;
          }
          case 2: {
            text = `*${text}*`;

            break;
          }
          // No default
        }
        return text;
      }
      return '';
    })
    .join('');
}
