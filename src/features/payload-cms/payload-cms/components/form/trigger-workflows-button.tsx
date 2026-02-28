'use client';

import { Button, useDocumentInfo, useForm } from '@payloadcms/ui';
import { Play } from 'lucide-react';
import React, { useState } from 'react';

export const TriggerWorkflowsButton: React.FC = () => {
  const { id } = useDocumentInfo();
  const { getData } = useForm();
  const data = getData();
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | undefined>();

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
    <div className="bg-card mb-4 flex flex-col items-start gap-2 rounded border p-4">
      <h3 className="text-card-foreground font-semibold">Trigger Workflows Manually</h3>
      <p className="text-muted-foreground text-sm">
        Use this button to manually enqueue and run all configured workflows for past submissions of
        this form. Workflows that were already executed successfully will be skipped.
      </p>
      <div className="mt-2 flex items-center gap-4">
        <Button onClick={() => void handleTriggerWorkflows()} disabled={loading} size="small">
          <Play className="mr-2 h-4 w-4" />
          {loading ? 'Triggering...' : 'Trigger Workflows for Past Submissions'}
        </Button>
        {resultMessage && (
          <span className="text-sm font-medium text-green-600">{resultMessage}</span>
        )}
      </div>
    </div>
  );
};

export default TriggerWorkflowsButton;
