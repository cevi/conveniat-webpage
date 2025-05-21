import type { AccordionBlocks } from '@/features/payload-cms/payload-types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';

interface AccordionItemProperties {
  accordionBlock: Exclude<Exclude<AccordionBlocks['accordionBlocks'], undefined>, null>[0];
  isExpanded: boolean;
  children: React.ReactNode;
  onToggle: () => void;
}

const AccordionItem: React.FC<AccordionItemProperties> = ({
  accordionBlock,
  children,
  isExpanded,
  onToggle,
}) => {
  const blockId = accordionBlock.id;
  if (blockId === undefined || blockId === null) {
    return <></>;
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-xs border-2 border-gray-200 overflow-hidden',
        'transition-transform duration-300',
        {
          'hover:scale-[1.01]': !isExpanded,
          'scale-100': isExpanded,
        },
      )}
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex justify-between items-center text-left focus:outline-hidden cursor-pointer"
        aria-expanded={isExpanded}
        aria-controls={`content-${blockId}`}
      >
        <h3 className="text-lg font-medium text-gray-900">{accordionBlock.title}</h3>
        <div className="text-gray-500">
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      <div
        id={`content-${blockId}`}
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="px-6 pb-6 border-t border-gray-100 pt-4">{children}</div>
      </div>
    </div>
  );
};

export default AccordionItem;
