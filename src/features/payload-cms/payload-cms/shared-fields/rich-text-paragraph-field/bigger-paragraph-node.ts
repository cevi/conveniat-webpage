'use client';

import type {
  EditorConfig,
  LexicalNode,
  SerializedParagraphNode,
} from '@payloadcms/richtext-lexical/lexical';
import { $applyNodeReplacement, ParagraphNode } from '@payloadcms/richtext-lexical/lexical';

/**
 * This class extends the ParagraphNode to create a BiggerParagraphNode.
 * It is used to create a paragraph with a larger font size.
 *
 * Inspired by the original ParagraphNode from Lexical:
 * https://github.com/facebook/lexical/blob/c8a365f01e7d626c0f37574ef1514cda9321099d/examples/node-replacement/src/nodes/CustomParagraphNode.ts#L15 */
export class BiggerParagraphNode extends ParagraphNode {
  static override getType(): string {
    return 'biggerParagraph';
  }

  static override clone(node: BiggerParagraphNode): BiggerParagraphNode {
    return new BiggerParagraphNode(node.__key);
  }

  override createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.style.margin = '16px 0';
    element.style.color = 'gray';
    element.style.fontWeight = 'bold';
    element.style.fontSize = '1.25rem'; // 20px
    return element;
  }

  static override importJSON(json: SerializedParagraphNode): BiggerParagraphNode {
    return $createParagraphNode().updateFromJSON(json);
  }
}

/**
 *
 * This function checks if the given node is a BiggerParagraphNode.
 *
 * inspired by the original function from Lexical:
 * https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L171
 */
export const $isParagraphNode = (
  node: LexicalNode | null | undefined,
): node is BiggerParagraphNode => {
  return node instanceof BiggerParagraphNode;
};

/**
 * Creates a new BiggerParagraphNode instance.
 *
 * inspired by the original function from Lexical:
 * https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L171
 * */
export const $createParagraphNode = (): BiggerParagraphNode => {
  return $applyNodeReplacement(new BiggerParagraphNode());
};
