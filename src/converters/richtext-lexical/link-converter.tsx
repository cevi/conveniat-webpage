import { JSXConverters } from '@payloadcms/richtext-lexical/react';
import { SerializedParagraphNode } from '@payloadcms/richtext-lexical';
import Link from 'next/link';
import { routeResolutionTable } from '@/route-resolution-table';

/**
 * The fields of a link node.
 */
type LinkFields = {
  url: string | unknown;
  linkType: string;
  doc: {
    value: {
      seo: {
        urlSlug: string;
      };
    };
    relationTo: string;
  };
};

/**
 * Resolves an internal link to the correct URL.
 * By stitching together the collection slug and the URL slug,
 * e.g. for a generic page: /page-slug, for a blog post: /blog/page-slug.
 *
 * @param fields
 *
 */
const resolveInternalLink = (fields: LinkFields): string => {
  let url = (fields.url ?? '') as string;

  if (fields.linkType === 'internal') {
    const urlSlug = `/${fields.doc.value.seo.urlSlug}`;
    const collectionName = fields.doc.relationTo as string;

    for (const [key, value] of Object.entries(routeResolutionTable)) {
      if (value.collectionSlug === collectionName) {
        url = key === '' ? urlSlug : collectionName + urlSlug;
        break;
      }
    }
  }

  return url;
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
  link: ({ node, nodesToJSX }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const children = nodesToJSX({ nodes: node.children });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const fields = node.fields as unknown as LinkFields;

    let url = (fields.url ?? '') as string;

    if (fields.linkType === 'internal') {
      url = resolveInternalLink(fields);
    }

    return (
      <Link href={url} className="font-extrabold text-cevi-red">
        {children}
      </Link>
    );
  },
};
