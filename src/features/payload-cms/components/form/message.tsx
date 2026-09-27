'use client';

import AccordionItem from '@/features/payload-cms/components/accordion/accordion-item';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { MessageField } from '@payloadcms/plugin-form-builder/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import type React from 'react';
import { useId, useState } from 'react';

/**
 * A text between the fields. With a collapsible title it starts folded under it, the way an
 * accordion on a page does, for what someone only needs now and then.
 */
export const Message: React.FC<MessageField & { collapsibleTitle?: string | null }> = ({
  message,
  collapsibleTitle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const accordionId = useId();
  const text = <LexicalRichTextSection richTextSection={message as SerializedEditorState} />;

  if (typeof collapsibleTitle !== 'string' || collapsibleTitle.trim() === '') {
    return <div className="mb-4">{text}</div>;
  }
  return (
    <div className="mb-4">
      <AccordionItem
        titleElement={
          <span className="font-body text-sm font-semibold text-gray-700">{collapsibleTitle}</span>
        }
        showChevron
        accordionId={accordionId}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((expanded) => !expanded)}
        isNested
      >
        {isExpanded && text}
      </AccordionItem>
    </div>
  );
};
