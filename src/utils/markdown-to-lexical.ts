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

interface YoutubeEmbedBlockNode {
  type: 'block';
  version: 2;
  format: '';
  fields: {
    id: string;
    blockName: string;
    blockType: 'youtubeEmbed';
    links: { id: string; link: string }[];
  };
}

/** A line that is nothing but a YouTube link stands for an embedded video. */
const YOUTUBE_LINE_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}\S*$/;

/** A new id in the shape Payload gives blocks and array rows. */
const createObjectId = (): string =>
  Array.from(globalThis.crypto.getRandomValues(new Uint8Array(12)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

/**
 * Converts simple Markdown text to Lexical JSON format.
 * Supports:
 * - Paragraphs (blank lines separate paragraphs)
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Bullet lists: lines starting with "- " or "* "
 * - YouTube videos: lines holding nothing but a YouTube link, consecutive ones in one block
 */
export function convertMarkdownToLexical(markdown: string): SerializedEditorState {
  const lines = markdown.split('\n');
  const children: SerializedLexicalNode[] = [];

  let currentListItems: ListItemNode[] = [];
  let currentVideoLinks: string[] = [];

  const flushVideos = (): void => {
    if (currentVideoLinks.length > 0) {
      const blockNode: YoutubeEmbedBlockNode = {
        type: 'block',
        version: 2,
        format: '',
        fields: {
          id: createObjectId(),
          blockName: '',
          blockType: 'youtubeEmbed',
          links: currentVideoLinks.map((link) => ({ id: createObjectId(), link })),
        },
      };
      children.push(blockNode);
      currentVideoLinks = [];
    }
  };

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
      children.push(listNode);
      currentListItems = [];
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (YOUTUBE_LINE_PATTERN.test(trimmedLine)) {
      flushList();
      currentVideoLinks.push(trimmedLine);
      continue;
    }
    flushVideos();

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

  // Flush any remaining list items and videos
  flushList();
  flushVideos();

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
    children: textNodes,
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
 *
 * Accepts `null`/`undefined` because optional (and localized, with
 * `fallback: false`) richText fields come back unset from Payload — an absent
 * value is an empty document, not an error.
 */
export function convertLexicalToMarkdown(
  editorState: SerializedEditorState | null | undefined,
): string {
  // Guard `root` too: stored documents predating the current editor config
  // are not guaranteed to match the generated type.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const rootChildren = editorState?.root?.children;
  if (!rootChildren || rootChildren.length === 0) return '';

  const lines: string[] = [];

  for (const node of rootChildren) {
    lines.push(nodeToMarkdown(node as unknown as ParagraphNode | ListNode | YoutubeEmbedBlockNode));
  }

  return lines.join('\n\n');
}

function nodeToMarkdown(node: ParagraphNode | ListNode | YoutubeEmbedBlockNode): string {
  if (node.type === 'paragraph') {
    return childrenToMarkdown(node.children as unknown as TextNode[]);
  }

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

  // a video stays one link per line, so saving an edit keeps it
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (node.type === 'block' && node.fields?.blockType === 'youtubeEmbed') {
    return (Array.isArray(node.fields.links) ? node.fields.links : [])
      .map((row) => row.link)
      .filter((link) => typeof link === 'string' && link.trim() !== '')
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
