import type { Permission } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { isPermissionPublic } from '@/utils/has-permissions';

type Localized<T> = Partial<Record<Locale, T | null>> | null;

/**
 * A page read with `locale: 'all'` and its permission populated. Every field is
 * optional, because a document that was only ever saved as a draft skipped validation.
 */
export interface LlmsSourceDocument {
  _localized_status?: Localized<{ published?: boolean }>;
  content?: {
    pageTitle?: Localized<string>;
    permissions?: string | Permission | null;
  } | null;
  seo?: {
    urlSlug?: Localized<string>;
    metaDescription?: Localized<string>;
  } | null;
}

export interface LlmsLink {
  title: string;
  url: string;
  description?: string;
}

export interface LlmsSection {
  heading: string;
  links: LlmsLink[];
}

/** Titles and descriptions are free text from the CMS, a line break would end the list item. */
const toSingleLine = (text: string): string => text.replaceAll(/\s+/g, ' ').trim();

/**
 * Whether a visitor without a login may open the document, the same answer `hasPermissions`
 * gives for a missing session. A permission that was not populated is treated as restricted.
 */
const isOpenToEveryone = (permission: string | Permission | null | undefined): boolean => {
  if (permission === undefined || permission === null) return true;
  return typeof permission === 'object' && isPermissionPublic(permission);
};

/**
 * Reduces the generic pages to the links llms.txt may list: published, open
 * without a login, one link per document in the first locale it is published in.
 *
 * @param documents - documents read with `locale: 'all'` and `depth: 1`
 * @param options.locales - the locales the deployment serves, in order of preference
 * @param options.defaultLocale - the locale served without a prefix in the URL
 */
export const toLlmsLinks = (
  documents: LlmsSourceDocument[],
  options: { hostUrl: string; locales: Locale[]; defaultLocale: Locale },
): LlmsLink[] => {
  const { hostUrl, locales, defaultLocale } = options;
  const links: LlmsLink[] = [];

  for (const document_ of documents) {
    if (!isOpenToEveryone(document_.content?.permissions)) continue;

    const locale = locales.find(
      (candidate) => document_._localized_status?.[candidate]?.published === true,
    );
    if (locale === undefined) continue;

    const slug = document_.seo?.urlSlug?.[locale];
    const title = document_.content?.pageTitle?.[locale];
    if (typeof slug !== 'string' || typeof title !== 'string' || title.trim() === '') continue;

    const description = document_.seo?.metaDescription?.[locale];
    const path = [locale === defaultLocale ? '' : locale, slug].filter((segment) => segment !== '');

    links.push({
      title,
      url: [hostUrl, ...path].join('/'),
      ...(typeof description === 'string' && description.trim() !== '' ? { description } : {}),
    });
  }

  // the landing page has an empty slug and therefore the shortest URL
  return links.toSorted((a, b) => a.url.localeCompare(b.url));
};

/**
 * Renders the llms.txt format (https://llmstxt.org): an H1 with the site name, a blockquote
 * summary, then one H2 section per group of links, each link with an optional description.
 */
export const renderLlmsTxt = (site: {
  title: string;
  description?: string;
  sections: LlmsSection[];
}): string => {
  const lines: string[] = [`# ${toSingleLine(site.title)}`, ''];

  if (site.description !== undefined && site.description.trim() !== '') {
    lines.push(`> ${toSingleLine(site.description)}`, '');
  }

  for (const { heading, links } of site.sections) {
    if (links.length === 0) continue;
    lines.push(`## ${heading}`, '');
    for (const { title, url, description } of links) {
      // a closing bracket in the title would end the link text early
      const text = toSingleLine(title).replaceAll('[', '(').replaceAll(']', ')');
      const link = `- [${text}](${url})`;
      lines.push(description === undefined ? link : `${link}: ${toSingleLine(description)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
};
