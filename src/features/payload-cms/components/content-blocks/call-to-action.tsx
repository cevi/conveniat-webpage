import { CallToAction } from '@/components/ui/buttons/call-to-action';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { getURLForLinkField } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import React from 'react';

export interface CallToActionType {
  label: string;
  linkField: LinkFieldDataType;
  inverted: boolean;
}

export const CallToActionBlock: React.FC<CallToActionType> = async ({ ...block }) => {
  const locale = await getLocaleFromCookies();

  const url = getURLForLinkField(block.linkField, locale);
  return (
    <CallToAction href={url} inverted={block.inverted}>
      {block.label}
    </CallToAction>
  );
};
