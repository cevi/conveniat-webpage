// Mock global window for SSR checks in node test environment
Object.defineProperty(globalThis, 'window', {
  value: {},
  writable: true,
  configurable: true,
});

import {
  addMessageToOutbox,
  getOfflineOutbox,
  removeMessageFromOutbox,
  type OfflineMessage,
} from '@/features/chat/utils/offline-outbox';

describe('offline-outbox utility tests', () => {
  const OFFLINE_OUTBOX_KEY = 'conveniat-offline-outbox';

  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};

    // Mock global localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        // eslint-disable-next-line unicorn/no-null, @typescript-eslint/strict-boolean-expressions
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
      },
      writable: true,
      configurable: true,
    });

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getOfflineOutbox should return an empty array if localStorage is empty', () => {
    const result = getOfflineOutbox();
    expect(result).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(localStorage.getItem).toHaveBeenCalledWith(OFFLINE_OUTBOX_KEY);
  });

  test('getOfflineOutbox should return parsed messages if they exist in localStorage', () => {
    const sampleMessages: OfflineMessage[] = [
      {
        id: 'opt-id-1',
        chatId: 'chat-1',
        content: 'hello offline',
        createdAt: '2026-05-22T00:00:00.000Z',
      },
    ];
    mockStorage[OFFLINE_OUTBOX_KEY] = JSON.stringify(sampleMessages);

    const result = getOfflineOutbox();
    expect(result).toEqual(sampleMessages);
  });

  test('getOfflineOutbox should return an empty array and log error on corrupted JSON', () => {
    mockStorage[OFFLINE_OUTBOX_KEY] = '{ corrupted json';

    const result = getOfflineOutbox();
    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  test('addMessageToOutbox should add a new message to the outbox', () => {
    const sampleMessage: OfflineMessage = {
      id: 'opt-id-1',
      chatId: 'chat-1',
      content: 'hello offline',
      createdAt: '2026-05-22T00:00:00.000Z',
    };

    addMessageToOutbox(sampleMessage);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(localStorage.setItem).toHaveBeenCalledWith(
      OFFLINE_OUTBOX_KEY,
      JSON.stringify([sampleMessage]),
    );
    expect(getOfflineOutbox()).toEqual([sampleMessage]);
  });

  test('addMessageToOutbox should prevent duplicate additions', () => {
    const sampleMessage: OfflineMessage = {
      id: 'opt-id-1',
      chatId: 'chat-1',
      content: 'hello offline',
      createdAt: '2026-05-22T00:00:00.000Z',
    };

    addMessageToOutbox(sampleMessage);
    addMessageToOutbox(sampleMessage); // attempt duplicate

    const currentOutbox = getOfflineOutbox();
    expect(currentOutbox).toHaveLength(1);
    expect(currentOutbox).toEqual([sampleMessage]);
  });

  test('removeMessageFromOutbox should remove message by its ID', () => {
    const message1: OfflineMessage = {
      id: 'opt-id-1',
      chatId: 'chat-1',
      content: 'first msg',
      createdAt: '2026-05-22T00:00:00.000Z',
    };
    const message2: OfflineMessage = {
      id: 'opt-id-2',
      chatId: 'chat-1',
      content: 'second msg',
      createdAt: '2026-05-22T00:00:01.000Z',
    };

    addMessageToOutbox(message1);
    addMessageToOutbox(message2);

    removeMessageFromOutbox('opt-id-1');

    const currentOutbox = getOfflineOutbox();
    expect(currentOutbox).toHaveLength(1);
    expect(currentOutbox[0]?.id).toBe('opt-id-2');
  });

  test('removeMessageFromOutbox should do nothing if ID is not found', () => {
    const message1: OfflineMessage = {
      id: 'opt-id-1',
      chatId: 'chat-1',
      content: 'first msg',
      createdAt: '2026-05-22T00:00:00.000Z',
    };

    addMessageToOutbox(message1);
    removeMessageFromOutbox('non-existent-id');

    expect(getOfflineOutbox()).toEqual([message1]);
  });
});
