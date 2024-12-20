type LexicalPlaceholder = {
  [p: string]: unknown;
  root?: {
    type?: string;
    children?: ({ [p: string]: unknown; type?: string; version?: number } | undefined)[];
    direction?: 'ltr' | 'rtl' | null;
    format?: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
    indent?: number;
    version?: number;
  };
};

export const lexicalPlaceholder: LexicalPlaceholder = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Conveniat 2027 - WIR SIND CEVI',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        format: 'start' as const,
        indent: 0,
        type: 'heading',
        version: 1,
        tag: 'h2',
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Apparently we had reached a great height in the atmosphere, for the sky was a dead black, and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea to the level of the spectato.',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        format: 'start' as const,
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: 0,
        textStyle: '',
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Erfahre mehr >',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        format: 'start' as const,
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: 0,
        textStyle: '',
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Apparently we had reached a great height in the atmosphere, for the sky was a dead black, and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea to the level of the spectato.',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        format: 'left' as const,
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: 0,
        textStyle: '',
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Apparently we had reached a great height.',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        format: 'start' as const,
        indent: 0,
        type: 'heading',
        version: 1,
        tag: 'h3',
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Apparently we had reached a great height in the atmosphere, for the sky was a dead black, and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea to the level of the spectato. Read more...',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        format: 'left' as const,
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: 0,
        textStyle: '',
      },
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'Apparently we had reached a great height in the atmosphere, for the sky was a dead black, and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the sea to the level of the spectato.',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        format: 'left' as const,
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: 0,
        textStyle: '',
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    type: 'root',
    version: 1,
  },
};
