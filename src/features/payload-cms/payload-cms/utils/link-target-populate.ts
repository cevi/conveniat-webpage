import type { SelectType } from 'payload';

/**
 * What a page or blog article carries when another document links to it.
 *
 * Every populated link target goes wherever the linking document goes, which for the
 * header menu and content blocks is the public HTML of every page. Link rendering only
 * needs the URL and who may see it: `getURLForLinkField` and `hasPermissionsForLinkField`
 * in `link-field-logic.ts`, the rich text link converter and the `/go` short links read
 * `seo.urlSlug`, `_locale` and `content.permissions`, and nothing else.
 */
export const linkTargetPopulate: SelectType = {
  _locale: true,
  seo: { urlSlug: true },
  content: { permissions: true },
};
