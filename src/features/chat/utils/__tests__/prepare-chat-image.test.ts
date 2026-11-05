/**
 * @jest-environment jsdom
 */
import { isHeicFile, prepareChatImage, scaledSize } from '@/features/chat/utils/prepare-chat-image';

const mockHeicTo = jest.fn();
jest.mock('@/utils/heic-decoder', () => ({
  loadHeicDecoder: (): Promise<unknown> =>
    Promise.resolve((...args: unknown[]): unknown => mockHeicTo(...args)),
}));

/** The size a decoded test image has; `createImageBitmap` is not in jsdom. */
let decodedSize: { width: number; height: number };
let canDecode: boolean;
let drawnSize: { width: number; height: number } | undefined;

const bitmap = (): ImageBitmap => ({ ...decodedSize, close: jest.fn() });

beforeEach(() => {
  decodedSize = { width: 4032, height: 3024 };
  canDecode = true;
  drawnSize = undefined;
  mockHeicTo.mockReset().mockImplementation(() => Promise.resolve(bitmap()));
  globalThis.createImageBitmap = jest.fn(() =>
    canDecode
      ? Promise.resolve(bitmap())
      : Promise.reject(new Error('The source image cannot be decoded.')),
  );
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    return {
      fillRect: jest.fn(),
      drawImage: (): void => {
        drawnSize = { width: this.width, height: this.height };
      },
    } as unknown as CanvasRenderingContext2D;
  });
  jest
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation((callback: BlobCallback, type?: string) =>
      callback(new Blob(['jpeg'], { type: type ?? '' })),
    );
});

afterEach(() => jest.restoreAllMocks());

const photo = (name: string, type: string): File => new File(['original'], name, { type });

describe('scaledSize', () => {
  it('brings the long edge of a landscape or portrait photo down to 1600 pixels', () => {
    expect(scaledSize(4032, 3024)).toEqual({ width: 1600, height: 1200 });
    expect(scaledSize(3024, 4032)).toEqual({ width: 1200, height: 1600 });
  });

  it('never enlarges a small image', () => {
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe('isHeicFile', () => {
  it('knows HEIC by its type, and by its name when the picker reports none', () => {
    expect(isHeicFile(photo('IMG_0001.HEIC', 'image/heic'))).toBe(true);
    expect(isHeicFile(photo('IMG_0001.heif', ''))).toBe(true);
    expect(isHeicFile(photo('IMG_0001.jpg', 'image/jpeg'))).toBe(false);
  });
});

describe('prepareChatImage', () => {
  it('sends a phone photo as a JPEG of at most 1600 pixels', async () => {
    const image = await prepareChatImage(photo('Züri 11.png', 'image/png'));

    expect(image.type).toBe('image/jpeg');
    expect(image.name).toBe('Züri 11.jpg');
    expect(drawnSize).toEqual({ width: 1600, height: 1200 });
    expect(mockHeicTo).not.toHaveBeenCalled();
  });

  it('decodes without the orientation option older Safari and Chrome refuse', async () => {
    const picked = photo('IMG_0002.jpg', 'image/jpeg');

    await prepareChatImage(picked);

    expect(globalThis.createImageBitmap).toHaveBeenCalledWith(picked);
  });

  it('converts a HEIC the browser decodes itself without the decoder', async () => {
    const image = await prepareChatImage(photo('IMG_0001.HEIC', 'image/heic'));

    expect(image.type).toBe('image/jpeg');
    expect(mockHeicTo).not.toHaveBeenCalled();
  });

  it('converts a HEIC the browser cannot decode with the decoder', async () => {
    canDecode = false;

    const image = await prepareChatImage(photo('IMG_0001.HEIC', 'image/heic'));

    expect(mockHeicTo).toHaveBeenCalledTimes(1);
    expect(image.type).toBe('image/jpeg');
    expect(drawnSize).toEqual({ width: 1600, height: 1200 });
  });

  it('refuses another image the browser cannot decode, without fetching the decoder', async () => {
    canDecode = false;

    await expect(prepareChatImage(photo('scan.tiff', 'image/tiff'))).rejects.toThrow();
    expect(mockHeicTo).not.toHaveBeenCalled();
  });

  it('sends a GIF as picked, so it keeps moving', async () => {
    const gif = photo('jubel.gif', 'image/gif');

    expect(await prepareChatImage(gif)).toBe(gif);
  });
});
