import { startsLike } from '@/features/hof-dashboard/utils/file-signature';

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);

describe('startsLike', () => {
  it('knows a PDF, a picture and an Office file by their first bytes', () => {
    expect(startsLike(bytes(0x25, 0x50, 0x44, 0x46, 0x2d), 'pdf')).toBe(true);
    expect(startsLike(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d), 'png')).toBe(true);
    expect(startsLike(bytes(0x50, 0x4b, 0x03, 0x04, 0x14), 'docx')).toBe(true);
  });

  it('refuses a file renamed to an ending it does not have', () => {
    expect(startsLike(bytes(0xff, 0xd8, 0xff, 0xe0), 'pdf')).toBe(false);
    expect(startsLike(bytes(), 'png')).toBe(false);
  });
});
