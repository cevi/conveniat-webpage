interface RichTextChild {
  text: string;
}
interface RichTextParagraph {
  children: RichTextChild[];
}
interface RichTextRoot {
  children: RichTextParagraph[];
}
export interface RichTextSection {
  root: RichTextRoot;
}
interface ContentBlock {
  blockType: string;
  richTextSection?: RichTextSection;
}

export const extractRichTextContent = (mainContent: ContentBlock[]): string => {
  let searchContent = '';
  for (const block of mainContent) {
    if (block.blockType === 'richTextSection' && block.richTextSection) {
      const richTextSection = block.richTextSection;
      const text = richTextSection.root.children.map((paragraph) => {
        const paragraphText = paragraph.children.map((child) => child.text || '');
        return paragraphText.join(' ');
      });
      searchContent += text.join(' ');
    }
  }
  return searchContent;
};
