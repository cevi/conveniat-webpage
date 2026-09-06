import type { CaptureResult } from 'posthog-js';

/**
 * Filter out known noise like CefSharp bot errors (e.g., from Outlook Safe Links)
 */
export const noiseMessages = [
  // see: https://github.com/cevi/conveniat-webpage/issues/708
  'NEXT_NOT_FOUND',
  'PAGE_NOT_FOUND',
  '404',

  // see: https://github.com/cevi/conveniat-webpage/issues/1012
  'Object Not Found Matching Id',

  // see: https://github.com/cevi/conveniat-webpage/issues/927
  // This happens when a browser extension (like an adblocker or a password manager)
  // tries to communicate with a tab that the user just closed or that recently refreshed.
  'Invalid call to runtime.sendMessage(). Tab not found.',

  // see: https://github.com/cevi/conveniat-webpage/issues/927
  // This is a known signature of the Bitwarden password manager extension failing to communicate internally.
  'Unhandled error response received for message <get-frame-manager-configuration>',

  // see: https://github.com/cevi/conveniat-webpage/issues/927
  // Often caused by browser extensions that modify the DOM (like Grammarly or certain adblockers / privacy tools).
  'Unhandled error response received for message <shell-plugins-site-config>',

  // PostHog's autocapture/session recording enumerates window.frames and tries to access each
  // frame's `document`. The EmailPreviewField uses sandbox="" which makes its iframe cross-origin,
  // causing the browser to throw a SecurityError. This is expected and harmless.
  'Blocked a frame with origin',

  // rrweb/posthog-js internal error when terminating session recording involving cross-origin iframes on Safari.
  // This causes an 'undefined is not an object (evaluating 'r.bufferBelongsToIframe')' error.
  'bufferBelongsToIframe',

  // see: https://github.com/cevi/conveniat-webpage/issues/1589
  // Crypto wallet browser extensions (MetaMask, Coinbase Wallet, ...) inject a provider and
  // then assign to `window.ethereum.selectedAddress`. When the injection is blocked or another
  // extension removed the provider first, the assignment throws
  // 'undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')'.
  // We never touch `window.ethereum`, so any such error originates outside of our code.
  'window.ethereum',

  // Firefox for iOS injects a `__firefox__` helper object into every page (reader mode,
  // YouTube quality fixes, ...). Its own injected scripts then reference it after the object
  // was torn down or before it was installed, which surfaces as our errors:
  //   'undefined is not an object (evaluating 'window.__firefox__.reader')'
  //   'undefined is not an object (evaluating 'window.__firefox__.refresh_youtube_quality_...')'
  //   "Can't find variable: __firefox__"
  // We never reference `__firefox__`, so match the whole family.
  // see: https://github.com/cevi/conveniat-webpage/issues/1150
  // see: https://github.com/cevi/conveniat-webpage/issues/1597
  '__firefox__',

  // see: https://github.com/cevi/conveniat-webpage/issues/1169
  // Common Android WebView error triggered by injected scripts (like Facebook in-app browser)
  // attempting to use a JS bridge that has already been destroyed during navigation or backgrounding.
  'Error invoking postMessage: Java object is gone',

  // see: https://github.com/cevi/conveniat-webpage/issues/1168
  // Another variant of the Android WebView JS bridge error.
  'Error invoking enableDidUserTypeOnKeyboardLogging: Java object is gone',

  // see: https://github.com/cevi/conveniat-webpage/issues/1148
  // DOMException in Mobile Safari usually related to Private Browsing, ITP,
  // or network flakiness when trying to load/register the service worker.
  'sw.js load failed',

  // see: https://github.com/cevi/conveniat-webpage/issues/1124
  // Mobile Safari AbortError when registering/updating the Service Worker,
  // often due to the tab being closed mid-load or aggressive battery saving.
  'Failed to register a ServiceWorker',

  // see: https://github.com/cevi/conveniat-webpage/issues/1080
  'Error in input stream',
  'controller[kState].transformAlgorithm',
  'Load failed',

  // react-youtube / youtube-player internal bug when unmounting quickly.
  // The internal container ref becomes null but createPlayer still executes.
  "Cannot read properties of null (reading 'playVideo')",

  // see: https://github.com/cevi/conveniat-webpage/issues/1135
  // Next.js App Router error when a client sends a malformed or outdated Next-Router-State-Tree header.
  'The router state header was sent but could not be parsed',

  // see: https://github.com/cevi/conveniat-webpage/issues/1065
  'Minified React error #4412',
  'Minified invariant #4412',

  // see: https://github.com/cevi/conveniat-webpage/issues/1087
  'TypeError: Invalid URL',
  'Invalid URL',

  // see: https://github.com/cevi/conveniat-webpage/issues/1677
  // The Zotero Connector extension prefixes every message it throws with its own name. Its
  // content script loses the connection to the extension's background page (on Safari that
  // happens whenever the background page is suspended) and reports the failure into the page.
  // The stack has no source url, so the frame check below cannot catch it.
  'Zotero Connector:',

  // see: https://github.com/cevi/conveniat-webpage/issues/1595
  // `_retryCache` is a private field React keeps on the fiber of an `<Activity>` boundary.
  // React reads it in `resolveRetryWakeable` when a promise a suspended boundary was waiting on
  // resolves, and throws when the boundary was already unmounted, so that `stateNode` is null.
  // The reported stacks are a single frame inside
  // `next/dist/compiled/react-dom/cjs/react-dom-client.production.js`, marked `in_app: false`,
  // with no frame of ours anywhere: the `<Activity>` boundaries belong to the App Router, we
  // neither render one nor touch the field. React throws it from a resolved promise's callback
  // rather than from a render, and the boundary it wanted to retry is gone, so nothing the user
  // sees changes. Match the field name rather than one engine's wording, since Safari and Chrome
  // phrase the same null access differently; `noiseMessages` is matched as a substring.
  '_retryCache',
];

/**
 * URL schemes a browser uses for scripts owned by an installed extension. A stack frame with such
 * a source was executed by an extension inside the page, never by our bundle, so the exception is
 * not ours to fix and only dilutes the error rate.
 *
 * posthog-js drops these itself (`error_tracking.captureExtensionExceptions` is false by default),
 * but its own check matches `chrome-extension://` alone, so Firefox and Safari extensions still
 * reach us. See `_isExtensionException` in posthog-js/lib/src/posthog-exceptions.js.
 */
const extensionUrlSchemes = [
  'chrome-extension://',
  'moz-extension://',
  'safari-extension://',
  'safari-web-extension://',
];

const isExtensionSource = (source: unknown): boolean =>
  typeof source === 'string' && extensionUrlSchemes.some((scheme) => source.startsWith(scheme));

/**
 * True when any stack frame of the exception was loaded from a browser extension. Exceptions
 * without frames, or with frames we cannot read, are kept: dropping those would hide real errors.
 */
const hasBrowserExtensionFrame = (exceptionList: unknown): boolean => {
  if (!Array.isArray(exceptionList)) {
    return false;
  }

  return (exceptionList as (Record<string, unknown> | null | undefined)[]).some((exception) => {
    const stacktrace = exception?.['stacktrace'] as { frames?: unknown } | null | undefined;
    const frames = stacktrace?.frames;
    if (!Array.isArray(frames)) {
      return false;
    }

    return (frames as (Record<string, unknown> | null | undefined)[]).some(
      (frame) => isExtensionSource(frame?.['filename']) || isExtensionSource(frame?.['abs_path']),
    );
  });
};

/** Matches the path of a URL that names a JavaScript file, whatever the query string. */
const javaScriptFileExtension = /\.[cm]?js$/;

interface PostHogStackFrame {
  filename?: unknown;
}

interface PostHogException {
  type?: unknown;
  value?: unknown;
  stacktrace?: { frames?: unknown } | null;
}

/**
 * True when a stack frame is attributed to an HTML document instead of to a script file.
 *
 * Everything we ship runs from a script URL: the bundle chunks under `/_next/static`, `/sw.js`,
 * and the PostHog recorder under `/ingest/static`. A frame whose http(s) filename does not name a
 * `.js` file therefore points at the HTML document itself. Anything that is not an http(s) URL
 * (`<anonymous>`, `blob:`, an extension scheme, an empty filename) is not a document frame, so an
 * unfamiliar stack is kept rather than dropped.
 */
const isDocumentFrame = (frame: PostHogStackFrame | null | undefined): boolean => {
  const filename = frame?.filename;
  if (typeof filename !== 'string') return false;

  let url: URL;
  try {
    url = new URL(filename);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return !javaScriptFileExtension.test(url.pathname);
};

/**
 * True when every frame of an exception points at the HTML document rather than at a script.
 *
 * see: https://github.com/cevi/conveniat-webpage/issues/1666
 *
 * Chrome and Firefox for iOS inject their own WebKit user scripts into every page they render.
 * WebKit attributes those scripts to the containing document, so when one of them throws, the
 * browser reports our page URL as the source with line numbers that belong to the injected script
 * — line 415 of a document that is five lines long. PostHog marks such frames `in_app`, files them
 * under our project and then fails to symbolicate them ("Invalid source map: bad json", because it
 * fetched our HTML). The exceptions arrive minified past recognition (`Error: ga`, `Error: Ca`,
 * frames named `Ii`), so the `noiseMessages` list above cannot tell them apart from real errors.
 *
 * The two inline `<script>` blocks we do ship — the native push capture and the boot watchdog in
 * `src/app/(onboarding)/layout.tsx` — only register listeners and guard every throwing call with
 * `try`/`catch`, so they cannot produce an uncaught exception. Keep it that way, or a genuine
 * failure in them will be dropped here.
 */
const isInjectedDocumentScript = (exception: PostHogException | null | undefined): boolean => {
  const frames = exception?.stacktrace?.frames;
  if (!Array.isArray(frames) || frames.length === 0) return false;
  return (frames as (PostHogStackFrame | null | undefined)[]).every((frame) =>
    isDocumentFrame(frame),
  );
};

/**
 * The filename a browser reports for a frame that is executing a built-in rather than a script:
 * `Promise`, `transaction`, `forEach`. posthog-js recognises this exact literal while parsing a
 * WebKit or Gecko stack — it is one alternative of the filename group in the `WEBKIT_STACK_REGEX`
 * of `posthog-js/src/extensions/exception-autocapture/stack-trace.ts` — and copies it into the
 * frame verbatim. No other spelling of a native frame occurs in our data.
 */
const NATIVE_CODE_FILENAME = '[native code]';

/**
 * True when an exception has at least one frame and the `filename` of every one of them is exactly
 * `[native code]`, so no script appears anywhere in the stack.
 *
 * see: https://github.com/cevi/conveniat-webpage/issues/1667
 *
 * Code we ship always leaves at least one frame under `/_next/static`, `/sw.js` or
 * `/ingest/static`, even when the throw happens inside a callback the browser invoked: the
 * callback itself is a frame. A stack made only of native frames therefore means the failing
 * function belonged to a script the browser refuses to attribute — the Google Translate bundle
 * Chrome for iOS injects, in the reported case, which throws with a Closure-Compiler-mangled
 * message (`undefined is not an object (evaluating 'a.K')`) that changes with every Google build
 * and so cannot be matched against `noiseMessages`.
 *
 * This fails open in every direction: an exception with no frames at all, a frame whose `filename`
 * is missing or not a string, and any single non-native frame all keep the exception. A real
 * failure of ours that merely passes through a built-in — `IDBDatabase.transaction` throwing
 * underneath our tRPC persister, for instance — still carries its bundle frame and is reported.
 */
const isNativeOnlyStack = (exception: PostHogException | null | undefined): boolean => {
  const frames = exception?.stacktrace?.frames;
  if (!Array.isArray(frames) || frames.length === 0) return false;
  return (frames as (PostHogStackFrame | null | undefined)[]).every(
    (frame) => frame?.filename === NATIVE_CODE_FILENAME,
  );
};

/**
 * What a browser reports through `window.onerror` when a script from another origin throws: the
 * message, the source url and the stack are all replaced by this literal, so the event carries
 * nothing we could act on. We serve no cross-origin scripts ourselves (PostHog is proxied through
 * `/ingest` on our own origin), so every one of these comes from an extension, an in-app browser
 * or another injected script. It is compared for equality, not as a substring like
 * `noiseMessages`, so an error of ours that merely mentions a script error is still reported.
 *
 * see: https://github.com/cevi/conveniat-webpage/issues/1553
 */
const MASKED_CROSS_ORIGIN_ERROR = 'Script error.';

/**
 * `before_send` hook for posthog-js: drops exceptions that did not originate in our code.
 *
 * Returns the event unchanged when it should be reported, and `null` to discard it.
 */
export const filterPostHogNoise = (event: CaptureResult | null): CaptureResult | null => {
  if (event?.event === '$exception') {
    const props = event.properties;
    const exceptionMessage = props['$exception_message'] as unknown;
    if (
      typeof exceptionMessage === 'string' &&
      noiseMessages.some((message) => exceptionMessage.includes(message))
    ) {
      // eslint-disable-next-line unicorn/no-null
      return null; // drop the event
    }

    const exceptionList = props['$exception_list'] as unknown;

    if (hasBrowserExtensionFrame(exceptionList)) {
      // eslint-disable-next-line unicorn/no-null
      return null; // drop the event
    }

    if (Array.isArray(exceptionList)) {
      for (const exc of exceptionList as Array<PostHogException | null | undefined>) {
        const type = exc?.type;
        const value = exc?.value;
        if (
          (typeof type === 'string' && noiseMessages.some((m) => type.includes(m))) ||
          (typeof value === 'string' && noiseMessages.some((m) => value.includes(m))) ||
          value === MASKED_CROSS_ORIGIN_ERROR ||
          isInjectedDocumentScript(exc) ||
          isNativeOnlyStack(exc)
        ) {
          // eslint-disable-next-line unicorn/no-null
          return null; // drop the event
        }
      }
    }
  }
  // eslint-disable-next-line unicorn/no-null
  return event ?? null;
};
