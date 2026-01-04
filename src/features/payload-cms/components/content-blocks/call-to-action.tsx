import { CallToAction } from '@/components/ui/buttons/call-to-action';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { getURLForLinkField } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Locale } from '@/types/types';
import React from 'react';

export interface CallToActionType {
  label: string;
  linkField: LinkFieldDataType;
  inverted: boolean;
  locale: Locale;
}

export const CallToActionBlock: React.FC<CallToActionType> = ({ locale, ...block }) => {
  const url = getURLForLinkField(block.linkField, locale);
  return (
    <CallToAction href={url} inverted={block.inverted}>
      {block.label}
    </CallToAction>
  );
};
