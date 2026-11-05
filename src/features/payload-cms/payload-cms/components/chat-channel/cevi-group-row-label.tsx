'use client';

import { useRowLabel } from '@payloadcms/ui';
import type React from 'react';

/** Names a row of a channel's Cevi.DB groups after the group, with its ID. */
export const CeviGroupRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<{ groupId?: number | null; groupName?: string | null }>();
  const name = data.groupName?.trim() ?? '';
  const id = typeof data.groupId === 'number' ? String(data.groupId) : '';
  if (name !== '' && id !== '') return <span>{`${name} (${id})`}</span>;
  if (name !== '' || id !== '') return <span>{name === '' ? id : name}</span>;
  return <span>{String((rowNumber ?? 0) + 1).padStart(2, '0')}</span>;
};
