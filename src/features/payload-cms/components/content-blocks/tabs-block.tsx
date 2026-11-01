import { TabsClientContainer } from '@/features/payload-cms/components/content-blocks/tabs-client-container';
import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type { LocalizedPageType } from '@/types/types';
import React from 'react';

export interface TabsBlockPayloadType {
  tabs?: {
    title: string;
    content?: ContentBlock[];
  }[];
}

export const TabsBlock: React.FC<
  TabsBlockPayloadType & LocalizedPageType & { renderInPreviewMode?: boolean }
> = (props) => {
  const { tabs, renderInPreviewMode } = props;

  if (!tabs || tabs.length === 0) return <></>;

  const mappedTabs = tabs.map((tab) => ({
    title: tab.title,
    contentNode: tab.content ? (
      <PageSectionsConverter
        {...props}
        blocks={tab.content}
        // The tabs block already sits in a padded section; the blocks inside take its width.
        sectionClassName="w-full"
        {...(renderInPreviewMode === undefined ? {} : { renderInPreviewMode })}
      />
    ) : undefined,
  }));

  return <TabsClientContainer tabs={mappedTabs} />;
};
