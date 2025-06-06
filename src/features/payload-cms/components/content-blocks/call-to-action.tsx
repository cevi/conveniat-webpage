import { CallToAction } from '@/components/ui/buttons/call-to-action';
import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { getURLForLinkField } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import React from 'react';

export interface CallToActionType {
  label: string;
  linkField: LinkFieldDataType;
}

export const CallToActionBlock: React.FC<CallToActionType> = ({ ...block }) => {
  const url = getURLForLinkField(block.linkField);
  return <CallToAction href={url}>{block.label}</CallToAction>;
};
