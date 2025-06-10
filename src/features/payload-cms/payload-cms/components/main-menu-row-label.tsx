'use client';

import { useRowLabel } from '@payloadcms/ui';
import type React from 'react';

/**
 * This component is used to render the label for the row in the array field.

 * @constructor
 */
export const MainEntryRowLabel: React.FC = () => {
  const { data } = useRowLabel<{ label?: string }>();
  const customLabel = `${data.label ?? ''}`;
  return <div>{customLabel}</div>;
};
