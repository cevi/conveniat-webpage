import { cn } from '@/utils/tailwindcss-override';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type React from 'react';

interface AccordionItemProperties {
  titleElement: React.ReactNode;
  accordionId: string;
  isExpanded: boolean;
  children: React.ReactNode;
  onToggle: () => void;
  showChevron: boolean;
}

const AccordionItem: React.FC<AccordionItemProperties> = ({
  titleElement,
  accordionId,
  children,
  isExpanded,
  onToggle,
  showChevron,
}) => {
  const blockId = accordionId;

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-gray-200 bg-white shadow-xs',
        'transition-transform duration-300',
        {
          'hover:scale-[1.01]': !isExpanded,
          'scale-100': isExpanded,
        },
      )}
    >
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between px-6 py-4 text-left focus:outline-hidden"
        aria-expanded={isExpanded}
        aria-controls={`content-${blockId}`}
      >
        {titleElement}
        {showChevron && (
          <div className="text-gray-500">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        )}
      </button>

      <div
        id={`content-${blockId}`}
        className={cn(
          'transition-transform duration-300 ease-in-out',
          isExpanded ? 'opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="border-t border-gray-100 px-6 pt-4 pb-6">{children}</div>
      </div>
    </div>
  );
};

export default AccordionItem;
