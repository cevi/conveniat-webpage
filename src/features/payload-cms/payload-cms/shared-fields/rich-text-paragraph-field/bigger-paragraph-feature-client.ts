'use client';

import { $setBlocksType } from '@lexical/selection';
import type { SerializedParagraphNode, ToolbarGroup } from '@payloadcms/richtext-lexical';
import {
  createClientFeature,
  slashMenuBasicGroupWithItems,
  toolbarTextDropdownGroupWithItems,
} from '@payloadcms/richtext-lexical/client';
import type { EditorConfig, LexicalNode } from '@payloadcms/richtext-lexical/lexical';
import {
  $applyNodeReplacement,
  $getSelection,
  $isRangeSelection,
  ParagraphNode,
} from '@payloadcms/richtext-lexical/lexical';
import { LetterText } from 'lucide-react';

/**
 * This class extends the ParagraphNode to create a BiggerParagraphNode.
 * It is used to create a paragraph with a larger font size.
 *
 * Inspired by the original ParagraphNode from Lexical:
 * https://github.com/facebook/lexical/blob/c8a365f01e7d626c0f37574ef1514cda9321099d/examples/node-replacement/src/nodes/CustomParagraphNode.ts#L15 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
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
const $isParagraphNode = (node: LexicalNode | null | undefined): node is BiggerParagraphNode => {
  return node instanceof BiggerParagraphNode;
};

/**
 * Creates a new BiggerParagraphNode instance.
 *
 * inspired by the original function from Lexical:
 * https://github.com/facebook/lexical/blob/main/packages/lexical/src/nodes/LexicalParagraphNode.ts#L171
 * */
const $createParagraphNode = (): BiggerParagraphNode => {
  return $applyNodeReplacement(new BiggerParagraphNode());
};

const toolbarGroups: ToolbarGroup[] = [
  toolbarTextDropdownGroupWithItems([
    {
      ChildComponent: LetterText,
      isActive: ({ selection }): boolean => {
        if (!$isRangeSelection(selection)) {
          return false;
        }
        for (const node of selection.getNodes()) {
          if (!$isParagraphNode(node) && !$isParagraphNode(node.getParent())) {
            return false;
          }
        }
        return true;
      },
      key: 'biggerParagraph',
      label: ({ i18n }): string => {
        return i18n.t('lexical:biggerParagraph:label2');
      },
      onSelect: ({ editor }): void => {
        editor.update(() => {
          const selection = $getSelection();
          $setBlocksType(selection, () => $createParagraphNode());
        });
      },
      order: 1,
    },
  ]),
];

export const ParagraphFeatureClient = createClientFeature({
  slashMenu: {
    groups: [
      slashMenuBasicGroupWithItems([
        {
          Icon: LetterText,
          key: 'biggerParagraph',
          label: ({ i18n }): string => {
            return i18n.t('lexical:biggerParagraph:label2');
          },
          onSelect: ({ editor }): void => {
            editor.update(() => {
              const selection = $getSelection();
              $setBlocksType(selection, () => $createParagraphNode());
            });
          },
        },
      ]),
    ],
  },
  nodes: [BiggerParagraphNode],
  toolbarFixed: {
    groups: toolbarGroups,
  },
  toolbarInline: {
    groups: toolbarGroups,
  },
});
