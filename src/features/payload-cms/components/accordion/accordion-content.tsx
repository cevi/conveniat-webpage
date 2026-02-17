import { Accordion } from '@/features/payload-cms/components/accordion/accordion';
import {
  FileDownload,
  type FileDownloadType,
} from '@/features/payload-cms/components/content-blocks/file-download';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { ShowForm } from '@/features/payload-cms/components/content-blocks/show-form';
import type { FormBlockType } from '@/features/payload-cms/components/form';
import type {
  AccordionBlocks,
  PlainTextBlock,
  TeamMembersBlock,
} from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import type React from 'react';
import { Fragment } from 'react';
import { TeamMembers } from 'src/features/payload-cms/components/accordion/team-members';

export interface AccordionContentProperties {
  valueBlocks: Array<
    TeamMembersBlock | PlainTextBlock | FormBlockType | AccordionBlocks | FileDownloadType
  >;
  locale: Locale;
}

const AccordionContent: React.FC<AccordionContentProperties> = ({ valueBlocks, locale }) => {
  return (
    <>
      {valueBlocks.map(
        (
          _block:
            | TeamMembersBlock
            | PlainTextBlock
            | FormBlockType
            | AccordionBlocks
            | FileDownloadType,
          index: number,
        ): React.ReactElement => {
          if (
            (_block as { blockType: string }).blockType === 'accordion' ||
            (_block as { blockType: string }).blockType === 'nestedAccordion'
          ) {
            return (
              <Fragment key={index}>
                <div className="mb-4">
                  <Accordion
                    block={_block as unknown as AccordionBlocks}
                    locale={locale}
                    isNested
                  />
                </div>
                {index !== valueBlocks.length - 1 && <hr className="my-6 border border-gray-100" />}
              </Fragment>
            );
          }

          if ((_block as { blockType: string }).blockType === 'fileDownload') {
            return (
              <Fragment key={index}>
                <FileDownload {...(_block as FileDownloadType)} locale={locale} />
                {index !== valueBlocks.length - 1 && <hr className="my-6 border border-gray-100" />}
              </Fragment>
            );
          }

          if ((_block as { blockType: string }).blockType === 'accordionPlainTextBlock') {
            return (
              <Fragment key={index}>
                <div className="mb-4 hyphens-auto sm:hyphens-none">
                  <LexicalRichTextSection
                    richTextSection={(_block as PlainTextBlock).value}
                    locale={locale}
                  />
                </div>
                {index !== valueBlocks.length - 1 && <hr className="my-6 border border-gray-100" />}
              </Fragment>
            );
          }

          if ((_block as { blockType: string }).blockType === 'formBlock') {
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
              <TeamMembers block={_block as TeamMembersBlock} locale={locale} />
              {index !== valueBlocks.length - 1 && <hr className="my-6 border border-gray-100" />}
            </Fragment>
          );
        },
      )}
    </>
  );
};

export default AccordionContent;
