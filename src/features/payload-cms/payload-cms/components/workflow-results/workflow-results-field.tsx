'use client';

import {
  getWorkflowTooltip,
  WorkflowBadge,
  type WorkflowStatusType,
} from '@/features/payload-cms/payload-cms/components/workflow-results/workflow-results-shared';
import { WORKFLOW_DEFINITIONS } from '@/features/payload-cms/payload-cms/plugins/form/tabs/workflow-tab';
import { useField, useLocale } from '@payloadcms/ui';
import React, { useMemo } from 'react';

export const WorkflowResultsField: React.FC<{ path: string }> = ({ path }) => {
  const { value: resultsRaw } = useField<unknown[]>({ path });
  const { code } = useLocale();

  const results = useMemo(() => {
    return Array.isArray(resultsRaw) ? (resultsRaw as Record<string, string>[]) : [];
  }, [resultsRaw]);

  if (results.length === 0) {
    return <></>;
  }

  const getWorkflowName = (workflowKey: string): string => {
    const definition = WORKFLOW_DEFINITIONS[workflowKey as keyof typeof WORKFLOW_DEFINITIONS];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!definition) return workflowKey;
    if (typeof definition.label === 'string') return definition.label;
    return (
      (definition.label as Record<string, string>)[code] ??
      Object.values(definition.label)[0] ??
      workflowKey
    );
  };

  const workflowStatusLabel: Record<string, string> = {
    en: 'Workflow Status',
    de: 'Workflow-Status',
    fr: 'Statut du workflow',
  };

  const errorLabel: Record<string, string> = {
    en: 'Error:',
    de: 'Fehler:',
    fr: 'Erreur :',
  };

  const messageLabel: Record<string, string> = {
    en: 'Message:',
    de: 'Nachricht:',
    fr: 'Message :',
  };

  const noResponseDetailsLabel: Record<string, string> = {
    en: 'No response details',
    de: 'Keine Antwortdetails',
    fr: 'Aucun détail de réponse',
  };

  return (
    <div className="field-type custom-field mb-4">
      <label className="field-label">
        {workflowStatusLabel[code] ?? workflowStatusLabel['en']}
      </label>
      <div className="flex flex-col gap-2">
        {results.map((result, index) => {
          const rawWorkflow = result['workflow'];
          const wName = getWorkflowName(typeof rawWorkflow === 'string' ? rawWorkflow : 'unknown');
          const status = result['status'] as WorkflowStatusType;
          const shortName = String(wName.split(' ')[0]).toUpperCase();
          return (
            <div
              key={index}
              className="flex flex-col rounded border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {wName}
                </span>
                <div className="flex items-center gap-2">
                  <WorkflowBadge
                    prefix={shortName}
                    type={status}
                    tooltip={getWorkflowTooltip(
                      status,
                      code,
                      status === 'error' ? [wName] : undefined,
                    )}
                  />
                  {result['ms'] !== undefined && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      {String(result['ms'])}ms
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 font-mono text-xs break-all text-gray-700 dark:text-gray-300">
                {typeof result['error'] === 'string' && result['error'].length > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {errorLabel[code] ?? errorLabel['en']} {result['error']}
                  </span>
                )}
                {(typeof result['error'] !== 'string' || result['error'].length === 0) &&
                  typeof result['message'] === 'string' &&
                  result['message'].length > 0 && (
                    <span>
                      {messageLabel[code] ?? messageLabel['en']} {result['message']}
                    </span>
                  )}
                {(typeof result['error'] !== 'string' || result['error'].length === 0) &&
                  (typeof result['message'] !== 'string' || result['message'].length === 0) && (
                    <span className="text-gray-500">
                      {noResponseDetailsLabel[code] ?? noResponseDetailsLabel['en']}
                    </span>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowResultsField;
