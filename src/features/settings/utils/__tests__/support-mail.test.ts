import { supportMailLink } from '@/features/settings/utils/support-mail';

const bodyOf = (link: string): string =>
  decodeURIComponent(new URL(link).searchParams.get('body') ?? '');

describe('supportMailLink', () => {
  it('names the user id of a logged-in user', () => {
    const link = supportMailLink('support@example.ch', 'de', 'abc123');
    expect(link.startsWith('mailto:support@example.ch?')).toBe(true);
    expect(bodyOf(link)).toContain('Meine Benutzer-ID: abc123');
  });

  it('leaves the id line out for a guest', () => {
    expect(bodyOf(supportMailLink('support@example.ch', 'fr'))).not.toContain('ID');
  });
});
