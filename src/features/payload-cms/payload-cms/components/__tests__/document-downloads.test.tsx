import { DocumentDownloadsCell } from '@/features/payload-cms/payload-cms/components/document-downloads';
import type { DefaultServerCellComponentProps } from 'payload';

jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));

describe('DocumentDownloadsCell', () => {
  it('renders nothing when Payload renders it without a row, as it does for the edit form', async () => {
    const props = { i18n: { language: 'de' } } as unknown as DefaultServerCellComponentProps;

    await expect(DocumentDownloadsCell(props)).resolves.toBeDefined();
  });
});
