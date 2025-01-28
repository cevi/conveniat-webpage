import { BeforeSync, DocToSync } from '@payloadcms/plugin-search/types';

interface Seo {
  slugURL?: string;
}

interface Content {
  blogH1?: string;
  blogShortTitle?: string;
  blogSearchKeywords?: string;
}

export const beforeSyncWithSearch: BeforeSync = async ({ originalDoc, searchDoc }) => {
  const { seo, content, slugUrl, blogH1, blogShortTitle, blogSearchKeywords } = originalDoc as {
    seo?: Seo;
    content?: Content;
    slugUrl?: string;
    blogH1?: string;
    blogShortTitle?: string;
    blogSearchKeywords?: string;
  };

  const modifiedDocument: DocToSync = {
    ...searchDoc,
    seo: {
      ...seo,
      slugUrl: seo?.slugURL ?? slugUrl,
    },
    content: {
      ...content,
      blogH1: content?.blogH1 ?? blogH1,
      blogShortTitle: content?.blogShortTitle ?? blogShortTitle,
      blogSearchKeywords: content?.blogSearchKeywords ?? blogSearchKeywords,
    },
  };

  return modifiedDocument;
};
