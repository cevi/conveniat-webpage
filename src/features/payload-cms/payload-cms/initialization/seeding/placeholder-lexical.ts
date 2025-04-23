import { fakerDE as faker } from '@faker-js/faker';

interface LexicalPlaceholderChild {
  [k: string]: unknown;
  type: string;
  version: number;
}

interface LexicalPlaceholder {
  [k: string]: unknown;
  root: {
    type: string;
    children: LexicalPlaceholderChild[];
    direction: 'ltr' | 'rtl' | null;
    format: '' | 'left' | 'start' | 'center' | 'right' | 'end' | 'justify';
    indent: number;
    version: number;
  };
}

/**
 * Generate a child for a rich text section.
 * @param paragraphType
 */
const generateChild = (paragraphType: string): LexicalPlaceholderChild => {
  switch (paragraphType) {
    case 'subheading':
    case 'heading': {
      return {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: faker.lorem.sentence({
              min: paragraphType === 'heading' ? 4 : 2,
              max: paragraphType === 'heading' ? 8 : 5,
            }),
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: 'start',
        indent: 0,
        type: 'heading',
        version: 1,
        tag: paragraphType === 'heading' ? 'h2' : 'h3',
      };
    }
    case 'paragraph': {
      return {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: faker.lorem.paragraph({ min: 4, max: 20 }),
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: 'left',
        indent: 0,
        type: 'paragraph',
        version: 1,
        textFormat: 0,
        textStyle: '',
      };
    }
    default: {
      throw new Error(`Unknown paragraph type: ${paragraphType}`);
    }
  }
};

/**
 * Generate a rich text section with a random number of paragraphs, headings (h2),
 * and subheadings (h3).
 *
 */
export const generateRichTextSection: () => LexicalPlaceholder = () => {
  const length = faker.number.int({ min: 4, max: 10 });
  const paragraphs = [];

  const paragraphTypes = ['heading', 'subheading', 'paragraph'];
  let lastParagraphType = '';

  for (let index = 0; index < length; index++) {
    const paragraphType = faker.helpers.arrayElement(paragraphTypes);

    if (
      // avoid two headings in a row
      (lastParagraphType === 'heading' && paragraphType === 'heading') ||
      // avoid two subheadings in a row
      (lastParagraphType === 'subheading' && paragraphType === 'subheading') ||
      // avoid heading after subheading
      (lastParagraphType === 'subheading' && paragraphType === 'heading') ||
      // last element should be a paragraph
      (index === length - 1 && paragraphType !== 'paragraph')
    ) {
      index -= 1;
      continue;
    }

    lastParagraphType = paragraphType;
    paragraphs.push(generateChild(paragraphType));
  }

  return {
    root: {
      children: paragraphs,
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      type: 'root',
      version: 1,
    },
  };
};
