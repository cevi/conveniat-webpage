'use client';

import {
  BillingActionDialog,
  billingActionLabels,
} from '@/features/billing/components/billing-action-dialog';
import { useBillingActions } from '@/features/billing/hooks/use-billing-actions';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { Button, useDocumentInfo, useFormFields, useLocale } from '@payloadcms/ui';
import type React from 'react';

const actionsHeading: StaticTranslationString = {
  de: 'Aktionen',
  en: 'Actions',
  fr: 'Actions',
};

// Payload's Button has no destructive style (`error` is typed but unstyled), so the secondary
// one takes the theme's error colours, which follow dark mode.
const destructiveButtonClasses =
  '[--btn-border:1px_solid_var(--theme-error-500)]! [--color:var(--theme-error-500)]! [--hover-btn-border:1px_solid_var(--theme-error-400)]! [--hover-color:var(--theme-error-400)]!';

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/**
 * The billing actions of the list row menu, as buttons in the sidebar of the edit view, so a
 * registration opened from a search or a payment can be handled without going back to the
 * list.
 */
export const BillingActionsField: React.FC = () => {
  const { id } = useDocumentInfo();
  const { code } = useLocale();
  const locale = resolveAdminLocale(code);
  const status = useFormFields(([fields]) => readString(fields['status']?.value));
  const invoiceNumber = useFormFields(([fields]) => readString(fields['invoiceNumber']?.value));
  const billPdfs = useFormFields(([fields]) => fields['billPdfs']?.value);

  const actions = useBillingActions({
    id: String(id ?? ''),
    status,
    invoiceNumber,
    billPdfs: Array.isArray(billPdfs) ? billPdfs : undefined,
  });

  // The create view has no registration to act on, and nobody creates one by hand.
  if (id === undefined) return <></>;

  return (
    <div className="mb-8 flex flex-col gap-2">
      <span className="text-sm font-semibold text-(--theme-elevation-800)">
        {actionsHeading[locale]}
      </span>
      <div className="flex flex-wrap gap-2">
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          disabled={!actions.hasPdf}
          onClick={actions.preview}
        >
          {billingActionLabels.preview[locale]}
        </Button>
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          disabled={!actions.hasPdf}
          onClick={actions.download}
        >
          {billingActionLabels.download[locale]}
        </Button>
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          disabled={!actions.canSendBill}
          onClick={(): void => actions.request('send')}
        >
          {billingActionLabels.send[locale]}
        </Button>
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          disabled={!actions.canSendReminder}
          onClick={(): void => actions.request('reminder')}
        >
          {billingActionLabels.reminder[locale]}
        </Button>
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          onClick={(): void => actions.request('sync')}
        >
          {billingActionLabels.sync[locale]}
        </Button>
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          disabled={!actions.canResolveReview}
          onClick={(): void => actions.request('resolve')}
        >
          {billingActionLabels.resolve[locale]}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          buttonStyle="secondary"
          className={destructiveButtonClasses}
          size="small"
          margin={false}
          onClick={(): void => actions.request('regenerate')}
        >
          {billingActionLabels.regenerate[locale]}
        </Button>
        <Button
          buttonStyle="secondary"
          className={destructiveButtonClasses}
          size="small"
          margin={false}
          onClick={(): void => actions.request('remove')}
        >
          {billingActionLabels.remove[locale]}
        </Button>
      </div>

      <BillingActionDialog actions={actions} locale={locale} />
    </div>
  );
};

export default BillingActionsField;
