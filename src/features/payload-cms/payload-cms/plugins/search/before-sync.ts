import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import { enabledLocales, LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { getSyncLocale } from '@/features/payload-cms/payload-cms/plugins/search/skip-sync';
import { pdfPagesSourceOf } from '@/features/payload-cms/payload-cms/tasks/extract-pdf-pages';
import { collectReferences } from '@/features/payload-cms/payload-cms/utils/document-references';
import { extractTextContent } from '@/features/payload-cms/payload-cms/utils/extract-rich-text';
import type { Document, GenericPage, Timeline } from '@/features/payload-cms/payload-types';
import type { BeforeSync, DocToSync } from '@payloadcms/plugin-search/types';
import type { PayloadRequest } from 'payload';

/** Rich text reports every string it holds as a possible reference; only ids are kept. */
const OBJECT_ID = /^[\da-f]{24}$/;

/** Collections a page can link to that the search finds only through the pages showing them. */
const LINKED_COLLECTIONS = ['documents', 'timelineCategory'] as const;

/**
 * The documents and news categories the published page links to in the locale being synced. They
 * are read again without population: in a populated document the ids sit under `id` keys, which
 * the reference walk skips.
 */
const findPageReferences = async (request: PayloadRequest, pageId: string): Promise<string[]> => {
  const locale = getSyncLocale(request);
  const page = await request.payload.findByID({
    collection: 'generic-page',
    id: pageId,
    depth: 0,
    locale: 'all',
    draft: false,
    req: request,
  });
  const { flattenedFields } = request.payload.collections['generic-page'].config;

  const ids = new Set<string>();
  for (const collection of LINKED_COLLECTIONS) {
    for (const reference of collectReferences(flattenedFields, page, collection, enabledLocales)) {
      if (reference.locale !== undefined && reference.locale !== locale) continue;
      for (const id of reference.ids) if (OBJECT_ID.test(id)) ids.add(id);
    }
  }
  return [...ids];
};

const syncPage = async (
  page: GenericPage,
  searchDocument: DocToSync,
  request: PayloadRequest,
): Promise<DocToSync> => {
  const title = page.content.pageTitle;
  return {
    ...searchDocument,
    title,
    search_title: title,
    search_content: extractTextContent(page.content.mainContent as ContentBlock[]),
    search_date: page.content.releaseDate,
    search_references: await findPageReferences(request, page.id),
  };
};

const syncNewsEntry = (entry: Timeline, searchDocument: DocToSync): DocToSync => ({
  ...searchDocument,
  title: entry.title,
  search_title: entry.title,
  search_content: Array.isArray(entry.mainContent)
    ? extractTextContent(entry.mainContent as unknown as ContentBlock[])
    : '',
  search_date: entry.date,
  search_categories: (entry.categories ?? []).map((category) =>
    typeof category === 'string' ? category : category.id,
  ),
});

/**
 * Whether a run for the document is still queued or running. An upload syncs the index several
 * times before the first run lands, through the storage plugin's own update among others.
 */
const hasPendingExtraction = async (
  request: PayloadRequest,
  documentId: string,
): Promise<boolean> => {
  const { totalDocs } = await request.payload.count({
    collection: 'payload-jobs',
    req: request,
    where: {
      and: [
        { taskSlug: { equals: 'extractPdfPages' } },
        { 'input.documentId': { equals: documentId } },
        { completedAt: { exists: false } },
        { hasError: { not_equals: true } },
      ],
    },
  });
  return totalDocs > 0;
};

/**
 * Indexes the display name, the file name and the text of every page. The text comes from the
 * extractPdfPages task, which this queues for a PDF it has not read yet; the task writes the pages
 * to the document, and that change syncs the index again. It is queued from the German sync only,
 * the one locale every deployment has, so a reindex of three locales queues it once.
 */
const syncDocument = async (
  document: Document,
  searchDocument: DocToSync,
  request: PayloadRequest,
): Promise<DocToSync> => {
  const isUnreadPdf =
    document.mimeType === 'application/pdf' &&
    document.pdfPagesSource !== pdfPagesSourceOf(document);
  if (
    isUnreadPdf &&
    getSyncLocale(request) === LOCALE.DE &&
    !(await hasPendingExtraction(request, document.id))
  ) {
    await request.payload.jobs.queue({
      task: 'extractPdfPages',
      input: { documentId: document.id },
    });
  }

  const title = document.title ?? document.filename ?? '';
  const pageTexts = (document.pdfPages ?? []).map((page) => page.text ?? '');
  return {
    ...searchDocument,
    title,
    search_title: title,
    search_content: [document.filename ?? '', ...pageTexts].join(' '),
    search_date: document.updatedAt,
  };
};

export const beforeSyncWithSearch: BeforeSync = async ({
  collectionSlug,
  originalDoc,
  req,
  searchDoc,
}) => {
  switch (collectionSlug) {
    case 'documents': {
      return await syncDocument(originalDoc as Document, searchDoc, req);
    }
    case 'timeline': {
      return syncNewsEntry(originalDoc as Timeline, searchDoc);
    }
    default: {
      return await syncPage(originalDoc as GenericPage, searchDoc, req);
    }
  }
};
