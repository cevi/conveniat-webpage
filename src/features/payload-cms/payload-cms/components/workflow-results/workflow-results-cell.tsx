'use client';

import {
  getWorkflowTooltip,
  WorkflowBadge,
} from '@/features/payload-cms/payload-cms/components/workflow-results/workflow-results-shared';
import { WORKFLOW_DEFINITIONS } from '@/features/payload-cms/payload-cms/plugins/form/tabs/workflow-tab';
import { useLocale } from '@payloadcms/ui';
import React from 'react';

export const WorkflowResultsCell: React.FC<{
  cellData: unknown;
}> = ({ cellData }) => {
  const { code } = useLocale();
  const results = Array.isArray(cellData) ? (cellData as Record<string, unknown>[]) : [];

  let overallStatus: 'empty' | 'pending' | 'success' | 'error' = 'empty';

  const failingWorkflows: string[] = [];
  const allExecutedNames: string[] = [];

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

  if (results.length > 0) {
    overallStatus = 'success';
    for (const result of results) {
      const rawWorkflow = result['workflow'];
      const wName = getWorkflowName(typeof rawWorkflow === 'string' ? rawWorkflow : 'unknown');
      const shortName = String(wName.split(' ')[0]).toUpperCase();

      if (!allExecutedNames.includes(shortName)) {
        allExecutedNames.push(shortName);
      }

      if (result['status'] === 'error') {
        overallStatus = 'error';
        failingWorkflows.push(wName);
      } else if (overallStatus !== 'error' && result['status'] === 'pending') {
        overallStatus = 'pending';
      }
    }
  }

  const executedCount = results.length;
  // Use the short names joined together (e.g. "BREVO, HELPER") instead of "Wkf"
  // If there's only 1 workflow, don't show the count to save space since the name is explicit enough.
  const prefix = allExecutedNames.length > 0 ? allExecutedNames.join(', ') : 'Wkf';
  const showCount = executedCount > 1;

  return (
    <div className="flex items-center gap-1">
      <WorkflowBadge
        prefix={prefix}
        type={overallStatus}
        count={showCount ? executedCount : undefined}
        tooltip={getWorkflowTooltip(overallStatus, failingWorkflows)}
      />
    </div>
  );
};

export default WorkflowResultsCell;
