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
});
