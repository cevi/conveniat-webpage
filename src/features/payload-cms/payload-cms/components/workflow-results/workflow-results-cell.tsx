'use client';

import {
  getWorkflowTooltip,
  WorkflowBadge,
} from '@/features/payload-cms/payload-cms/components/workflow-results/workflow-results-shared';
import React from 'react';

export const WorkflowResultsCell: React.FC<{
  cellData: unknown;
}> = ({ cellData }) => {
  const results = Array.isArray(cellData) ? (cellData as Record<string, unknown>[]) : [];

  let overallStatus: 'empty' | 'pending' | 'success' | 'error' = 'empty';

  if (results.length > 0) {
    overallStatus = 'success';
    for (const result of results) {
      if (result['status'] === 'error') {
        overallStatus = 'error';
        break;
      }
      if (result['status'] === 'pending') {
        overallStatus = 'pending';
      }
    }
  }

  const executedCount = results.length;

  return (
    <div className="flex items-center gap-1">
      <WorkflowBadge
        prefix="Wkf"
        type={overallStatus}
        count={executedCount}
        tooltip={getWorkflowTooltip(overallStatus)}
      />
    </div>
  );
};

export default WorkflowResultsCell;
