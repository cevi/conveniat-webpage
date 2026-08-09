import {
  generateMessageId,
  isServerCompatibleMessageId,
  mergeStoredMessage,
  mergeStoredMessageAcrossPages,
} from '@/features/chat/utils';

interface TestMessage {
  id: string;
  text: string;
}

const message = (id: string, text = id): TestMessage => ({ id, text });

describe('generateMessageId', () => {
  test('produces an id the server can adopt as the message UUID', () => {
    const id = generateMessageId();
    expect(isServerCompatibleMessageId(id)).toBe(true);
  });

  test('produces distinct ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateMessageId()));
    expect(ids.size).toBe(100);
  });

  test('falls back to a manual UUID v4 when crypto.randomUUID is unavailable', () => {
    // `crypto.randomUUID` only exists in secure contexts
    const cryptoObject = globalThis.crypto as unknown as { randomUUID?: unknown };
    const originalRandomUuid = cryptoObject.randomUUID;
    cryptoObject.randomUUID = undefined;

    try {
      const id = generateMessageId();
      expect(isServerCompatibleMessageId(id)).toBe(true);
      expect(id[14]).toBe('4');
      expect(['8', '9', 'a', 'b']).toContain(id[19]);
    } finally {
      cryptoObject.randomUUID = originalRandomUuid;
    }
  });
});

describe('isServerCompatibleMessageId', () => {
  test('rejects legacy optimistic ids', () => {
    expect(isServerCompatibleMessageId('optimistic-1234567890-abcdefg')).toBe(false);
  });
});

describe('mergeStoredMessage', () => {
  const stored = message('11111111-1111-4111-8111-111111111111', 'stored');

  test('upgrades the optimistic entry in place when it already carries the server id', () => {
    const items = [message('a'), { ...stored, text: 'pending' }, message('b')];

    expect(mergeStoredMessage(items, stored, stored.id)).toStrictEqual([
      message('a'),
      stored,
      message('b'),
    ]);
  });

  test('collapses a copy that raced in from the realtime stream', () => {
    const items = [message('a'), { ...stored, text: 'pending' }, stored];

    expect(mergeStoredMessage(items, stored, stored.id)).toStrictEqual([message('a'), stored]);
  });

  test('replaces a legacy optimistic id with the server message', () => {
    const items = [message('a'), message('optimistic-1-x', 'pending')];

    expect(mergeStoredMessage(items, stored, 'optimistic-1-x')).toStrictEqual([
      message('a'),
      stored,
    ]);
  });

  test('touches only the addressed message when several sends are still pending', () => {
    const other = message('22222222-2222-4222-8222-222222222222', 'other pending');
    const items = [{ ...stored, text: 'pending' }, other];

    expect(mergeStoredMessage(items, stored, stored.id)).toStrictEqual([stored, other]);
  });

  test('leaves the list untouched when the message is unknown', () => {
    const items = [message('a'), message('b')];

    expect(mergeStoredMessage(items, stored, stored.id)).toStrictEqual(items);
  });
});

describe('mergeStoredMessageAcrossPages', () => {
  const stored = message('11111111-1111-4111-8111-111111111111', 'stored');

  test('keeps a single copy when the optimistic entry and the server copy sit on different pages', () => {
    const pages = [
      [stored, message('a')],
      [{ ...stored, text: 'pending' }, message('b')],
    ];

    expect(mergeStoredMessageAcrossPages(pages, stored, stored.id)).toStrictEqual([
      [stored, message('a')],
      [message('b')],
    ]);
  });
});
