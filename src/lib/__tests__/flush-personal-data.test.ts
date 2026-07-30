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
});
