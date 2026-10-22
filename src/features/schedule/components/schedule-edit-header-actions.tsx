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
  /** the look of the round buttons: white and floating over the map */
  buttonClassName: string;
  /** shown before the star, such as sharing */
  before?: React.ReactNode;
}

/**
 * The buttons over the top of a block's page: editing for its organisers, then sharing and the
 * star, and while editing the way out and saving.
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
  buttonClassName,
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
            className="bg-conveniat-green flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.16)] transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
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
