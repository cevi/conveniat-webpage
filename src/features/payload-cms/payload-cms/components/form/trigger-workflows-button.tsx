'use client';

import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import type { Config } from '@/features/payload-cms/payload-types';
import { Button, useDocumentInfo, useForm, useLocale } from '@payloadcms/ui';
import { Play } from 'lucide-react';
import React, { useState } from 'react';

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
            {code === 'de' ? 'Workflows manuell auslösen' : 'Trigger Workflows Manually'}
          </span>
        </h3>
      </header>
      <div className="field-description">
        {code === 'de'
          ? 'Verwenden Sie diese Schaltfläche, um alle konfigurierten Workflows für vergangene Einreichungen dieses Formulars manuell in die Warteschlange zu stellen und auszuführen. Workflows, die bereits erfolgreich ausgeführt wurden, werden übersprungen.'
          : 'Use this button to manually enqueue and run all configured workflows for past submissions of this form. Workflows that were already executed successfully will be skipped.'}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Button onClick={() => setIsModalOpen(true)} disabled={loading} buttonStyle="secondary">
          <Play className="mr-2 h-4 w-4" />
          {loading && (code === 'de' ? 'Wird ausgelöst...' : 'Triggering...')}
          {!loading &&
            (code === 'de'
              ? 'Workflows für vergangene Einreichungen auslösen'
              : 'Trigger Workflows for Past Submissions')}
        </Button>
        {resultMessage && (
          <span className="text-sm font-medium text-green-600">{resultMessage}</span>
        )}
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleTriggerWorkflows}
        message={
          code === 'de'
            ? 'Sind Sie sicher, dass Sie alle konfigurierten Workflows für vergangene Einreichungen manuell auslösen möchten? Bereits erfolgreich durchgeführte Workflows werden übersprungen.'
            : 'Are you sure you want to manually trigger all configured workflows for past submissions of this form? Workflows that have already been executed successfully will be skipped.'
        }
        title={code === 'de' ? 'Workflows manuell auslösen' : 'Trigger Workflows Manually'}
        confirmLabel={code === 'de' ? 'Auslösen' : 'Trigger'}
        submittingText={code === 'de' ? 'Wird ausgelöst...' : 'Triggering...'}
        isSubmitting={loading}
        locale={code as Config['locale']}
      />
    </div>
  );
};

export default TriggerWorkflowsButton;
