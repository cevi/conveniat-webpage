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
import type { TaskConfig } from 'payload';

const execFileAsync = promisify(execFile);

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

/**
 * Reads the text of every page of a PDF, so the site search can say on which page a word stands.
 * The search index queues it for the public PDFs it indexes; the result lands on the document,
 * which syncs the index again.
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
      await payload.update({
        collection: 'documents',
        id: documentId,
        req,
        context: { skipPdfThumbnail: true },
        data: { pdfPages: texts.map((text) => ({ text })), pdfPagesSource: source },
      });

      payload.logger.info({ documentId, pageCount: texts.length, msg: 'Extracted PDF pages' });
      return { output: { pageCount: texts.length } };
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  },
};
