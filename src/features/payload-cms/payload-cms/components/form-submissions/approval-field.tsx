'use client';

import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { useField, useLocale } from '@payloadcms/ui';
import type { CheckboxFieldClientProps } from 'payload';
import React, { useState } from 'react';

const modalTitleString: StaticTranslationString = {
  en: 'Confirm Approval',
  de: 'Freigabe bestätigen',
  fr: "Confirmer l'approbation",
};

const modalMessageString: StaticTranslationString = {
  en: 'Are you sure you want to approve this form submission?\n\nThis action might trigger a notification email and publish data to the webpage if configured.',
  de: 'Sind Sie sicher, dass Sie diese Formular-Antwort freigeben möchten?\n\nDiese Aktion kann eine E-Mail-Benachrichtigung auslösen und veröffentlicht die Daten auf der Website (falls konfiguriert).',
  fr: 'Êtes-vous sûr de vouloir approuver cette soumission ?\n\nCette action peut déclencher un e-mail de notification et publier les données sur le site web si configuré.',
};

const confirmButtonString: StaticTranslationString = {
  en: 'Approve',
  de: 'Freigeben',
  fr: 'Approuver',
};

const submittingString: StaticTranslationString = {
  en: 'Approving...',
  de: 'Wird freigegeben...',
  fr: 'Approbation...',
};

export const ApprovalField: React.FC<CheckboxFieldClientProps> = ({ path, field }) => {
  const { value, setValue } = useField<boolean>({ path });
  const { code } = useLocale() as { code: Config['locale'] };
  const [isModalOpen, setIsModalOpen] = useState(false);

  let label = 'Freigegeben';
  const rawLabel = field.label as unknown;
  if (typeof rawLabel === 'string') {
    label = rawLabel;
  } else if (rawLabel !== undefined && rawLabel !== null) {
    const labelObject = rawLabel as Record<string, string>;
    label = labelObject[code] ?? Object.values(labelObject)[0] ?? 'Freigegeben';
  }

  let descriptionText = '';
  const rawDesc = field.admin?.description as unknown;
  if (typeof rawDesc === 'string') {
    descriptionText = rawDesc;
  } else if (rawDesc !== undefined && rawDesc !== null) {
    const descObject = rawDesc as Record<string, string>;
    descriptionText = descObject[code] ?? Object.values(descObject)[0] ?? '';
  }

  const handleCheckboxClick = (event_: React.ChangeEvent<HTMLInputElement>): void => {
    if (event_.target.checked) {
      setIsModalOpen(true);
    } else {
      setValue(false);
    }
  };

  const handleConfirm = (): void => {
    setValue(true);
    setIsModalOpen(false);
  };

  return (
    <div className="field-type checkbox">
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        message={modalMessageString[code]}
        isSubmitting={false}
        locale={code}
        title={modalTitleString[code]}
        confirmLabel={confirmButtonString[code]}
        submittingText={submittingString[code]}
        confirmVariant="primary"
      />
      <label className="checkbox-input flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={handleCheckboxClick}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span className="checkbox-input__label font-medium">{label}</span>
      </label>
      {descriptionText.length > 0 && (
        <div className="field-description mt-1 text-xs text-gray-500">{descriptionText}</div>
      )}
    </div>
  );
};

export default ApprovalField;
