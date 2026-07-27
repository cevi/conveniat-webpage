'use client';

import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { Locale } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import React from 'react';

interface ShiftMainContentProperties {
  blocks: unknown[];
  locale: Locale;
}

/**
 * Client-safe renderer for helper shift main content blocks.
 * Avoids importing server components (PageSectionsConverter / SectionWrapper).
 */
export const ShiftMainContent: React.FC<ShiftMainContentProperties> = ({ blocks, locale }) => {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        if (block === null || block === undefined || typeof block !== 'object') {
          return;
        }

        const b = block as Record<string, unknown>;
        const blockKey = typeof b['id'] === 'string' ? b['id'] : `block-${index}`;

        if (
          b['blockType'] === 'richTextSection' &&
          b['richTextSection'] !== undefined &&
          b['richTextSection'] !== null
        ) {
          return (
            <div key={blockKey} className="prose prose-sm max-w-none">
              <LexicalRichTextSection
                richTextSection={b['richTextSection'] as SerializedEditorState}
                locale={locale}
              />
            </div>
          );
        }

        return;
      })}
    </div>
  );
};
