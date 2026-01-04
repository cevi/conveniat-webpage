'use client';

import { DetailStarButton } from '@/features/schedule/components/detail-star-button';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Check, Edit, Loader2, X } from 'lucide-react';
import type React from 'react';

const labels = {
  edit: { de: 'Bearbeiten', en: 'Edit', fr: 'Modifier' },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
  save: { de: 'Speichern', en: 'Save', fr: 'Enregistrer' },
} satisfies Record<string, StaticTranslationString>;

interface ScheduleEditHeaderActionsProperties {
  entryId: string;
  locale: Locale;
  isAdmin: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
}

/**
 * Shared header actions for schedule detail edit mode.
 * Used by both standalone and modal schedule detail views.
 */
export const ScheduleEditHeaderActions: React.FC<ScheduleEditHeaderActionsProperties> = ({
  entryId,
  locale,
  isAdmin,
  isEditing,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSave,
}) => {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {isAdmin && !isEditing && (
        <button
          type="button"
          onClick={onStartEdit}
          className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          aria-label={labels.edit[locale]}
        >
          <Edit className="h-5 w-5 text-gray-700" />
        </button>
      )}
      {isEditing && (
        <>
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            aria-label={labels.cancel[locale]}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="bg-conveniat-green hover:bg-conveniat-green-dark flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {labels.save[locale]}
          </button>
        </>
      )}
      <DetailStarButton entryId={entryId} />
    </div>
  );
};
