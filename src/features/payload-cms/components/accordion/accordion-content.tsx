import { TeamMembers } from '@/features/payload-cms/components/accordion/team-members';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { ShowForm } from '@/features/payload-cms/components/content-blocks/show-form';
import type { FormBlockType } from '@/features/payload-cms/components/form';
import type { PlainTextBlock, TeamMembersBlock } from '@/features/payload-cms/payload-types';
import type React from 'react';
import { Fragment } from 'react';

interface AccordionContentProperties {
  valueBlocks: Array<TeamMembersBlock | PlainTextBlock | FormBlockType>;
}

const AccordionContent: React.FC<AccordionContentProperties> = ({ valueBlocks }) => {
  return (
    <>
      {valueBlocks.map(
        (
          _block: TeamMembersBlock | PlainTextBlock | FormBlockType,
          index: number,
        ): React.ReactElement => {
          if (_block.blockType === 'accordionPlainTextBlock') {
            return (
              <Fragment key={index}>
                <div className="mb-4 hyphens-auto sm:hyphens-none">
                  <LexicalRichTextSection richTextSection={_block.value} />
                </div>
                {index !== valueBlocks.length - 1 && <hr className="my-6 border border-gray-100" />}
              </Fragment>
            );
          }

          if (_block.blockType === 'formBlock') {
            return (
              <Fragment key={index}>
                <div className="mb-4 hyphens-auto sm:hyphens-none">
                  <ShowForm {...(_block as unknown as FormBlockType)} withBorder={false} />
                </div>
                {index !== valueBlocks.length - 1 && <hr className="my-6 border border-gray-100" />}
              </Fragment>
            );
          }

          return (
            <Fragment key={index}>
              <TeamMembers block={_block as TeamMembersBlock} />
              {index !== valueBlocks.length - 1 && <hr className="my-6 border border-gray-100" />}
            </Fragment>
          );
        },
      )}
    </>
  );
};

export default AccordionContent;
