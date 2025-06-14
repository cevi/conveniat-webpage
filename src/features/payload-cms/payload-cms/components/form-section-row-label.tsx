'use client';

import { useRowLabel } from '@payloadcms/ui';
import type React from 'react';

/**
 * This component is used to render the label for the row in the array field.

 * @constructor
 */
export const FormSectionRowLabel: React.FC = () => {
  const { data } = useRowLabel<{ formSection: { sectionTitle?: string } }>();
  const customLabel = `${data.formSection.sectionTitle ?? ''}`;
  return <div>Section: {customLabel}</div>;
};
