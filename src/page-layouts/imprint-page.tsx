import { LocalizedPage } from '@/page-layouts/localized-page';
import React from 'react';
import { getPayload } from 'payload';
import config from '@payload-config';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { LexicalPageContent } from '@/components/content-blocks/lexical-page-content';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';

export const ImprintPage: React.FC<LocalizedPage> = async (properties) => {
  const { locale } = properties;
  const payload = await getPayload({ config });
  const { content } = await payload.findGlobal({
    slug: 'imprint',
    locale,
  });

  return (
    <article className="mx-auto my-8 max-w-2xl px-8">
      <HeadlineH1>{content.pageTitle}</HeadlineH1>
      <LexicalPageContent pageContent={content.mainContent as SerializedEditorState} />
    </article>
  );
};
