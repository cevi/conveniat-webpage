import { filterPostHogNoise } from '@/utils/posthog-filters';
import type { CaptureResult } from 'posthog-js';

interface Frame {
  filename?: string;
  abs_path?: string;
}

const exceptionEvent = (exception: {
  type?: string;
  value?: string;
  frames?: Frame[];
}): CaptureResult =>
  ({
    event: '$exception',
    properties: {
      $exception_message: exception.value,
      $exception_list: [
        {
          type: exception.type ?? 'Error',
          value: exception.value,
          ...(exception.frames === undefined
            ? {}
            : { stacktrace: { type: 'raw', frames: exception.frames } }),
        },
      ],
    },
  }) as unknown as CaptureResult;

describe('filterPostHogNoise', () => {
  describe('exceptions thrown by a browser extension', () => {
    // Every one of these was executed by an installed extension inside the page, so no
    // deployment of ours can fix it. See https://github.com/cevi/conveniat-webpage/issues/1677
    it.each([
      ['a Chrome extension', 'chrome-extension://abcdef/content.js'],
      ['a Firefox extension', 'moz-extension://abcdef/content.js'],
      ['a legacy Safari extension', 'safari-extension://com.example.ext/inject.js'],
      ['a Safari web extension', 'safari-web-extension://ABCDEF/zotero/inject.js'],
    ])('drops an exception whose stack frame comes from %s', (_description, filename) => {
      const event = exceptionEvent({
        value: 'Something an extension did',
        frames: [{ filename }],
      });

      expect(filterPostHogNoise(event)).toBeNull();
    });

    it('drops an exception whose frame carries the extension url as abs_path only', () => {
      const event = exceptionEvent({
        value: 'Something an extension did',
        frames: [{ abs_path: 'moz-extension://abcdef/content.js' }],
      });

      expect(filterPostHogNoise(event)).toBeNull();
    });

    it('drops the Zotero Connector message, which arrives without a source url', () => {
      // Safari gives this one no stack, so only the message identifies it.
      const event = exceptionEvent({
        value:
          'Zotero Connector: Failed to send message i18n.getStrings to background page. It may be dead.',
      });

      expect(filterPostHogNoise(event)).toBeNull();
    });
  });

  describe('the masked cross-origin error', () => {
    // The browser replaces message, source and stack with 'Script error.' when a script from
    // another origin throws. See https://github.com/cevi/conveniat-webpage/issues/1553
    it('drops a frameless "Script error."', () => {
      const event = exceptionEvent({ type: 'Error', value: 'Script error.' });

      expect(filterPostHogNoise(event)).toBeNull();
    });

    it('keeps an error of ours that only mentions a script error', () => {
      const event = exceptionEvent({
        type: 'Error',
        value: 'Failed to initialize: Script error.',
        frames: [{ filename: 'https://conveniat27.ch/_next/static/chunks/main.js' }],
      });

      expect(filterPostHogNoise(event)).toBe(event);
    });
  });

  describe('exceptions we still want to hear about', () => {
    it('keeps an exception thrown by our own bundle', () => {
      const event = exceptionEvent({
        type: 'TypeError',
        value: "Cannot read properties of undefined (reading 'title')",
        frames: [{ filename: 'https://conveniat27.ch/_next/static/chunks/main.js' }],
      });

      expect(filterPostHogNoise(event)).toBe(event);
    });

    it('keeps an exception with no stack frames at all', () => {
      // A missing stack is common on old mobile browsers. Dropping those would hide real errors.
      const event = exceptionEvent({ type: 'Error', value: 'Checkout failed' });

      expect(filterPostHogNoise(event)).toBe(event);
    });

    it('keeps an exception whose frames are not readable', () => {
      const event = {
        event: '$exception',
        properties: { $exception_list: [{ stacktrace: { frames: 'not-an-array' } }] },
      } as unknown as CaptureResult;

      expect(filterPostHogNoise(event)).toBe(event);
    });
  });

  it('passes a non-exception event through untouched', () => {
    const event = {
      event: '$pageview',
      properties: { $current_url: 'chrome-extension://abcdef/page.html' },
    } as unknown as CaptureResult;

    expect(filterPostHogNoise(event)).toBe(event);
  });
});
