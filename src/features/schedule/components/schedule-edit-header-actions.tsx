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
  /** the look of the round buttons, such as white and floating over a map */
  buttonClassName?: string;
  /** shown before the star, such as sharing */
  before?: React.ReactNode;
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
  buttonClassName = 'hover:bg-quiet flex h-11 w-11 items-center justify-center rounded-full text-green-900 transition-colors',
  before,
}) => {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {isAdmin && !isEditing && (
        <button
          type="button"
          onClick={onStartEdit}
          className={buttonClassName}
          aria-label={labels.edit[locale]}
        >
          <Edit className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      {isEditing && (
        <>
          <button
            type="button"
            onClick={onCancelEdit}
            className={buttonClassName}
            aria-label={labels.cancel[locale]}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="bg-conveniat-green hover:bg-conveniat-green-dark flex h-11 items-center gap-1 rounded-full px-4 text-sm font-medium text-white shadow-[0_2px_8px_rgba(0,0,0,0.16)] transition-colors disabled:opacity-50"
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
      {before}
      <DetailStarButton entryId={entryId} className={buttonClassName} />
    </div>
  );
};
