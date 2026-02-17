import AccordionClientContainer from '@/features/payload-cms/components/accordion/accordion-client-container';
import type { AccordionContentProperties } from '@/features/payload-cms/components/accordion/accordion-content';
import AccordionContent from '@/features/payload-cms/components/accordion/accordion-content';
import type { AccordionBlocks } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import type React from 'react';

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

  return (
    <div>
      <AccordionClientContainer
        accordionBlocks={accordionBlocks}
        childs={children}
        isNested={isNested ?? false}
      />
    </div>
  );
};
