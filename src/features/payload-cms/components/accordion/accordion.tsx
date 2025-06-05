import AccordionClientContainer from '@/features/payload-cms/components/accordion/accordion-client-container';
import type { AccordionContentProperties } from '@/features/payload-cms/components/accordion/accordion-content';
import AccordionContent from '@/features/payload-cms/components/accordion/accordion-content';
import type { AccordionBlocks } from '@/features/payload-cms/payload-types';
import type React from 'react';

export const Accordion: React.FC<{
  block: AccordionBlocks;
}> = ({ block }) => {
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
        />
      );
      return accumulator;
    }, {}),
  };

  return (
    <div>
      <AccordionClientContainer accordionBlocks={accordionBlocks} childs={children} />
    </div>
  );
};
