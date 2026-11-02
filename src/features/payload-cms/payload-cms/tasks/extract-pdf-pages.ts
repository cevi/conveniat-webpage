import {
  absoluteDocumentUrl,
  downloadPdf,
} from '@/features/payload-cms/payload-cms/tasks/generate-pdf-thumbnail';
import type { Document } from '@/features/payload-cms/payload-types';
import { splitPdfText } from '@/features/payload-cms/search/pdf-text';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Payload, TaskConfig } from 'payload';

const execFileAsync = promisify(execFile);

/** The search preview shows a strip of pages; a longer document is still searched in full. */
const MAX_PAGE_THUMBNAILS = 12;
const THUMBNAIL_WIDTH = 360;

/** Which file the pages were read from: a replaced file gets a new name or size. */
export const pdfPagesSourceOf = (document: Pick<Document, 'filename' | 'filesize'>): string =>
  `${document.filename ?? ''}:${document.filesize ?? ''}`;

const readPageTexts = async (pdfPath: string): Promise<string[]> => {
  // without an output file pdftotext writes to stdout, one form feed after every page; UTF-8 is
  // poppler's name for the encoding, not Node's
  // eslint-disable-next-line unicorn/text-encoding-identifier-case
  const { stdout } = await execFileAsync('pdftotext', ['-enc', 'UTF-8', pdfPath, '-'], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return splitPdfText(stdout);
};

/** Renders the first pages to PNG files and returns them by page number. */
const renderPageThumbnails = async (
  pdfPath: string,
  directory: string,
  pageCount: number,
): Promise<Map<number, string>> => {
  const lastPage = Math.min(pageCount, MAX_PAGE_THUMBNAILS);
  if (lastPage === 0) return new Map();
  const prefix = path.join(directory, 'page');
  await execFileAsync('pdftocairo', [
    '-png',
    '-scale-to',
    String(THUMBNAIL_WIDTH),
    '-f',
    '1',
    '-l',
    String(lastPage),
    pdfPath,
    prefix,
  ]);
  // pdftocairo pads the page number to the digits of the page count: page-01.png, page-001.png
  const files = await fs.readdir(directory);
  const thumbnails = new Map<number, string>();
  for (const file of files) {
    const match = /^page-(\d+)\.png$/.exec(file);
    if (match?.[1] !== undefined) thumbnails.set(Number(match[1]), path.join(directory, file));
  }
  return thumbnails;
};

const uploadThumbnail = async (
  payload: Payload,
  documentId: string,
  page: number,
  filePath: string,
): Promise<{ id: string; url: string }> => {
  const data = await fs.readFile(filePath);
  const image = await payload.create({
    collection: 'images',
    data: {
      alt_de: `PDF Seite ${page}`,
      alt_en: `PDF page ${page}`,
      alt_fr: `PDF page ${page}`,
      isPdfThumbnail: true,
    },
    file: {
      data,
      name: `${documentId}-page-${page}-${Math.random().toString(36).slice(2, 8)}.png`,
      mimetype: 'image/png',
      size: data.length,
    },
  });
  return { id: String(image.id), url: image.url ?? '' };
};

/**
 * Reads the text of every page of a PDF and renders thumbnails of its first pages, so the site
 * search can say on which page a word stands and show it. The search index queues it for the
 * public PDFs it indexes; the result lands on the document, which syncs the index again.
 */
export const extractPdfPagesTask: TaskConfig<{
  input: { documentId: string };
  output: { pageCount: number };
}> = {
  slug: 'extractPdfPages',
  retries: 3,
  inputSchema: [{ name: 'documentId', type: 'text', required: true }],
  outputSchema: [{ name: 'pageCount', type: 'number' }],
  handler: async ({ input, req }) => {
    const { payload } = req;
    const { documentId } = input;

    const document = await payload.findByID({
      collection: 'documents',
      id: documentId,
      depth: 0,
      req,
    });
    const source = pdfPagesSourceOf(document);
    if (
      document.mimeType !== 'application/pdf' ||
      typeof document.url !== 'string' ||
      document.pdfPagesSource === source
    ) {
      return { output: { pageCount: document.pdfPages?.length ?? 0 } };
    }

    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-pages-'));
    try {
      const pdfPath = path.join(directory, 'document.pdf');
      await downloadPdf(absoluteDocumentUrl(document.url), pdfPath);

      const texts = await readPageTexts(pdfPath);
      const thumbnailFiles = await renderPageThumbnails(pdfPath, directory, texts.length);

      const pdfPages: NonNullable<Document['pdfPages']> = [];
      for (const [index, text] of texts.entries()) {
        const file = thumbnailFiles.get(index + 1);
        const thumbnail =
          file === undefined
            ? undefined
            : await uploadThumbnail(payload, documentId, index + 1, file);
        pdfPages.push(
          thumbnail === undefined
            ? { text }
            : { text, thumbnailUrl: thumbnail.url, thumbnailId: thumbnail.id },
        );
      }

      const previousThumbnailIds = (document.pdfPages ?? [])
        .map((page) => page.thumbnailId)
        .filter((id): id is string => typeof id === 'string' && id !== '');

      await payload.update({
        collection: 'documents',
        id: documentId,
        req,
        context: { skipPdfThumbnail: true },
        data: { pdfPages, pdfPagesSource: source },
      });

      if (previousThumbnailIds.length > 0) {
        await payload.delete({
          collection: 'images',
          where: { id: { in: previousThumbnailIds } },
          req,
        });
      }

      payload.logger.info({ documentId, pageCount: texts.length, msg: 'Extracted PDF pages' });
      return { output: { pageCount: texts.length } };
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  },
};
