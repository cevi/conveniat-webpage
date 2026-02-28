'use client';

import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import type { Config } from '@/features/payload-cms/payload-types';
import { Button, useDocumentInfo, useForm, useLocale } from '@payloadcms/ui';
import { Play } from 'lucide-react';
import React, { useState } from 'react';

const triggerWorkflowsLabel: Record<string, string> = {
  en: 'Trigger Workflows Manually',
  de: 'Workflows manuell auslösen',
  fr: 'Déclencher les workflows manuellement',
};

const triggerWorkflowsDescription: Record<string, string> = {
  en: 'Use this button to manually enqueue and run all configured workflows for past submissions of this form. Workflows that were already executed successfully will be skipped.',
  de: 'Verwenden Sie diese Schaltfläche, um alle konfigurierten Workflows für vergangene Einreichungen dieses Formulars manuell in die Warteschlange zu stellen und auszuführen. Workflows, die bereits erfolgreich ausgeführt wurden, werden übersprungen.',
  fr: 'Utilisez ce bouton pour mettre en file d’attente et exécuter manuellement tous les workflows configurés pour les soumissions passées de ce formulaire. Les workflows déjà exécutés avec succès seront ignorés.',
};

const triggeringText: Record<string, string> = {
  en: 'Triggering...',
  de: 'Wird ausgelöst...',
  fr: 'Déclenchement en cours...',
};

const triggerButtonTitle: Record<string, string> = {
  en: 'Trigger Workflows for Past Submissions',
  de: 'Workflows für vergangene Einreichungen auslösen',
  fr: 'Déclencher les workflows pour les soumissions passées',
};

const triggerConfirmModalMessage: Record<string, string> = {
  en: 'Are you sure you want to manually trigger all configured workflows for past submissions of this form? Workflows that have already been executed successfully will be skipped.',
  de: 'Sind Sie sicher, dass Sie alle konfigurierten Workflows für vergangene Einreichungen manuell auslösen möchten? Bereits erfolgreich durchgeführte Workflows werden übersprungen.',
  fr: 'Êtes-vous sûr de vouloir déclencher manuellement tous les workflows configurés pour les soumissions passées de ce formulaire ? Les workflows ayant déjà été exécutés avec succès seront ignorés.',
};

const triggerConfirmLabel: Record<string, string> = {
  en: 'Trigger',
  de: 'Auslösen',
  fr: 'Déclencher',
};

export const TriggerWorkflowsButton: React.FC = () => {
  const { id } = useDocumentInfo();
  const { getData } = useForm();
  const { code } = useLocale();
  const data = getData();
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (id === undefined) return <></>; // We are likely creating a new form

  const handleTriggerWorkflows = async (): Promise<void> => {
    try {
      setLoading(true);
      setResultMessage(undefined);

      const response = await fetch(`/api/forms/${String(id)}/trigger-workflows`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to trigger workflows');
      }

      const json = (await response.json()) as { count?: number; message?: string };
      setResultMessage(json.message ?? `Triggered ${String(json.count)} workflows`);
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      setResultMessage('Error triggering workflows');
    } finally {
      setLoading(false);
    }
  };

  const hasWorkflows =
    Array.isArray(data['configuredWorkflows']) && data['configuredWorkflows'].length > 0;

  if (!hasWorkflows) {
    return <></>;
  }

  return (
    <div className="field-type block-field pt-2">
      <header className="block-field__header mb-1">
        <h3 className="block-field__title">
          <span className="field-label">
            {triggerWorkflowsLabel[code] ?? triggerWorkflowsLabel['en']}
          </span>
        </h3>
      </header>
      <div className="field-description">
        {triggerWorkflowsDescription[code] ?? triggerWorkflowsDescription['en']}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Button onClick={() => setIsModalOpen(true)} disabled={loading} buttonStyle="secondary">
          <Play className="mr-2 h-4 w-4" />
          {loading && (triggeringText[code] ?? triggeringText['en'])}
          {!loading && (triggerButtonTitle[code] ?? triggerButtonTitle['en'])}
        </Button>
        {resultMessage && (
          <span className="text-sm font-medium text-green-600">{resultMessage}</span>
        )}
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleTriggerWorkflows}
        message={triggerConfirmModalMessage[code] ?? triggerConfirmModalMessage['en'] ?? ''}
        title={triggerWorkflowsLabel[code] ?? triggerWorkflowsLabel['en'] ?? ''}
        confirmLabel={triggerConfirmLabel[code] ?? triggerConfirmLabel['en'] ?? ''}
        submittingText={triggeringText[code] ?? triggeringText['en'] ?? ''}
        isSubmitting={loading}
        locale={code as Config['locale']}
      />
    </div>
  );
};

export default TriggerWorkflowsButton;
