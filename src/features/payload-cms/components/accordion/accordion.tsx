import AccordionClientContainer from '@/features/payload-cms/components/accordion/accordion-client-container';
import type { AccordionContentProperties } from '@/features/payload-cms/components/accordion/accordion-content';
import AccordionContent from '@/features/payload-cms/components/accordion/accordion-content';
import type { AccordionBlocks } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext';
import type React from 'react';

/**
 * The name of the entry's category. The page is read at depth 1, which populates it; an id
 * alone means the category could not be read, e.g. because it was deleted, and a draft may
 * carry an empty name, so both count as no category.
 */
const categoryName = (
  accordionBlock: NonNullable<AccordionBlocks['accordionBlocks']>[number],
): string | undefined => {
  const category = accordionBlock.category;
  if (typeof category !== 'object' || category === null) return undefined;
  // a locale without a translation of the name has none
  const name = (category.name as string | undefined)?.trim() ?? '';
  return name === '' ? undefined : name;
};

/**
 * Builds a plain-text search index string for a single accordion block item,
 * combining its title/name, optional search keywords, and the plain text
 * extracted from all PlainTextBlock value blocks.
 */
const buildSearchIndex = (
  accordionBlock: NonNullable<AccordionBlocks['accordionBlocks']>[number],
): string => {
  const parts: string[] = [categoryName(accordionBlock) ?? ''];

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

  const categoryNames: Record<string, string> = {};
  for (const accordionBlock of accordionBlocks) {
    const name = categoryName(accordionBlock);
    if (accordionBlock.id !== undefined && accordionBlock.id !== null && name !== undefined) {
      categoryNames[accordionBlock.id] = name;
    }
  }

  return (
    <div>
      <AccordionClientContainer
        accordionBlocks={accordionBlocks}
        childs={children}
        isNested={isNested ?? false}
        enableSearch={block.enableSearch === true && isNested !== true}
        searchIndex={searchIndex}
        categoryNames={categoryNames}
        locale={locale}
      />
    </div>
  );
};
