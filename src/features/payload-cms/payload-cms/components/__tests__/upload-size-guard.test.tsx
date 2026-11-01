/**
 * @jest-environment jsdom
 */
import { UploadSizeGuard } from '@/features/payload-cms/payload-cms/components/upload-size-guard';
import { MAX_UPLOAD_FILE_BYTES } from '@/features/payload-cms/payload-cms/utils/upload-size-limit';
import { fireEvent, render, screen } from '@testing-library/react';

const mockToastError = jest.fn();
let mockLanguage = 'de';

jest.mock('@payloadcms/ui', () => ({
  toast: {
    error: (message: string): void => {
      mockToastError(message);
    },
  },
  useTranslation: (): unknown => ({ i18n: { language: mockLanguage } }),
}));

const fileOfSize = (name: string, size: number): File => {
  const file = new File([''], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const renderUploadField = (onFile: (file: File | undefined) => void): HTMLInputElement => {
  render(
    <UploadSizeGuard>
      <input
        type="file"
        aria-label="upload"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
    </UploadSizeGuard>,
  );
  return screen.getByLabelText<HTMLInputElement>('upload');
};

describe('UploadSizeGuard', () => {
  beforeEach(() => {
    mockToastError.mockReset();
    mockLanguage = 'de';
  });

  it('lets a file within the limit through to the upload field', () => {
    const onFile = jest.fn();
    const input = renderUploadField(onFile);

    fireEvent.change(input, {
      target: { files: [fileOfSize('lagerplan.pdf', MAX_UPLOAD_FILE_BYTES)] },
    });

    expect(onFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'lagerplan.pdf' }));
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('keeps a file above the limit from the upload field and says why, in German', () => {
    const onFile = jest.fn();
    const input = renderUploadField(onFile);

    fireEvent.change(input, {
      target: { files: [fileOfSize('lagerfilm.mp4', 312.4 * 1024 * 1024)] },
    });

    expect(onFile).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      '«lagerfilm.mp4» ist 312.4\u00A0MB gross. Erlaubt sind höchstens 100\u00A0MB pro Datei.',
    );
  });

  it.each([
    [
      'fr',
      '«\u00A0lagerfilm.mp4\u00A0» fait 312,4\u00A0Mo. La taille maximale est de 100\u00A0Mo par fichier.',
    ],
    ['en', '“lagerfilm.mp4” is 312.4\u00A0MB. Files can be at most 100\u00A0MB.'],
  ])('speaks the admin panel language %s', (language, message) => {
    mockLanguage = language;
    const input = renderUploadField(jest.fn());

    fireEvent.change(input, {
      target: { files: [fileOfSize('lagerfilm.mp4', 312.4 * 1024 * 1024)] },
    });

    expect(mockToastError).toHaveBeenCalledWith(message);
  });

  it('refuses an oversized file dropped anywhere in the panel', () => {
    renderUploadField(jest.fn());
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', {
      value: { files: [fileOfSize('lagerfilm.mp4', MAX_UPLOAD_FILE_BYTES + 1)] },
    });

    document.body.dispatchEvent(drop);

    expect(drop.defaultPrevented).toBe(true);
    expect(mockToastError).toHaveBeenCalledTimes(1);
  });
});
