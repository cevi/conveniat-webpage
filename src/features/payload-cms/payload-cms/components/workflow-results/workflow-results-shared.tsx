import React from 'react';

export type WorkflowStatusType = 'empty' | 'pending' | 'success' | 'error';

export const getWorkflowTooltip = (stateType: WorkflowStatusType): string => {
  if (stateType === 'empty') return 'No workflows executed';
  if (stateType === 'success') return 'All workflows succeeded';
  if (stateType === 'pending') return 'Workflows are pending';
  return 'One or more workflows failed';
};

export const WorkflowBadge: React.FC<{
  prefix: string;
  type: WorkflowStatusType;
  tooltip: string;
  count?: number;
}> = ({ prefix, type, tooltip, count }) => {
  const baseClasses =
    'flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium';
  let colorClasses =
    'border-gray-200 bg-transparent text-gray-400 dark:border-gray-700 dark:text-gray-500';

  let badgeSymbol = '-';

  switch (type) {
    case 'pending': {
      colorClasses =
        'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
      badgeSymbol = '?';
      break;
    }
    case 'success': {
      colorClasses =
        'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200';
      badgeSymbol = '✓';
      break;
    }
    case 'error': {
      colorClasses =
        'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200';
      badgeSymbol = '✗';
      break;
    }
    default: {
      break;
    }
  }

  const countPrefix = count !== undefined && count > 0 ? `${String(count)} ` : '';

  return (
    <span className={`${baseClasses} ${colorClasses}`} title={tooltip}>
      {countPrefix}
      {prefix} {badgeSymbol}
    </span>
  );
};
