import { isCountedDocumentDownload } from '@/features/payload-cms/payload-cms/utils/document-download-tracking';

const isCounted = (headers: Record<string, string>, search = ''): boolean =>
  isCountedDocumentDownload(new Headers(headers), new URLSearchParams(search));

describe('isCountedDocumentDownload', () => {
  it('counts a plain request from the public site', () => {
    expect(isCounted({ Referer: 'https://conveniat27.ch/de/infos' })).toBe(true);
  });

  it('counts a request without a referer, like a link opened in a new tab', () => {
    expect(isCounted({})).toBe(true);
  });

  it('ignores router prefetches and RSC requests', () => {
    expect(isCounted({ 'Next-Router-Prefetch': '1', RSC: '1' })).toBe(false);
    expect(isCounted({ RSC: '1' })).toBe(false);
    expect(isCounted({}, '_rsc=abc&locale=de')).toBe(false);
    expect(isCounted({ 'Sec-Purpose': 'prefetch;prerender' })).toBe(false);
  });

  it('counts the first range request of a PDF viewer but not the following ones', () => {
    expect(isCounted({ Range: 'bytes=0-65535' })).toBe(true);
    expect(isCounted({ Range: 'bytes=65536-131071' })).toBe(false);
  });

  it('ignores editors opening the file from the admin panel', () => {
    expect(isCounted({ Referer: 'https://conveniat27.ch/admin/collections/documents/1' })).toBe(
      false,
    );
  });

  it('counts a request with a malformed referer', () => {
    expect(isCounted({ Referer: 'not a url' })).toBe(true);
  });
});
