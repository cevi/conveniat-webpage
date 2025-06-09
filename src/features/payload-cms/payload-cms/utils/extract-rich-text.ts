import type { HeroSectionType } from '@/features/payload-cms/components/content-blocks/hero-section';
import type { LexicalRichTextSectionType } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type {
  AccordionBlocks,
  DetailsTable,
  SummaryBox,
} from '@/features/payload-cms/payload-types';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';

const extractAccordionBlock = (accordion: AccordionBlocks): string => {
  let text = '';
  text += convertLexicalToPlaintext({ data: accordion.introduction }) + '\n';
  text +=
    accordion.accordionBlocks
      ?.map((accordionBlock) => {
        return (
          accordionBlock.title +
          ' ' +
          accordionBlock.valueBlocks
            .map((valueBlock) => {
              if (valueBlock.blockType === 'accordionPlainTextBlock') {
                return convertLexicalToPlaintext({ data: valueBlock.value });
              }
              return '';
            })
            .join(' ')
        );
      })
      .join('\n') ?? '';
  return text;
};

export const extractTextContent = (mainContent: ContentBlock[]): string => {
  let searchContent = '';
  for (const block of mainContent) {
    switch (block.blockType) {
      case 'richTextSection': {
        const richTextBlock = block as ContentBlock<LexicalRichTextSectionType>;
        searchContent += convertLexicalToPlaintext({ data: richTextBlock.richTextSection });

        break;
      }
      case 'accordion': {
        const accordion = block as ContentBlock<AccordionBlocks>;
        searchContent += extractAccordionBlock(accordion);
        break;
      }
      case 'heroSection': {
        const heroSection = block as ContentBlock<HeroSectionType>;
        searchContent += heroSection.pageTeaser;

        break;
      }
      case 'summaryBox': {
        const summaryBox = block as ContentBlock<SummaryBox>;
        searchContent += convertLexicalToPlaintext({ data: summaryBox.richTextSection });

        break;
      }
      case 'detailsTable': {
        const detailsTable = block as ContentBlock<DetailsTable>;
        searchContent += convertLexicalToPlaintext({ data: detailsTable.introduction });
        searchContent +=
          detailsTable.detailsTableBlocks
            ?.map((detailsTableBlock) => {
              return (
                detailsTableBlock.label +
                ' ' +
                convertLexicalToPlaintext({ data: detailsTableBlock.value })
              );
            })
            .join('\n') ?? '';

        break;
      }
      // No default
    }
  }
  return searchContent;
};
