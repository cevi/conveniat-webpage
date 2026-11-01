jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { APP_HOST_URL: 'https://conveniat27.ch' },
}));

import {
  composeEmailBody,
  DEFAULT_EMAIL_SIGNATURE,
  htmlToPlainText,
} from '@/features/payload-cms/payload-cms/utils/email-body';
import type { Payload } from 'payload';

const payloadWithSignature = (stored: Record<string, unknown>): Payload =>
  ({
    findGlobal: jest.fn().mockResolvedValue(stored),
    logger: { error: jest.fn() },
  }) as unknown as Payload;

describe('composeEmailBody', () => {
  it('sends a text mail with an HTML part too, the signature filled in both', async () => {
    const body = await composeEmailBody(payloadWithSignature({}), {
      text: 'Liebe Lea\n\nAnbei deine Rechnung.\n\nFreundliche Grüsse\n\n{{signatur :: Ressort Finanzen}}',
    });

    expect(body.text).toBe(
      [
        'Liebe Lea',
        '',
        'Anbei deine Rechnung.',
        '',
        'Freundliche Grüsse',
        '',
        'conveniat27',
        'Ressort Finanzen',
        '',
        'WhatsApp: +41 27 510 25 00',
        'E-Mail: admin.conveniat27@cevi.ch',
        'Web: www.conveniat27.ch',
      ].join('\n'),
    );
    expect(body.html).toContain('<p>Liebe Lea</p>');
    expect(body.html).toContain('href="https://wa.me/41275102500"');
    expect(body.html).toContain('href="mailto:admin.conveniat27@cevi.ch"');
    expect(body.html).toContain('src="https://conveniat27.ch/logo-conveniat27.png"');
    // the table replaces its paragraph instead of sitting in it
    expect(body.html).not.toMatch(/<p>\s*<table/);
  });

  it('sends an HTML mail with a text part too', async () => {
    const body = await composeEmailBody(payloadWithSignature({ email: 'kontakt@example.ch' }), {
      html: '<div><p>Danke für deine Anmeldung, <a href="https://conveniat27.ch/besuchstag">hier</a> die Infos.</p><p>{{signatur}}</p></div>',
    });

    expect(body.text).toBe(
      [
        'Danke für deine Anmeldung, hier (https://conveniat27.ch/besuchstag) die Infos.',
        '',
        'conveniat27',
        '',
        'WhatsApp: +41 27 510 25 00',
        'E-Mail: kontakt@example.ch',
        'Web: www.conveniat27.ch',
      ].join('\n'),
    );
    expect(body.html).toContain('href="mailto:kontakt@example.ch"');
  });

  it('leaves a mail without the placeholder as it was written, and does not read the signature', async () => {
    const payload = payloadWithSignature({});

    const body = await composeEmailBody(payload, { html: '<p>Hallo</p>', text: 'Hallo' });

    expect(body).toEqual({ html: '<p>Hallo</p>', text: 'Hallo' });
    expect(payload.findGlobal).not.toHaveBeenCalled();
  });

  it('escapes what an editor writes into the signature', async () => {
    const body = await composeEmailBody(payloadWithSignature({ name: 'Q & A <Team>' }), {
      text: '{{signatur}}',
    });

    expect(body.html).toContain('Q &amp; A &lt;Team&gt;');
  });

  it('uses the official value for a field left empty', async () => {
    const body = await composeEmailBody(payloadWithSignature({ whatsapp: '  ' }), {
      text: '{{signatur}}',
    });

    expect(body.text).toContain(`WhatsApp: ${DEFAULT_EMAIL_SIGNATURE.whatsapp}`);
  });
});

describe('htmlToPlainText', () => {
  it('keeps line breaks, sets paragraphs apart, lists items and decodes entities', () => {
    expect(htmlToPlainText('<p>A &amp; B<br>C</p><ul><li>eins</li><li>zwei</li></ul>')).toBe(
      'A & B\nC\n\n- eins\n- zwei',
    );
  });
});
