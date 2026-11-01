import { describeScannedCode, readChatInvitePath } from '@/features/chat/utils/chat-invite-link';

const ORIGINS = ['https://conveniat27.ch', 'https://con27.ch'];

describe('readChatInvitePath', () => {
  it('opens the invite of a scanned code from the app', () => {
    expect(
      readChatInvitePath('https://conveniat27.ch/app/chat/new-chat-with-user/aB3_-x', ORIGINS),
    ).toBe('/app/chat/new-chat-with-user/aB3_-x');
  });

  it('accepts the short host and a locale prefix', () => {
    expect(readChatInvitePath('https://con27.ch/app/chat/new-chat-with-user/abc', ORIGINS)).toBe(
      '/app/chat/new-chat-with-user/abc',
    );
    expect(
      readChatInvitePath('https://conveniat27.ch/fr/app/chat/new-chat-with-user/abc', ORIGINS),
    ).toBe('/app/chat/new-chat-with-user/abc');
  });

  it('ignores a link to another host', () => {
    expect(
      readChatInvitePath('https://example.com/app/chat/new-chat-with-user/abc', ORIGINS),
    ).toBeUndefined();
  });

  it('ignores a link of the app that is no invite, and text that is no link', () => {
    expect(readChatInvitePath('https://conveniat27.ch/app/map', ORIGINS)).toBeUndefined();
    expect(readChatInvitePath('JS-WOLL', ORIGINS)).toBeUndefined();
  });
});

describe('describeScannedCode', () => {
  it('shows a web link by its host and path', () => {
    expect(describeScannedCode('https://www.cevi.ch/agenda?ref=plakat')).toBe('www.cevi.ch/agenda');
    expect(describeScannedCode(' https://example.com/ ')).toBe('example.com');
  });

  it('shows anything else as it was read', () => {
    expect(describeScannedCode('JS-WOLL')).toBe('JS-WOLL');
    expect(describeScannedCode('WIFI:S:Lager;T:WPA;P:geheim;;')).toBe(
      'WIFI:S:Lager;T:WPA;P:geheim;;',
    );
  });
});
