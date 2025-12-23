import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/confirmation-modal';
import { toast } from '@/lib/toast';
import type { StaticTranslationString } from '@/types/types';
import { Button, useForm, useLocale } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState } from 'react';

const confirmationMessage: StaticTranslationString = {
  en: 'Are you sure you want to apply these feature flag settings?',
  de: 'Sind Sie sicher, dass Sie diese Feature-Flag-Einstellungen anwenden möchten?',
  fr: 'Êtes-vous sûr de vouloir appliquer ces paramètres de feature flag?',
};

const modalTitle: StaticTranslationString = {
  en: 'Confirm Feature Flags',
  de: 'Feature-Flags bestätigen',
  fr: 'Confirmer les Feature Flags',
};

const saveLabel: StaticTranslationString = {
  en: 'Save',
  de: 'Speichern',
  fr: 'Enregistrer',
};

const savingLabel: StaticTranslationString = {
  en: 'Saving...',
  de: 'Speichern...',
  fr: 'Enregistrement...',
};

export const AppFeatureFlagsActions: React.FC = () => {
  const locale = useLocale();
  const router = useRouter();
  const localeCode = locale.code as 'en' | 'de' | 'fr';

  // Access the form context to get states.
  const { getData, submit } = useForm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changesSummary, setChangesSummary] = useState<string>('');

  const handleSaveClick = useCallback(() => {
    const data = getData();

    const summaryLines: string[] = [];
    const booleanFlags = [
      { key: 'globalMessagingEnabled', label: 'Global Messaging' },
      { key: 'createChatsEnabled', label: 'Create Chats' },
    ];

    for (const flag of booleanFlags) {
      const val = (data as Record<string, unknown>)[flag.key];
      summaryLines.push(`${flag.label}: ${val ? 'ENABLED' : 'DISABLED'}`);
    }

    setChangesSummary(summaryLines.join('\n'));
    setIsModalOpen(true);
  }, [getData]);

  const handleConfirmSave = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await submit();
      toast.success('Feature flags updated successfully');
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update feature flags');
    } finally {
      setIsSubmitting(false);
    }
  }, [submit, router]);

  return (
    <div className="flex items-center gap-4">
      <Button onClick={handleSaveClick} disabled={isSubmitting}>
        {saveLabel[localeCode]}
      </Button>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmSave}
        message={`${confirmationMessage[localeCode]}\n\n${changesSummary}`}
        isSubmitting={isSubmitting}
        locale={localeCode}
        title={modalTitle[localeCode]}
        confirmLabel={saveLabel[localeCode]}
        submittingText={savingLabel[localeCode]}
        confirmVariant="primary"
      />
    </div>
  );
};
