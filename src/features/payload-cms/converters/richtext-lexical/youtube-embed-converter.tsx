import { YoutubeEmbed } from '@/features/payload-cms/components/content-blocks/youtube-embed';
import type { SerializedBlockNode } from '@payloadcms/richtext-lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';

/**
 * The links of a YouTube block inside rich text. Drafts skip validation, so a row may be
 * missing its link or hold something other than a string.
 */
const linksOf = (fields: Record<string, unknown>): { link: string }[] => {
  const links = fields['links'];
  if (!Array.isArray(links)) return [];
  return links.flatMap((row: unknown) => {
    const link = (row as { link?: unknown } | null)?.link;
    return typeof link === 'string' && link.trim() !== '' ? [{ link: link.trim() }] : [];
  });
};

/**
 * Converts a YouTube block placed inside rich text, such as the introduction video in the
 * description of a schedule entry.
 */
export const YoutubeEmbedJSXConverter: JSXConverters<SerializedBlockNode> = {
  blocks: {
    youtubeEmbed: ({ node }: { node: SerializedBlockNode }) => {
      const links = linksOf(node.fields);
      if (links.length === 0) return <></>;
      return (
        <div className="not-prose my-4">
          <YoutubeEmbed links={links} />
        </div>
      );
    },
  },
};
