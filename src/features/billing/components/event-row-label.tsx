'use client';

import { useRowLabel } from '@payloadcms/ui';
import type React from 'react';

/**
 * Custom RowLabel component for the billing events array.
 * Renders the eventName if defined, otherwise falls back to a row number label.
 */
export const EventRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<{ eventName?: string }>();
  const customLabel = data.eventName || `Event ${String(rowNumber).padStart(2, '0')}`;
  return <div>{customLabel}</div>;
};

export default EventRowLabel;
