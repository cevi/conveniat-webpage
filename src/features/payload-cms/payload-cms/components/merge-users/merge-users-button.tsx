'use client';

import { mergeUsersAction } from '@/features/payload-cms/payload-cms/components/merge-users/merge-users-action';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import type { Locale } from '@/types/types';
import { Button, toast } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

export interface MergeUsersButtonLabels {
  button: string;
  confirmTitle: string;
  confirmMessage: string;
  submitting: string;
  merged: string;
  forbidden: string;
  failed: string;
}

/**
 * Starts the merge after a confirmation, and opens the user that stays once it is done. The
 * user that went away is gone from the address with it.
 */
export const MergeUsersButton: React.FC<{
  sourceId: string;
  targetId: string;
  targetHref: string;
  locale: Locale;
  labels: MergeUsersButtonLabels;
}> = ({ sourceId, targetId, targetHref, locale, labels }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const merge = async (): Promise<void> => {
    setIsSubmitting(true);
    const result = await mergeUsersAction({ sourceId, targetId }).catch(
      () => ({ ok: false, reason: 'failed' }) as const,
    );
    setIsSubmitting(false);
    setIsOpen(false);
    if (!result.ok) {
      toast.error(labels[result.reason]);
      return;
    }
    toast.success(labels.merged);
    router.push(targetHref);
  };

  return (
    <>
      <Button buttonStyle="primary" onClick={() => setIsOpen(true)}>
        {labels.button}
      </Button>
      <ConfirmationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={merge}
        title={labels.confirmTitle}
        message={labels.confirmMessage}
        confirmLabel={labels.button}
        submittingText={labels.submitting}
        confirmVariant="danger"
        isSubmitting={isSubmitting}
        locale={locale}
      />
    </>
  );
};
