'use client';

import { useRowLabel } from '@payloadcms/ui';
import type React from 'react';

/**
 * This component is used to render the label for the row in the array field.

 * @constructor
 */
export const AccordionArrayRowLabel: React.FC = () => {
  const { data } = useRowLabel<{ title?: string }>();
  const customLabel = `${data.title ?? ''}`;
  return <div>Block: {customLabel}</div>;
};
