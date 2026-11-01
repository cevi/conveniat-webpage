'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BillingActionDialog,
  billingActionLabels,
} from '@/features/billing/components/billing-action-dialog';
import type { BillingActionsParticipant } from '@/features/billing/hooks/use-billing-actions';
import { useBillingActions } from '@/features/billing/hooks/use-billing-actions';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import { useLocale } from '@payloadcms/ui';
import type React from 'react';

const BillingActionsMenu: React.FC<{ participant: BillingActionsParticipant }> = ({
  participant,
}) => {
  const { code } = useLocale();
  const locale = resolveAdminLocale(code);
  const actions = useBillingActions(participant);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent p-1 text-gray-500 hover:text-gray-700"
            title="Aktionen"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 5.25a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 8.25a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 8.25a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <DropdownMenuItem
            onClick={actions.preview}
            disabled={!actions.hasPdf}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {billingActionLabels.preview[locale]}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={actions.download}
            disabled={!actions.hasPdf}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {billingActionLabels.download[locale]}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(): void => actions.request('send')}
            disabled={!actions.canSendBill}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {billingActionLabels.send[locale]}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(): void => actions.request('reminder')}
            disabled={!actions.canSendReminder}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {billingActionLabels.reminder[locale]}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(): void => actions.request('sync')}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {billingActionLabels.sync[locale]}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(): void => actions.request('resolve')}
            disabled={!actions.canResolveReview}
            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {billingActionLabels.resolve[locale]}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(): void => actions.request('regenerate')}
            className="cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            {billingActionLabels.regenerate[locale]}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(): void => actions.request('remove')}
            className="cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            {billingActionLabels.remove[locale]}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BillingActionDialog actions={actions} locale={locale} />
    </>
  );
};

/**
 * Custom Payload CMS Cell component for per-row actions in bill-participants.
 * Renders a three-dots dropdown menu with the same actions the edit view offers.
 */
export const BillingActionsCell: React.FC<{
  rowData?: BillingActionsParticipant;
}> = ({ rowData }) => {
  // Payload also renders a `ui` field's Cell while building the edit view's form state,
  // without a row.
  if (rowData === undefined) return <></>;
  return <BillingActionsMenu participant={rowData} />;
};

export default BillingActionsCell;
