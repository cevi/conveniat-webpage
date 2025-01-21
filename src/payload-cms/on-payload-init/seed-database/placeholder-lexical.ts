type LexicalPlaceholder = {
  [k: string]: unknown;
  root: {
    type: string;
    children: { [k: string]: unknown; type: string; version: number }[];
    direction: 'ltr' | 'rtl' | null;
    format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify';
    indent: number;
    version: number;
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
            text: 'conveniat27 - WIR SIND CEVI',
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
            text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
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
            text: 'Mollis est ad senectus praesent sagittis dui eget vulputate tincidunt. Hendrerit bibendum ultrices; viverra feugiat praesent ornare. Nam fermentum conubia sapien cubilia; pharetra porta commodo facilisis. Nostra libero vehicula varius augue pellentesque montes aliquam cursus. Ad congue dignissim at vel ipsum. Mauris sed fames rhoncus; scelerisque quis malesuada facilisis turpis. Fermentum non natoque curabitur aptent iaculis ut. Erat lacinia metus sed imperdiet quis massa dui. Tincidunt enim odio velit accumsan dignissim senectus. Dui interdum montes leo, luctus vitae nec dolor nascetur.',
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
            text: 'Consectetur est volutpat in aliquam commodo eros erat tempor. Nisl tristique cursus phasellus dictum massa purus sodales bibendum vivamus. Vel feugiat mi maecenas mollis elementum aptent posuere nascetur massa. Malesuada iaculis enim imperdiet molestie dictumst dictumst platea nam. Sit rutrum aptent vestibulum, primis purus pulvinar. Nibh nunc dictumst potenti eros nec mi penatibus. Anostra scelerisque, proin justo primis purus.',
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
