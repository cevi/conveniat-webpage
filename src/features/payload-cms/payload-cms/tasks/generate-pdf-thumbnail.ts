import { environmentVariables } from '@/config/environment-variables';
import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Payload, PayloadRequest, TaskConfig } from 'payload';

const execAsync = promisify(exec);

const downloadPdf = async (documentUrl: string, destinationPath: string): Promise<void> => {
  const response = await fetch(documentUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(destinationPath, Buffer.from(arrayBuffer));
};

const extractFirstPage = async (
  pdfPath: string,
  outPrefix: string,
): Promise<{ buffer: Buffer; size: number }> => {
  // Extract first page using pdftocairo
  // -singlefile ensures it outputs directly to the given path + .png
  await execAsync(`pdftocairo -png -singlefile -scale-to 400 "${pdfPath}" "${outPrefix}"`);

  const outPngPath = `${outPrefix}.png`;
  const buffer = await fs.readFile(outPngPath);
  const stat = await fs.stat(outPngPath);

  return { buffer, size: stat.size };
};

const uploadThumbnailToPayload = async (
  payload: Payload,
  documentId: string | number,
  imageBuffer: Buffer,
  size: number,
): Promise<{ id: string | number; url?: string; sizes?: { tiny?: { url?: string } } }> => {
  return payload.create({
    collection: 'images',
    data: {
      alt_de: 'PDF Thumbnail',
      alt_en: 'PDF Thumbnail',
      alt_fr: 'Miniature PDF',
    },
    file: {
      data: imageBuffer,
      name: `${documentId}-thumb-${Math.random().toString(36).slice(2, 8)}.png`,
      mimetype: 'image/png',
      size,
    },
  }) as unknown as Promise<{
    id: string | number;
    url?: string;
    sizes?: { tiny?: { url?: string } };
  }>;
};

const updateDocumentThumbnailUrl = async (
  payload: Payload,
  request: PayloadRequest,
  documentId: string,
  imageUrl: string,
): Promise<void> => {
  await payload.update({
    collection: 'documents',
    id: documentId,
    req: request,
    context: {
      skipPdfThumbnail: true,
    },
    data: {
      pdfThumbnailUrl: imageUrl,
    },
  });
};

export const generatePdfThumbnailTask: TaskConfig<{
  input: { documentId: string };
  output: { success: boolean; imageId?: string | number };
}> = {
  slug: 'generatePdfThumbnail',
  retries: 3,
  inputSchema: [
    {
      name: 'documentId',
      type: 'text',
      required: true,
    },
  ],
  outputSchema: [
    {
      name: 'success',
      type: 'checkbox',
    },
    {
      name: 'imageId',
      type: 'text',
    },
  ],
  handler: async ({ input, req }) => {
    const { payload } = req;
    const { documentId } = input;

    payload.logger.info(`Starting PDF thumbnail generation for document ${documentId}`);

    try {
      const document_ = await payload.findByID({
        collection: 'documents',
        id: documentId,
        depth: 0,
      });

      if (document_.mimeType !== 'application/pdf' || !document_.url) {
        payload.logger.info(`Document ${documentId} is not a valid PDF or has no URL.`);
        return { output: { success: false } };
      }

      if (document_.pdfThumbnailUrl) {
        payload.logger.info(`Document ${documentId} already has a generated thumbnail. Skipping.`);
        return { output: { success: true } };
      }

      let documentUrl = document_.url;
      if (documentUrl.startsWith('/')) {
        const hostUrl = environmentVariables.APP_HOST_URL || 'http://localhost:3000';
        documentUrl = `${hostUrl}${documentUrl}`;
      }

      const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-thumb-'));
      const pdfPath = path.join(tmpdir, 'doc.pdf');
      const outPrefix = path.join(tmpdir, 'out');

      try {
        await downloadPdf(documentUrl, pdfPath);

        const { buffer: imgBuffer, size } = await extractFirstPage(pdfPath, outPrefix);

        const imageDocument = await uploadThumbnailToPayload(
          payload,
          document_.id,
          imgBuffer,
          size,
        );

        // We'll store the generated image's tiny URL if available, else standard URL

        const imageUrl: string = imageDocument.sizes?.tiny?.url || imageDocument.url || '';

        await updateDocumentThumbnailUrl(payload, req, documentId, imageUrl);

        payload.logger.info(`Successfully generated thumbnail for document ${documentId}`);

        return {
          output: {
            success: true,

            imageId: String(imageDocument.id),
          },
        };
      } finally {
        // Cleanup temp folder
        await fs.rm(tmpdir, { recursive: true, force: true });
      }
    } catch (error) {
      payload.logger.error({
        msg: `Failed to generate PDF thumbnail for document ${documentId}`,
        err: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  },
};
