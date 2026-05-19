import { SubheadingH2 } from '@/components/ui/typography/subheading-h2';
import AccordionContent, {
  type AccordionContentProperties,
} from '@/features/payload-cms/components/accordion/accordion-content';
import type { AccordionTimelineElementBlock } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import type React from 'react';

export const AccordionTimelineElement: React.FC<{
  block: AccordionTimelineElementBlock;
  locale: Locale;
}> = ({ block, locale }) => {
  const contentBlocks = (block.contentBlocks ??
    []) as unknown as AccordionContentProperties['valueBlocks'];

  return (
    <div>
      <div className="mt-[-6px] mb-[-14px] flex items-center">
        <div className="mx-[6px] mr-2 h-2 w-2 rounded-full bg-gray-500"></div>
        <span className="font-body my-2 ml-[6px] max-w-2xl text-left text-xs font-bold text-gray-500">
          {block.dateText}
        </span>
      </div>
      <div className="m-2 mb-0 border-l-4 border-l-green-100 py-1 pr-1 pl-4">
        <SubheadingH2 className="text-md m-0 mb-1">{block.title}</SubheadingH2>

        {contentBlocks.length > 0 && (
          <AccordionContent valueBlocks={contentBlocks} locale={locale} isTimelineElementContent />
        )}
      </div>
    </div>
  );
};
