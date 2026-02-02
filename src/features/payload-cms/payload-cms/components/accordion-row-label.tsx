'use client';

import { useRowLabel } from '@payloadcms/ui';
import type React from 'react';

interface AccordionRowData {
  title?: string;
  titleOrPortrait?: 'title' | 'portrait';
  teamLeaderGroup?: {
    name?: string;
  };
}

/**
 * This component is used to render the label for the row in the array field.
 * It displays the title when 'title' is selected, or the team leader's name when 'portrait' is selected.
 *
 * @constructor
 */
export const AccordionArrayRowLabel: React.FC = () => {
  const { data } = useRowLabel<AccordionRowData>();

  const customLabel =
    data.titleOrPortrait === 'portrait' ? (data.teamLeaderGroup?.name ?? '') : (data.title ?? '');

  return <div>Block: {customLabel}</div>;
};
