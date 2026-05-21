'use client';

import type { SmtpResult } from '@/features/payload-cms/payload-cms/components/smtp-results/types';
import { useDocumentInfo, useFormFields, useTranslation } from '@payloadcms/ui';
import { RefreshCw } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

export const ResendEmailButton: React.FC = () => {
  const { id } = useDocumentInfo();
  const [isResending, setIsResending] = useState(false);
  const { t } = useTranslation();

  const { value: smtpResults } = useFormFields(
    ([fields]) => fields['smtpResults'] ?? { value: [] },
  ) as unknown as { value: SmtpResult[] | undefined };

  // Determine if we can resend based on the last SMTP result
  const lastResult =
    Array.isArray(smtpResults) && smtpResults.length > 0 ? smtpResults.at(-1) : undefined;

  // We only allow resend if it's a direct SMTP error (not a bounce report DSN)
  const canResend = lastResult?.success === false && lastResult.bounceReport !== true;

  if (canResend !== true) {
    return;
  }

  const handleResend = async (): Promise<void> => {
    if (id === undefined || id === '') return;

    try {
      setIsResending(true);
      const response = await fetch(`/api/outgoing-emails/${String(id)}/resend`, {
        method: 'POST',
      });

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to resend email');
      }

      if (data.success === true) {
        const successMessage = t('general:updatedSuccessfully');
        toast.success(
          typeof successMessage === 'string' && successMessage.length > 0
            ? successMessage
            : 'Email resent successfully',
        );
        // Reload page to show new status
        globalThis.location.reload();
      } else {
        toast.error(data.error ?? 'Failed to resend email');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsResending(false);
    }
  };

  const onClick = (): void => {
    void handleResend();
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <button
        type="button"
        onClick={onClick}
        disabled={isResending}
        className="btn btn--style-primary btn--icon-style-without-border btn--size-small"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        <RefreshCw size={16} className={isResending ? 'animate-spin' : ''} />
        {isResending ? 'Resending...' : 'Resend Failed Email'}
      </button>
    </div>
  );
};
