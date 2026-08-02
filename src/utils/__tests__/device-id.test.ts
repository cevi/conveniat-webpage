import { getOrCreateDeviceId } from '@/utils/device-id';

describe('getOrCreateDeviceId', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const localStorageMock = {
      // eslint-disable-next-line unicorn/no-null
      getItem: jest.fn((key: string) => mockStorage[key] ?? null),
      setItem: jest.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: jest.fn(() => {
        mockStorage = {};
      }),
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: globalThis,
      configurable: true,
      writable: true,
    });
  });

  it('should generate a new deviceId if none exists in localStorage', () => {
    const id1 = getOrCreateDeviceId();
    expect(id1).toBeDefined();
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
  });

  it('should reuse the same deviceId from localStorage on subsequent calls', () => {
    const id1 = getOrCreateDeviceId();
    const id2 = getOrCreateDeviceId();
    expect(id1).toEqual(id2);
  });
});
