import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { MessageField } from '@payloadcms/plugin-form-builder/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import type React from 'react';

export const Message: React.FC<MessageField> = ({ message }) => {
  return (
    <div className="mb-4">
      <LexicalRichTextSection richTextSection={message as SerializedEditorState} />
    </div>
  );
};
