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
  isNested?: boolean;
  /** a card of its own, or a row in a card shared with the rows of its category */
  variant?: 'card' | 'row';
}

const AccordionItem: React.FC<AccordionItemProperties> = ({
  titleElement,
  accordionId,
  children,
  isExpanded,
  onToggle,
  showChevron,
  isNested,
  variant = 'card',
}) => {
  const blockId = accordionId;

  return (
    <div
      className={cn(
        variant === 'row'
          ? 'bg-white'
          : [
              // keyboard focus marks the header, the visible part, with the surface and ring of
              // every card in the app; the card's own border gives way so it is not drawn twice
              'has-[>button:focus-visible]:border-quiet rounded-[14px] border-2 border-gray-200 shadow-xs',
              'transition-transform duration-300',
              isNested === true ? 'bg-gray-50' : 'bg-white',
              {
                'hover:scale-[1.01]': !isExpanded,
                'scale-100': isExpanded,
              },
            ],
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'focus-visible:focus-surface flex w-full cursor-pointer items-center justify-between gap-3 text-left',
          variant === 'row' ? 'min-h-11 px-4 py-3.5' : 'rounded-xl px-6 py-4',
        )}
        aria-expanded={isExpanded}
        aria-controls={`content-${blockId}`}
      >
        {titleElement}
        {showChevron && (
          <div className="shrink-0 text-gray-500">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        )}
      </button>

      <div
        id={`content-${blockId}`}
        className={cn(
          'overflow-hidden transition-transform duration-300 ease-in-out',
          isExpanded ? 'opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div
          className={cn('border-t border-gray-100 pt-4 pb-6', variant === 'row' ? 'px-4' : 'px-6')}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default AccordionItem;
