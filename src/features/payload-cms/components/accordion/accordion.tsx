import AccordionClientContainer from '@/features/payload-cms/components/accordion/accordion-client-container';
import type { AccordionContentProperties } from '@/features/payload-cms/components/accordion/accordion-content';
import AccordionContent from '@/features/payload-cms/components/accordion/accordion-content';
import type { AccordionBlocks } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';
import type React from 'react';

/**
 * Builds a plain-text search index string for a single accordion block item,
 * combining its title/name, optional search keywords, and the plain text
 * extracted from all PlainTextBlock value blocks.
 */
const buildSearchIndex = (
  accordionBlock: NonNullable<AccordionBlocks['accordionBlocks']>[number],
): string => {
  const parts: string[] = [];

  // Index the visible title or team leader name
  if (accordionBlock.titleOrPortrait === 'portrait') {
    parts.push(
      accordionBlock.teamLeaderGroup?.name ?? '',
      accordionBlock.teamLeaderGroup?.ceviname ?? '',
    );
  } else {
    parts.push(accordionBlock.title ?? '');
  }

  // Index author-provided keywords
  if ('searchKeywords' in accordionBlock && accordionBlock.searchKeywords) {
    parts.push(accordionBlock.searchKeywords);
  }

  // Index plain text from richtext content blocks
  for (const valueBlock of accordionBlock.valueBlocks) {
    if (valueBlock.blockType === 'accordionPlainTextBlock') {
      parts.push(convertLexicalToPlaintext({ data: valueBlock.value }));
    }
  }

  return parts.join(' ');
};

export const Accordion: React.FC<{
  block: AccordionBlocks;
  locale: Locale;
  isNested?: boolean;
}> = ({ locale, block, isNested }) => {
  if (block.accordionBlocks === undefined || block.accordionBlocks === null) {
    return <></>;
  }

  const accordionBlocks = block.accordionBlocks;

  const children: { [key: string]: React.ReactNode } = {
    ...accordionBlocks.reduce((accumulator: { [key: string]: React.ReactNode }, accordionBlock) => {
      const blockId: string | null | undefined = accordionBlock.id;
      if (blockId === undefined || blockId === null) {
        return accumulator;
      }

      accumulator[blockId] = (
        <AccordionContent
          key={blockId}
          valueBlocks={
            accordionBlock.valueBlocks as unknown as AccordionContentProperties['valueBlocks']
          }
          locale={locale}
        />
      );
      return accumulator;
    }, {}),
  };

  // Build a search index (blockId -> lowercased plain text) for client-side filtering
  const searchIndex: Record<string, string> = accordionBlocks.reduce(
    (accumulator: Record<string, string>, accordionBlock) => {
      const blockId = accordionBlock.id;
      if (blockId !== undefined && blockId !== null) {
        accumulator[blockId] = buildSearchIndex(accordionBlock).toLowerCase();
      }
      return accumulator;
    },
    {},
  );

  return (
    <div>
      <AccordionClientContainer
        accordionBlocks={accordionBlocks}
        childs={children}
        isNested={isNested ?? false}
        enableSearch={block.enableSearch === true && isNested !== true}
        searchIndex={searchIndex}
        locale={locale}
      />
    </div>
  );
};
