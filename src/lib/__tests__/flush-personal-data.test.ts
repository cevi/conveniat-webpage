/**
 * @jest-environment jsdom
 */
import { flushPersonalData } from '@/lib/flush-personal-data';

jest.mock('@/lib/tanstack-db', () => ({
  starsCollection: {
    state: new Map(),
    delete: jest.fn(),
  },
  userPreferencesCollection: {
    state: new Map(),
    delete: jest.fn(),
  },
}));

describe('flushPersonalData', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should remove persisted query caches and legacy items from localStorage', () => {
    localStorage.setItem('conveniat-query-cache', 'test-data');
    localStorage.setItem('conveniat-query-cache-idb', 'test-idb-data');
    localStorage.setItem('starredItems', 'starred-data');

    flushPersonalData();

    expect(localStorage.getItem('conveniat-query-cache')).toBeNull();
    expect(localStorage.getItem('conveniat-query-cache-idb')).toBeNull();
    expect(localStorage.getItem('starredItems')).toBeNull();
  });

  it('clears unsent chat messages and drafts on logout', () => {
    localStorage.setItem('conveniat-offline-outbox', '[]');
    localStorage.setItem('conveniat-failed-sends', '[]');
    localStorage.setItem('conveniat:chat-draft:chat-1:main', 'half a sentence');

    flushPersonalData();

    expect(localStorage.getItem('conveniat-offline-outbox')).toBeNull();
    expect(localStorage.getItem('conveniat-failed-sends')).toBeNull();
    expect(localStorage.getItem('conveniat:chat-draft:chat-1:main')).toBeNull();
  });

  it('keeps unsent chat messages when only the session expired', () => {
    localStorage.setItem('conveniat-offline-outbox', '[]');
    localStorage.setItem('conveniat:chat-draft:chat-1:main', 'half a sentence');

    flushPersonalData({ keepUnsentChatMessages: true });

    expect(localStorage.getItem('conveniat-offline-outbox')).toBe('[]');
    expect(localStorage.getItem('conveniat:chat-draft:chat-1:main')).toBe('half a sentence');
  });

  describe("the service worker's cached pages", () => {
    const postMessage = jest.fn();

    beforeEach(() => {
      postMessage.mockClear();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { controller: { postMessage } },
        configurable: true,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(navigator, 'serviceWorker');
    });

    const sentTypes = (): unknown[] =>
      postMessage.mock.calls.map(([message]) => (message as { type: string }).type);

    it('are cleared on an explicit logout', () => {
      flushPersonalData({ clearCachedPages: true });

      expect(sentTypes()).toContain('CLEAR_PERSONAL_CACHES');
    });

    // A 401 and skipping the login also run for someone who was never logged in, and the offline
    // download triggers a 401 for them: clearing there wiped the download while it ran.
    it('are kept when the session merely expired or the login was skipped', () => {
      flushPersonalData({ keepUnsentChatMessages: true });
      flushPersonalData();

      expect(sentTypes()).not.toContain('CLEAR_PERSONAL_CACHES');
    });
  });
});
