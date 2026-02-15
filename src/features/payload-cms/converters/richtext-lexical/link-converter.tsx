import { LinkComponent } from '@/components/ui/link-component';
import type {
  Blog,
  CampMapAnnotation,
  CampScheduleEntry,
  Document,
  GenericPage,
  Image as PayloadImage,
} from '@/features/payload-cms/payload-types';
import { slugToUrlMapping } from '@/features/payload-cms/slug-to-url-mapping';
import { getLanguagePrefix } from '@/features/payload-cms/utils/get-language-prefix';
import type { Locale } from '@/types/types';
import type { SerializedParagraphNode } from '@payloadcms/richtext-lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';

/**
 * The fields of a link node.
 */
export interface LinkFields {
  url: string | undefined;
  linkType: string;
  newTab?: boolean;
  doc: {
    value:
      | string
      | Blog
      | GenericPage
      | CampMapAnnotation
      | CampScheduleEntry
      | Document
      | PayloadImage;
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

const resolveInternalLink = (fields: LinkFields, currentLocale?: Locale): string => {
  const url = fields.url ?? '';

  if (typeof fields.doc.value === 'string') {
    return `/${url}`;
  }

  const documentValue = fields.doc.value;

  if (fields.linkType === 'internal') {
    switch (fields.doc.relationTo) {
      case 'generic-page':
      case 'blog': {
        // We cast to any to access _locale because it might not be present on all types in the union
        // or the specific generated type might differ slightly.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        const locale = currentLocale ?? ((documentValue as any)._locale as Locale);
        let langPrefix = getLanguagePrefix(locale);
        langPrefix = langPrefix === '' ? '' : `${langPrefix}/`;

        // Cast to a type that has seo.urlSlug. Blog and GenericPage both have it.
        const valueWithSeo = documentValue as Blog | GenericPage;
        const urlSlug = `${valueWithSeo.seo.urlSlug}`;
        const collectionName = fields.doc.relationTo as string;
        for (const mappingValue of Object.values(slugToUrlMapping)) {
          if (mappingValue.slug === collectionName) {
            // might be undefined if locale is undefined
            const urlPrefix = mappingValue.urlPrefix[locale] as string | undefined;
            return urlPrefix === '' || urlPrefix === undefined
              ? `/${langPrefix}${urlSlug}`
              : `/${langPrefix}${urlPrefix}/${urlSlug}`;
          }
        }

        break;
      }
      case 'camp-map-annotations': {
        const campAnnotation = documentValue as CampMapAnnotation;
        return `/app/map?locationId=${campAnnotation.id}`;
      }
      case 'images':
      case 'documents': {
        const media = documentValue as Document | PayloadImage;
        return `${media.url ?? ''}`;
      }
      case 'camp-schedule-entry': {
        const entry = documentValue as CampScheduleEntry;
        return `/app/schedule/${entry.id}`;
      }
      default: {
        console.warn(`Unhandled link relationTo: ${fields.doc.relationTo}`);
        if (typeof globalThis !== 'undefined') {
          void import('posthog-js').then(({ default: posthog }) => {
            posthog.capture('rich_text_link_unhandled_relation', {
              relationTo: fields.doc.relationTo,
            });
          });
        }
      }
    }
  }

  return `/${url}`;
};

const createLinkConverter =
  (locale?: Locale): JSXConverters<SerializedParagraphNode>['link'] =>
  ({ node, nodesToJSX }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const children = nodesToJSX({ nodes: node.children });

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const fields = node.fields as unknown as LinkFields;

      let url = fields.url ?? '';

      if (fields.linkType === 'internal') {
        url = resolveInternalLink(fields, locale);
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
    } catch (error) {
      console.error('Error converting link node:', error);
      if (typeof globalThis !== 'undefined') {
        void import('posthog-js').then(({ default: posthog }) => {
          posthog.captureException(error);
        });
      }
      return <>{children}</>;
    }
  };

/**
 *
 * Converts a link node to JSX.
 * Resolves external and internal links to the correct URL.
 *
 * @param locale - The locale used for resolving internal links.
 *
 */
export const getLinkJSXConverter = (locale?: Locale): JSXConverters<SerializedParagraphNode> => {
  const linkConverter = createLinkConverter(locale);
  return {
    link: linkConverter,
    autolink: linkConverter, // this is used to resolve copy-pasted links
  };
};

export const LinkJSXConverter = getLinkJSXConverter();
