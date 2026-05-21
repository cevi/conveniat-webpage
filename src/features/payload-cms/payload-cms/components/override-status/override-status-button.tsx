'use client';

import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import type { Config } from '@/features/payload-cms/payload-types';
import { useAuth, useDocumentInfo, useLocale } from '@payloadcms/ui';
import { CheckCircle, XCircle } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

type LocaleCode = Config['locale'];

const labels = {
  title: {
    en: 'Manual Overwrite',
    de: 'Manuell überschreiben',
    fr: 'Remplacer manuellement',
  },
  markSuccess: {
    en: 'Mark as Success',
    de: 'Als erfolgreich markieren',
    fr: 'Marquer comme succès',
  },
  markError: {
    en: 'Mark as Error',
    de: 'Als fehlerhaft markieren',
    fr: 'Marquer comme erreur',
  },
  modalTitleSuccess: {
    en: 'Overwrite Status: Success',
    de: 'Status überschreiben: Erfolgreich',
    fr: 'Remplacer le statut : Succès',
  },
  modalTitleError: {
    en: 'Overwrite Status: Error',
    de: 'Status überschreiben: Fehler',
    fr: 'Remplacer le statut : Échec',
  },
  modalMessageSuccess: {
    en: 'Are you sure you want to manually mark this outgoing email as successful?\n\nWarning: This will override both the DSN and SMTP statuses to success. This action should only be taken if you have verified the email was actually delivered.',
    de: 'Sind Sie sicher, dass Sie diese ausgehende E-Mail manuell als erfolgreich markieren möchten?\n\nWarnung: Dies überschreibt sowohl den DSN- als auch den SMTP-Status auf "Erfolgreich". Diese Aktion sollte nur durchgeführt werden, wenn Sie überprüft haben, dass die E-Mail tatsächlich zugestellt wurde.',
    fr: "Êtes-vous sûr de vouloir marquer manuellement cet e-mail sortant comme réussi ?\n\nAttention : cela remplacera les statuts DSN et SMTP par un succès. Cette action ne doit être entreprise que si vous avez vérifié que l'e-mail a bien été livré.",
  },
  modalMessageError: {
    en: 'Are you sure you want to manually mark this outgoing email as failed?\n\nWarning: This will override both the DSN and SMTP statuses to error.',
    de: 'Sind Sie sicher, dass Sie diese ausgehende E-Mail manuell als fehlerhaft markieren möchten?\n\nWarnung: Dies überschreibt sowohl den DSN- als auch den SMTP-Status auf "Fehler".',
    fr: 'Êtes-vous sûr de vouloir marquer manuellement cet e-mail sortant comme échoué ?\n\nAttention : cela remplacera les statuts DSN et SMTP par une erreur.',
  },
  confirmLabel: {
    en: 'Confirm Overwrite',
    de: 'Überschreiben bestätigen',
    fr: 'Confirmer le remplacement',
  },
  submittingText: {
    en: 'Overwriting...',
    de: 'Wird überschrieben...',
    fr: 'Remplacement...',
  },
  successToast: {
    en: 'Email status successfully overwritten.',
    de: 'E-Mail-Status erfolgreich überschrieben.',
    fr: "Statut de l'e-mail remplacé avec succès.",
  },
};

export interface OverrideStatusButtonProperties {
  fullAdminGroupIds?: number[];
}

export const OverrideStatusButton: React.FC<OverrideStatusButtonProperties> = ({
  fullAdminGroupIds,
}) => {
  const { id } = useDocumentInfo();
  const { user } = useAuth();
  const { code } = useLocale() as { code: LocaleCode };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Frontend check: only show button if user has CEVIDB_GROUP_FULL_ADMIN access
  const userGroups = user?.['groups'] as { id: number }[] | undefined;
  const userGroupIds = Array.isArray(userGroups) ? userGroups.map((g) => g.id) : [];
  const hasAccess =
    Array.isArray(fullAdminGroupIds) &&
    fullAdminGroupIds.some((groupId) => userGroupIds.includes(groupId));

  if (!user || !hasAccess) {
    return;
  }

  const handleOpenModal = (status: 'success' | 'error'): void => {
    setTargetStatus(status);
    setIsModalOpen(true);
  };

  const handleConfirmOverwrite = async (): Promise<void> => {
    if (id === undefined || id === '') return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/outgoing-emails/${String(id)}/override-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to overwrite email status');
      }

      if (data.success === true) {
        toast.success(labels.successToast[code]);
        setIsModalOpen(false);
        // Reload page to show new status and logs
        globalThis.location.reload();
      } else {
        toast.error(data.error ?? 'Failed to overwrite email status');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        marginBottom: '1.5rem',
        borderTop: '1px solid var(--theme-elevation-150)',
        paddingTop: '1rem',
      }}
    >
      <h4
        style={{
          fontSize: '0.85rem',
          marginBottom: '0.75rem',
          fontWeight: 600,
          color: 'var(--theme-elevation-600)',
        }}
      >
        {labels.title[code]}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => handleOpenModal('success')}
          disabled={isSubmitting}
          className="btn btn--style-primary btn--size-small"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            justifyContent: 'center',
            backgroundColor: '#10b981',
            borderColor: '#10b981',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <CheckCircle size={16} />
          {labels.markSuccess[code]}
        </button>

        <button
          type="button"
          onClick={() => handleOpenModal('error')}
          disabled={isSubmitting}
          className="btn btn--style-secondary btn--size-small"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            justifyContent: 'center',
            backgroundColor: '#ef4444',
            borderColor: '#ef4444',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <XCircle size={16} />
          {labels.markError[code]}
        </button>
      </div>

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmOverwrite}
        message={
          targetStatus === 'success'
            ? labels.modalMessageSuccess[code]
            : labels.modalMessageError[code]
        }
        isSubmitting={isSubmitting}
        locale={code}
        title={
          targetStatus === 'success' ? labels.modalTitleSuccess[code] : labels.modalTitleError[code]
        }
        confirmLabel={labels.confirmLabel[code]}
        submittingText={labels.submittingText[code]}
        confirmVariant={targetStatus === 'success' ? 'primary' : 'danger'}
      />
    </div>
  );
};
