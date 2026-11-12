import {
  accessDeniedContentSecurityPolicy,
  buildAccessDeniedHtml,
} from '@/features/payload-cms/utils/access-denied-page';
import { createHash } from 'node:crypto';

const inlineScripts = (html: string): string[] =>
  [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? '');

describe('access denied page', () => {
  it('lets the CSP run every inline script of the page, so the login button works', () => {
    const scripts = inlineScripts(buildAccessDeniedHtml('de'));
    expect(scripts).toHaveLength(1);

    for (const script of scripts) {
      const hash = createHash('sha256').update(script).digest('base64');
      expect(accessDeniedContentSecurityPolicy).toContain(`'sha256-${hash}'`);
    }
  });

  it('allows no script beyond the hashed one', () => {
    const scriptSource = accessDeniedContentSecurityPolicy
      .split('; ')
      .find((directive) => directive.startsWith('script-src'));
    expect(scriptSource).toMatch(/^script-src 'sha256-[A-Za-z0-9+/=]+'$/);
  });
});
