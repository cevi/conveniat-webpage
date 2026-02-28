import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export type WorkflowStatusType = 'empty' | 'pending' | 'success' | 'error';

export const getWorkflowTooltip = (
  stateType: WorkflowStatusType,
  locale: string,
  failingWorkflows?: string[],
): string => {
  if (stateType === 'empty') {
    if (locale === 'de') return 'Keine Workflows ausgeführt';
    if (locale === 'fr') return 'Aucun workflow exécuté';
    return 'No workflows executed';
  }
  if (stateType === 'success') {
    if (locale === 'de') return 'Alle Workflows erfolgreich';
    if (locale === 'fr') return 'Tous les workflows ont réussi';
    return 'All workflows succeeded';
  }
  if (stateType === 'pending') {
    if (locale === 'de') return 'Workflows sind ausstehend';
    if (locale === 'fr') return 'Les workflows sont en attente';
    return 'Workflows are pending';
  }

  if (failingWorkflows && failingWorkflows.length > 0) {
    if (locale === 'de')
      return `Ein oder mehrere Workflows sind fehlgeschlagen (${failingWorkflows.join(', ')})`;
    if (locale === 'fr')
      return `Un ou plusieurs workflows ont échoué (${failingWorkflows.join(', ')})`;
    return `One or more workflows failed (${failingWorkflows.join(', ')})`;
  }

  if (locale === 'de') return 'Ein oder mehrere Workflows sind fehlgeschlagen';
  if (locale === 'fr') return 'Un ou plusieurs workflows ont échoué';
  return 'One or more workflows failed';
};

export const WorkflowBadge: React.FC<{
  prefix: string;
  type: WorkflowStatusType;
  tooltip: string;
  count?: number | undefined;
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
    <span className={cn(baseClasses, colorClasses)} title={tooltip}>
      {countPrefix}
      {prefix} {badgeSymbol}
    </span>
  );
};
