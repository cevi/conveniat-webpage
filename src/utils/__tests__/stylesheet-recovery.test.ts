/**
 * @jest-environment jsdom
 */

import { STYLESHEET_RECOVERY_SCRIPT } from '@/utils/stylesheet-recovery';

const CSS = 'http://localhost/_next/static/chunks/0abc.css';

const listeners: Array<() => void> = [];

const setOnline = (online: boolean): void => {
  Object.defineProperty(globalThis.navigator, 'onLine', { value: online, configurable: true });
};

const addStylesheet = (href: string, loaded: boolean): HTMLLinkElement => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  // like Chrome: a failed stylesheet has a sheet whose rules throw, even on the same origin
  const failedSheet = {
    get cssRules(): never {
      throw new DOMException('Cannot access rules', 'SecurityError');
    },
  };
  Object.defineProperty(link, 'sheet', {
    value: loaded ? { cssRules: [{ cssText: 'body {}' }] } : failedSheet,
    configurable: true,
  });
  document.head.append(link);
  return link;
};

/** Runs the bootstrap as the parser would: as the script element at the end of `<head>` so far. */
const runBootstrap = (): void => {
  const script = document.createElement('script');
  document.head.append(script);
  Object.defineProperty(document, 'currentScript', { value: script, configurable: true });
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs the exact inline source
  (new Function(STYLESHEET_RECOVERY_SCRIPT) as () => void)();
};

/** Fails a stylesheet the way the browser does: an `error` event that does not bubble. */
const fail = (link: Element): void => {
  link.dispatchEvent(new Event('error'));
};

const stylesheetsFor = (href: string): HTMLLinkElement[] =>
  [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].filter(
    (link) => link.href === href,
  );

beforeEach(() => {
  jest.useFakeTimers();
  setOnline(true);
  document.head.innerHTML = '';
  delete (globalThis as unknown as Record<string, unknown>)['__stylesheetRecovery'];
  // the bootstrap registers on the shared document and window; remove them after each test
  for (const target of [document, globalThis] as EventTarget[]) {
    const original = target.addEventListener.bind(target);
    jest
      .spyOn(target, 'addEventListener')
      .mockImplementation((...args: Parameters<EventTarget['addEventListener']>) => {
        listeners.push(() => target.removeEventListener(...args));
        original(...args);
      });
  }
});

afterEach(() => {
  for (const remove of listeners.splice(0)) remove();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('stylesheet recovery', () => {
  it('loads a stylesheet that failed before it ran again, right after the failed one', () => {
    const failed = addStylesheet(CSS, false);
    const next = addStylesheet('http://localhost/_next/static/chunks/1def.css', true);
    runBootstrap();

    expect(stylesheetsFor(CSS)).toHaveLength(1);
    jest.advanceTimersByTime(500);

    const retried = stylesheetsFor(CSS);
    expect(retried).toHaveLength(2);
    expect(failed.nextElementSibling).toBe(retried[1]);
    expect(retried[1]?.nextElementSibling).toBe(next);
  });

  it('leaves loaded, still loading and foreign stylesheets alone', () => {
    addStylesheet(CSS, true);
    addStylesheet('http://localhost/fonts.css', false);
    runBootstrap();
    // below the script: the parser has not waited for it, so an empty sheet means "loading"
    addStylesheet('http://localhost/_next/static/chunks/2ghi.css', false);

    jest.advanceTimersByTime(60_000);

    expect(document.querySelectorAll('link[data-retry-of]')).toHaveLength(0);
  });

  it('retries a stylesheet that fails later, like one added on a client navigation', () => {
    runBootstrap();
    const later = addStylesheet(CSS, false);
    fail(later);

    jest.advanceTimersByTime(500);

    expect(stylesheetsFor(CSS)).toHaveLength(2);
  });

  it('waits for the connection to come back while offline', () => {
    setOnline(false);
    addStylesheet(CSS, false);
    runBootstrap();

    jest.advanceTimersByTime(60_000);
    expect(stylesheetsFor(CSS)).toHaveLength(1);

    setOnline(true);
    globalThis.dispatchEvent(new Event('online'));
    expect(stylesheetsFor(CSS)).toHaveLength(2);
  });

  it('gives up after five attempts, and a reconnect grants five more', () => {
    addStylesheet(CSS, false);
    runBootstrap();

    for (let attempt = 0; attempt < 7; attempt++) {
      jest.advanceTimersByTime(60_000);
      const latest = stylesheetsFor(CSS).at(-1);
      if (latest?.hasAttribute('data-retry-of') === true) fail(latest);
    }
    expect(stylesheetsFor(CSS)).toHaveLength(1 + 5);

    // the last failure waits for a reconnect, which retries it with a fresh budget
    globalThis.dispatchEvent(new Event('online'));
    expect(stylesheetsFor(CSS)).toHaveLength(1 + 6);
    fail(stylesheetsFor(CSS).at(-1) as HTMLLinkElement);
    jest.advanceTimersByTime(1000);
    expect(stylesheetsFor(CSS)).toHaveLength(1 + 7);
  });
});
