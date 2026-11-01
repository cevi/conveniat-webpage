import { environmentVariables } from '@/config/environment-variables';
import type { Payload } from 'payload';

/** What the official signature shows, from the `email-signature` global. */
export interface EmailSignature {
  name: string;
  whatsapp: string;
  email: string;
  website: string;
}

export const DEFAULT_EMAIL_SIGNATURE: EmailSignature = {
  name: 'conveniat27',
  whatsapp: '+41 27 510 25 00',
  email: 'admin.conveniat27@cevi.ch',
  website: 'www.conveniat27.ch',
};

/**
 * `{{signatur}}`, or `{{signatur :: Ressort Finanzen}}` with the line under the name. Written
 * anywhere in a mail an editor maintains: the forms' emails as well as the billing's texts.
 */
const SIGNATURE_PLACEHOLDER = String.raw`\{\{\s*signatur\s*(?:::\s*([^}]*?))?\s*\}\}`;

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const decodeHtml = (value: string): string =>
  value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');

const roleOf = (match: unknown): string | undefined => {
  const role = typeof match === 'string' ? decodeHtml(match).trim() : '';
  return role === '' ? undefined : role;
};

const withProtocol = (website: string): string =>
  /^https?:\/\//i.test(website) ? website : `https://${website}`;

/** The digits wa.me wants: the number in international form without plus or spaces. */
const whatsappLink = (number: string): string => `https://wa.me/${number.replaceAll(/\D/g, '')}`;

/**
 * The signature as in the guide of the Projektgruppe: name, the optional line under it and the
 * contact lines on the left, the logo on the right. A table with inline styles, the one layout
 * every mail program keeps.
 */
export const renderSignatureHtml = (signature: EmailSignature, role?: string): string => {
  const line = (label: string, value: string, href: string): string =>
    value === ''
      ? ''
      : `${label}: <a href="${escapeHtml(href)}" style="color:#47564c;">${escapeHtml(value)}</a><br>`;
  const logo = `${environmentVariables.APP_HOST_URL}/logo-conveniat27.png`;
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#333333;">',
    '<tr>',
    '<td style="padding:0 24px 0 0;vertical-align:top;">',
    `<strong style="color:#555555;">${escapeHtml(signature.name)}</strong><br>`,
    role === undefined ? '' : `${escapeHtml(role)}<br>`,
    '<br>',
    line('WhatsApp', signature.whatsapp, whatsappLink(signature.whatsapp)),
    line('E-Mail', signature.email, `mailto:${signature.email}`),
    line('Web', signature.website, withProtocol(signature.website)),
    '</td>',
    `<td style="vertical-align:middle;"><img src="${escapeHtml(logo)}" width="120" alt="conveniat27" style="display:block;width:120px;height:auto;border:0;"></td>`,
    '</tr>',
    '</table>',
  ].join('');
};

/** The same signature for the text part of a mail. */
export const renderSignatureText = (signature: EmailSignature, role?: string): string =>
  [
    signature.name,
    role,
    '',
    signature.whatsapp === '' ? undefined : `WhatsApp: ${signature.whatsapp}`,
    signature.email === '' ? undefined : `E-Mail: ${signature.email}`,
    signature.website === '' ? undefined : `Web: ${signature.website}`,
  ]
    .filter((line) => line !== undefined)
    .join('\n');

/**
 * Fills every `{{signatur}}` of an HTML body. One standing alone in a paragraph replaces the
 * paragraph, as a table must not sit inside one.
 */
export const fillSignatureHtml = (html: string, signature: EmailSignature): string =>
  html
    .replaceAll(
      new RegExp(String.raw`<p[^>]*>\s*${SIGNATURE_PLACEHOLDER}\s*</p>`, 'gi'),
      (_match, role) => renderSignatureHtml(signature, roleOf(role)),
    )
    .replaceAll(new RegExp(SIGNATURE_PLACEHOLDER, 'gi'), (_match, role) =>
      renderSignatureHtml(signature, roleOf(role)),
    );

/** Fills every `{{signatur}}` of a text body. */
export const fillSignatureText = (text: string, signature: EmailSignature): string =>
  text.replaceAll(new RegExp(SIGNATURE_PLACEHOLDER, 'gi'), (_match, role) =>
    renderSignatureText(signature, roleOf(role)),
  );

export const hasSignaturePlaceholder = (body: string | undefined): boolean =>
  body !== undefined && new RegExp(SIGNATURE_PLACEHOLDER, 'i').test(body);

/** A text body as HTML: paragraphs at blank lines, line breaks kept, nothing interpreted. */
export const plainTextToHtml = (text: string): string =>
  text
    .replaceAll('\r\n', '\n')
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`)
    .join('\n');

/**
 * An HTML body as text, for the text part of a mail: blocks become lines, a link keeps its
 * address in brackets, a table row becomes a line.
 */
export const htmlToPlainText = (html: string): string =>
  decodeHtml(
    html
      .replaceAll(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replaceAll(
        /<a\s[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
        (_match, href, label) => {
          const text = String(label).replaceAll(/<[^>]+>/g, '');
          const address = String(href).replace(/^mailto:/i, '');
          return text.trim() === '' || text.trim() === address ? address : `${text} (${address})`;
        },
      )
      .replaceAll(/<br\s*\/?>/gi, '\n')
      .replaceAll(/<li[^>]*>/gi, '- ')
      // a paragraph ends with a blank line, as people write them in text
      .replaceAll(/<\/(p|h[1-6]|table|ul|ol)>/gi, '\n\n')
      .replaceAll(/<\/(div|li|tr)>/gi, '\n')
      .replaceAll(/<\/t[dh]>/gi, '  ')
      .replaceAll(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();

/** Reads the signature, falling back to the official one for every field left empty. */
export const loadEmailSignature = async (payload: Payload): Promise<EmailSignature> => {
  const stored = await payload
    .findGlobal({ slug: 'email-signature', depth: 0, overrideAccess: true })
    .catch((error: unknown) => {
      payload.logger.error({ err: error }, 'Email signature could not be read, using the default.');
    });
  const field = (key: keyof EmailSignature): string => {
    const value = stored?.[key];
    return typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : DEFAULT_EMAIL_SIGNATURE[key];
  };
  return {
    name: field('name'),
    whatsapp: field('whatsapp'),
    email: field('email'),
    website: field('website'),
  };
};

/**
 * The two parts every mail leaves with, HTML and text, from whichever one it was written in,
 * with its `{{signatur}}` filled in both. Sending both is what mail programs, screen readers and
 * spam filters expect; a mail with HTML only scores worse.
 */
export const composeEmailBody = async (
  payload: Payload,
  body: { html?: string | undefined; text?: string | undefined },
): Promise<{ html?: string; text?: string }> => {
  const hasHtml = typeof body.html === 'string' && body.html !== '';
  const hasText = typeof body.text === 'string' && body.text !== '';
  if (!hasHtml && !hasText) return {};
  const html = hasHtml ? (body.html as string) : plainTextToHtml(body.text as string);
  const text = hasText ? (body.text as string) : htmlToPlainText(body.html as string);
  if (!hasSignaturePlaceholder(html) && !hasSignaturePlaceholder(text)) return { html, text };
  const signature = await loadEmailSignature(payload);
  return { html: fillSignatureHtml(html, signature), text: fillSignatureText(text, signature) };
};
