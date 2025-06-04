import { slugToUrlMapping } from '@/features/payload-cms/slug-to-url-mapping';
import type { Locale } from '@/types/types';
import type { SerializedParagraphNode } from '@payloadcms/richtext-lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';
import Link from 'next/link';

/**
 * The fields of a link node.
 */
interface LinkFields {
  url: string | unknown;
  linkType: string;
  doc: {
    value: {
      seo: {
        urlSlug: string;
      };
      _locale: Locale;
    };
    relationTo: string;
  };
}

/**
 * Resolves an internal link to the correct URL.
 * By stitching together the collection slug and the URL slug,
 * e.g. for a generic page: /page-slug, for a blog post: /blog/page-slug.
 *
 * @param fields
 *
 */
const resolveInternalLink = (fields: LinkFields): string => {
  const url = (fields.url ?? '') as string;

  const locale = fields.doc.value._locale;

  if (fields.linkType === 'internal') {
    const urlSlug = `/${fields.doc.value.seo.urlSlug}`;
    const collectionName = fields.doc.relationTo as string;

    for (const value of Object.values(slugToUrlMapping)) {
      if (value.slug === collectionName) {
        const urlPrefix = value.urlPrefix[locale as Locale];
        return `${urlPrefix}${urlSlug}`;
      }
    }
  }

  return `/${url}`;
};

const linkConverter: JSXConverters<SerializedParagraphNode>['link'] = ({ node, nodesToJSX }) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
  const children = nodesToJSX({ nodes: node.children });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const fields = node.fields as unknown as LinkFields;

  let url = (fields.url ?? '') as string;

  if (fields.linkType === 'internal') {
    url = resolveInternalLink(fields);
  }

  return (
    <Link href={url} className="text-cevi-red font-extrabold">
      {children}
    </Link>
  );
};

/**
 *
 * Converts a link node to JSX.
 * Resolves external and internal links to the correct URL.
 *
 * @param node - The link node to convert.
 * @param nodesToJSX - The function to convert the children of the link node to JSX.
 *
 */
export const LinkJSXConverter: JSXConverters<SerializedParagraphNode> = {
  link: linkConverter,
  autolink: linkConverter, // this is used to resolve copy-pasted links
};
