import { TeamMembers } from '@/features/payload-cms/components/accordion/team-members';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { PlainTextBlock, TeamMembersBlock } from '@/features/payload-cms/payload-types';
import React from 'react';

interface AccordionContentProperties {
  valueBlocks: Array<TeamMembersBlock | PlainTextBlock>;
}

const AccordionContent: React.FC<AccordionContentProperties> = ({ valueBlocks }) => {
  return (
    <>
      {valueBlocks.map(
        (_block: TeamMembersBlock | PlainTextBlock, index: number): React.ReactElement => {
          if (_block.blockType === 'accordionPlainTextBlock') {
            return (
              <div key={index} className="mb-4 hyphens-auto sm:hyphens-none ">
                <LexicalRichTextSection richTextSection={_block.value} />
              </div>
            );
          }

          return <TeamMembers block={_block as TeamMembersBlock} key={index} />;
        },
      )}
    </>
  );
};

export default AccordionContent;
