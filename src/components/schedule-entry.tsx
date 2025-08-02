'use client';

import type { Locale } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { Edit } from 'lucide-react';
import React from 'react';

export interface ScheduleEntryData {
  description: SerializedEditorState;
  locale: Locale;
}

const showEditForm = (): void => {
  // TODO.
  alert('Edit Form called.');
};

export const ScheduleEntryForm: React.FC<ScheduleEntryData> = async ({}) => {
  return (
    <>
      <div className="inline-center flex cursor-pointer" onClick={showEditForm}>
        Programm Punkt bearbeiten
        <Edit />
      </div>
    </>
  );
};
