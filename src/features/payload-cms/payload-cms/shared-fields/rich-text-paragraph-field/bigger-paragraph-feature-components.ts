'use client';

import {
  $createParagraphNode,
  $isParagraphNode,
} from '@/features/payload-cms/payload-cms/shared-fields/rich-text-paragraph-field/bigger-paragraph-node';
import type { ToolbarGroup } from '@payloadcms/richtext-lexical';
import {
  slashMenuBasicGroupWithItems,
  toolbarTextDropdownGroupWithItems,
} from '@payloadcms/richtext-lexical/client';
import { $getSelection, $isRangeSelection } from '@payloadcms/richtext-lexical/lexical';
import { $setBlocksType } from '@payloadcms/richtext-lexical/lexical/selection';
import { LetterText } from 'lucide-react';

export const toolbarGroups: ToolbarGroup[] = [
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
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        });
      },
      order: 1,
    },
  ]),
];

export const slashMenuGroups = [
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
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        });
      },
    },
  ]),
];
