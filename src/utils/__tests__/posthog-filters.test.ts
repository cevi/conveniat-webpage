import { filterPostHogNoise } from '@/utils/posthog-filters';
import type { CaptureResult } from 'posthog-js';

interface Frame {
  filename?: string;
  abs_path?: string;
  function?: string;
  lineno?: number;
  colno?: number;
}

/**
 * Builds the shape posthog-js hands to `before_send` for an autocaptured exception.
 */
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
          mechanism: { handled: false, synthetic: false, type: 'generic' },
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

    it('drops the WebExtension cookies.set() permission error, which has no source url', () => {
      // The extension reports a single frame with no filename, so only the message identifies it.
      // See https://github.com/cevi/conveniat-webpage/issues/1671
      const event = exceptionEvent({
        value: 'Invalid call to cookies.set(). Host permissions are missing or not granted.',
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

  describe('exceptions thrown by scripts the browser injected into the page', () => {
    // See https://github.com/cevi/conveniat-webpage/issues/1666. Chrome and Firefox for iOS
    // inject WebKit user scripts that WebKit attributes to the containing document, so the
    // reported source is our own page URL. The messages arrive minified past recognition, which
    // is why these cannot be matched by text.
    it.each([
      [
        'a single-frame throw on the homepage (issue #1666)',
        'ga',
        [{ filename: 'https://conveniat27.ch/', lineno: 415, colno: 45 }],
      ],
      [
        'a multi-frame throw on a content page',
        'Ca',
        [
          { filename: 'https://konekta.ch/place', lineno: 192, colno: 191 },
          { filename: 'https://konekta.ch/place', lineno: 191, colno: 41 },
          { filename: 'https://konekta.ch/place', lineno: 444, colno: 350 },
        ],
      ],
      [
        'a document URL carrying a query string',
        'Ii',
        [{ filename: 'https://conveniat27.ch/app/schedule?id=abc', lineno: 12, colno: 3 }],
      ],
    ])('drops %s', (_description, value, frames) => {
      expect(filterPostHogNoise(exceptionEvent({ value, frames }))).toBeNull();
    });
  });

  describe('exceptions whose whole stack is native code', () => {
    // See https://github.com/cevi/conveniat-webpage/issues/1667. Nothing we ship can throw
    // without leaving a script frame behind, so a stack of nothing but browser built-ins belongs
    // to an injected script the browser will not name.
    it('drops the Google Translate throw from Chrome for iOS (issue #1667)', () => {
      const event = exceptionEvent({
        type: 'TypeError',
        value: "undefined is not an object (evaluating 'a.K')",
        frames: [{ filename: '[native code]', function: 'Promise' }],
      });
      expect(filterPostHogNoise(event)).toBeNull();
    });

    it('drops a multi-frame stack of only built-ins', () => {
      const event = exceptionEvent({
        value: "undefined is not an object (evaluating 'b.j')",
        frames: [
          { filename: '[native code]', function: 'forEach' },
          { filename: '[native code]', function: 'Promise' },
        ],
      });
      expect(filterPostHogNoise(event)).toBeNull();
    });
  });

  describe('exceptions thrown by code we ship', () => {
    it('keeps a native frame that sits on top of one of our bundle frames', () => {
      // The real IndexedDB failure this rule must not swallow: our tRPC persister calls
      // `IDBDatabase.transaction`, which throws from native code. The bundle frame underneath it
      // is what makes the exception ours.
      const event = exceptionEvent({
        type: 'DOMException',
        value:
          "InvalidStateError: Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.",
        frames: [
          {
            filename: 'https://konekta.ch/_next/static/chunks/19f6kysfqmkzf.js',
            function: '?',
            lineno: 1,
            colno: 79_542,
          },
          { filename: '[native code]', function: 'transaction' },
        ],
      });
      expect(filterPostHogNoise(event)).toBe(event);
    });

    it('keeps a stack whose frames carry no filename at all', () => {
      const event = exceptionEvent({
        value: 'boom',
        frames: [{ function: 'handleSubmit' }],
      });
      expect(filterPostHogNoise(event)).toBe(event);
    });

    it('keeps a throw from a bundle chunk', () => {
      const event = exceptionEvent({
        value: "Cannot read properties of undefined (reading 'length')",
        frames: [
          {
            filename: 'https://conveniat27.ch/_next/static/chunks/0tgo0hgqvxwew.js',
            lineno: 1,
            colno: 9,
          },
        ],
      });
      expect(filterPostHogNoise(event)).toBe(event);
    });

    it('keeps a throw from the service worker', () => {
      const event = exceptionEvent({
        value: 'precache install failed',
        frames: [{ filename: 'https://conveniat27.ch/sw.js', lineno: 2, colno: 4 }],
      });
      expect(filterPostHogNoise(event)).toBe(event);
    });

    it('keeps a stack that only partly points at the document', () => {
      // A real failure can still be entered from an inline script, so one document frame is
      // not enough to call the whole stack foreign.
      const event = exceptionEvent({
        value: 'boom',
        frames: [
          { filename: 'https://conveniat27.ch/', lineno: 3, colno: 1 },
          {
            filename: 'https://conveniat27.ch/_next/static/chunks/31f8kdaod98dn.js',
            lineno: 1,
            colno: 2,
          },
        ],
      });
      expect(filterPostHogNoise(event)).toBe(event);
    });

    it('keeps an exception with no stack at all', () => {
      const event = exceptionEvent({ value: 'Checkout failed', frames: [] });
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

  describe('the message-based noise list', () => {
    it('still drops a known third-party message', () => {
      const event = exceptionEvent({
        value: "Can't find variable: __firefox__",
        frames: [
          {
            filename: 'https://conveniat27.ch/_next/static/chunks/31f8kdaod98dn.js',
            lineno: 1,
            colno: 2,
          },
        ],
      });
      expect(filterPostHogNoise(event)).toBeNull();
    });

    // React throws this from `resolveRetryWakeable` when a promise resolves for an `<Activity>`
    // boundary that has already been unmounted. The only frame is React's own, and browsers word
    // the null access differently. See https://github.com/cevi/conveniat-webpage/issues/1595
    it.each([
      "Cannot read properties of null (reading '_retryCache')",
      "null is not an object (evaluating 'e.stateNode._retryCache')",
    ])("drops React's retry of an unmounted boundary: %s", (value) => {
      const event = exceptionEvent({
        type: 'TypeError',
        value,
        frames: [
          {
            filename:
              'https://conveniat27.ch/_next/static/chunks/node_modules_next_dist_compiled_react-dom_cjs_react-dom-client_production_js.js',
            lineno: 13_304,
            colno: 43,
          },
        ],
      });
      expect(filterPostHogNoise(event)).toBeNull();
    });
  });

  describe('a fetch the browser never completed', () => {
    // Each browser words a cancelled or failed request differently and gives the TypeError an
    // empty stack, so the event names neither the request nor its caller.
    it("drops Firefox's NetworkError wording", () => {
      // See https://github.com/cevi/conveniat-webpage/issues/1655
      const event = exceptionEvent({
        type: 'TypeError',
        value: 'NetworkError when attempting to fetch resource.',
      });

      expect(filterPostHogNoise(event)).toBeNull();
    });

    it("drops WebKit's 'Internal error' wording", () => {
      // See https://github.com/cevi/conveniat-webpage/issues/1609
      const event = exceptionEvent({ type: 'TypeError', value: 'Internal error' });

      expect(filterPostHogNoise(event)).toBeNull();
    });

    it("keeps a message of ours that merely contains 'Internal error'", () => {
      const event = exceptionEvent({
        type: 'Error',
        value: 'Internal error while saving the shift enrollment',
      });

      expect(filterPostHogNoise(event)).toBe(event);
    });

    it("keeps another type thrown with exactly 'Internal error'", () => {
      const event = exceptionEvent({ type: 'RangeError', value: 'Internal error' });

      expect(filterPostHogNoise(event)).toBe(event);
    });
  });

  it('passes non-exception events straight through', () => {
    const event = { event: '$pageview', properties: {} } as unknown as CaptureResult;
    expect(filterPostHogNoise(event)).toBe(event);
  });
});
