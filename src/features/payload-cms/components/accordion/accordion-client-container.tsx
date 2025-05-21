'use client';

import AccordionItem from '@/features/payload-cms/components/accordion/accordion-item';
import type { AccordionBlocks } from '@/features/payload-cms/payload-types';
import React, { useState } from 'react';

// This component manages the expanded state for all items
const AccordionClientContainer: React.FC<{
  accordionBlocks: AccordionBlocks['accordionBlocks'];
  childs: {
    [key: string]: React.ReactNode;
  };
}> = ({ accordionBlocks, childs }) => {
  const [expandedId, setExpandedId] = useState<string | undefined>();

  const toggleExpand = (id: string): void => {
    setExpandedId(expandedId === id ? undefined : id);
  };

  if (accordionBlocks === undefined || accordionBlocks === null) {
    return <></>;
  }

  return (
    <div className="space-y-4">
      {accordionBlocks.map((accordionBlock) => {
        const blockId = accordionBlock.id;
        if (blockId === undefined || blockId === null) {
          return <></>;
        }

        return (
          <AccordionItem
            key={blockId}
            accordionBlock={accordionBlock}
            isExpanded={expandedId === blockId}
            onToggle={() => toggleExpand(blockId)}
          >
            {childs[blockId]}
          </AccordionItem>
        );
      })}
    </div>
  );
};

export default AccordionClientContainer;
