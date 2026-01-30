'use client';

import { useRowLabel } from '@payloadcms/ui';
import type React from 'react';

/**
 * This component is used to render the label for the row in the array field.

 * @constructor
 */
export const FormSectionRowLabel: React.FC = () => {
  const rowLabel = useRowLabel<{ formSection?: { sectionTitle?: string } }>() as
    | { data?: { formSection?: { sectionTitle?: string } } }
    | undefined;

  if (rowLabel?.data === undefined) {
    return <></>;
  }

  const customLabel = `${rowLabel.data.formSection?.sectionTitle ?? ''}`;
  return <div>Section: {customLabel}</div>;
};
