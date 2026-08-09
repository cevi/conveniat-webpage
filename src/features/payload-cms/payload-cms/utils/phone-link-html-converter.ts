import { escapeHTML } from '@/features/payload-cms/payload-cms/utils/html-utils';
import { phoneNumberToTelHref } from '@/features/payload-cms/utils/phone-number';
import {
  defaultHTMLConverters,
  type HTMLConverter,
  type HTMLConverters,
} from '@payloadcms/richtext-lexical/html';
import type { SerializedLexicalNode } from '@payloadcms/richtext-lexical/lexical';

interface CustomLinkNode extends SerializedLexicalNode {
  fields?: { linkType?: string; phoneNumber?: string; url?: string };
  children?: SerializedLexicalNode[];
}

const defaultLinkConverter = defaultHTMLConverters.link as unknown as Exclude<
  HTMLConverter<CustomLinkNode>,
  string
>;

/**
 * Renders rich text links with `linkType: 'phone'` as `tel:` anchors, all other
 * link types are handled by payload's default converter.
 *
 * Spread this after `defaultHTMLConverters` when converting lexical to HTML,
 * e.g. for the emails sent by the form builder.
 */
const phoneLinkConverter: Exclude<HTMLConverter<CustomLinkNode>, string> = (arguments_) => {
  const { node, nodesToHTML, converters, parent } = arguments_;

  if (node.fields?.linkType !== 'phone') {
    return defaultLinkConverter(arguments_);
  }

  const children = nodesToHTML({
    converters,
    nodes: node.children ?? [],
    parent: { ...node, parent },
  }).join('');

  const telHref = phoneNumberToTelHref(node.fields.phoneNumber ?? '');
  if (telHref === '') return children;

  return `<a href="${escapeHTML(telHref)}">${children}</a>`;
};

export const phoneLinkHTMLConverters: HTMLConverters = {
  link: phoneLinkConverter,
};
