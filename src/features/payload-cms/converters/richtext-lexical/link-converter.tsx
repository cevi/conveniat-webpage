import { LinkComponent } from '@/components/ui/link-component';
import { slugToUrlMapping } from '@/features/payload-cms/slug-to-url-mapping';
import { getLanguagePrefix } from '@/features/payload-cms/utils/get-language-prefix';
import type { Locale } from '@/types/types';
import type { SerializedParagraphNode } from '@payloadcms/richtext-lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';

/**
 * The fields of a link node.
 */
interface LinkFields {
  url: string | undefined;
  linkType: string;
  newTab?: boolean;
  doc: {
    value: {
      seo: {
        urlSlug: string;
      };
      _locale: Locale;
      id?: string;
      url?: string; // images, documents
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
  const url = fields.url ?? '';

  const locale = fields.doc.value._locale;
  let langPrefix = getLanguagePrefix(locale);
  langPrefix = langPrefix === '' ? '' : `${langPrefix}/`;

  if (fields.linkType === 'internal') {
    switch (fields.doc.relationTo) {
      case 'generic-page':
      case 'blog': {
        const urlSlug = `${fields.doc.value.seo.urlSlug}`;
        const collectionName = fields.doc.relationTo as string;
        for (const value of Object.values(slugToUrlMapping)) {
          if (value.slug === collectionName) {
            // might be undefined if locale is undefined
            const urlPrefix = value.urlPrefix[locale] as string | undefined;
            return urlPrefix === '' || urlPrefix === undefined
              ? `/${langPrefix}${urlSlug}`
              : `/${langPrefix}${urlPrefix}/${urlSlug}`;
          }
        }

        break;
      }
      case 'camp-map-annotations': {
        const campAnnotationId = fields.doc.value.id;
        if (campAnnotationId == undefined) return `/${url}`;
        return `/app/map?locationId=${campAnnotationId}`;
      }
      case 'images':
      case 'documents': {
        // for media files, we just return the URL as is
        return `${fields.doc.value.url}`;
      }
      case 'camp-schedule-entry': {
        return `/app/schedule/${fields.doc.value.id}`;
      }
      default:
      // No default
    }
  }

  return `/${url}`;
};

const linkConverter: JSXConverters<SerializedParagraphNode>['link'] = ({ node, nodesToJSX }) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
  const children = nodesToJSX({ nodes: node.children });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const fields = node.fields as unknown as LinkFields;

  let url = fields.url ?? '';

  if (fields.linkType === 'internal') {
    url = resolveInternalLink(fields);
  }

  return (
    <LinkComponent
      href={url}
      className="font-extrabold text-red-600"
      openInNewTab={fields.newTab ?? false}
    >
      {children}
    </LinkComponent>
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
