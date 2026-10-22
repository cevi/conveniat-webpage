import { readChatInvitePath } from '@/features/chat/utils/chat-invite-link';

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
