'use client';

import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { useDocumentInfo, useField, useForm, useLocale } from '@payloadcms/ui';
import type { CheckboxFieldClientProps } from 'payload';
import React, { useCallback, useState } from 'react';

const blockedStatusString: StaticTranslationString = {
  en: 'This user is blocked',
  de: 'Dieser Benutzer ist gesperrt',
  fr: 'Cet utilisateur est bloqué',
};

const activeStatusString: StaticTranslationString = {
  en: 'This user has full access',
  de: 'Dieser Benutzer hat vollen Zugriff',
  fr: 'Cet utilisateur a un accès complet',
};

const blockActionString: StaticTranslationString = {
  en: 'Block user',
  de: 'Benutzer sperren',
  fr: "Bloquer l'utilisateur",
};

const unblockActionString: StaticTranslationString = {
  en: 'Unblock user',
  de: 'Benutzer entsperren',
  fr: "Débloquer l'utilisateur",
};

const blockConfirmationString: StaticTranslationString = {
  en: 'Are you sure you want to block this user?\n\nThey will immediately lose access to every part of the app that requires a login: chat, enrollments, the helper portal and the admin panel. Their running sessions are invalidated.',
  de: 'Sind Sie sicher, dass Sie diesen Benutzer sperren möchten?\n\nDer Benutzer verliert sofort den Zugriff auf alle Bereiche der App, die eine Anmeldung erfordern: Chat, Anmeldungen, Helfer-Portal und Admin-Panel. Laufende Sitzungen werden ungültig.',
  fr: "Êtes-vous sûr de vouloir bloquer cet utilisateur?\n\nIl perdra immédiatement l'accès à toutes les parties de l'application nécessitant une connexion: chat, inscriptions, portail des bénévoles et panneau d'administration. Ses sessions en cours seront invalidées.",
};

const unblockConfirmationString: StaticTranslationString = {
  en: 'Are you sure you want to unblock this user?\n\nThey will regain access to all features they had access to before.',
  de: 'Sind Sie sicher, dass Sie diesen Benutzer entsperren möchten?\n\nDer Benutzer erhält wieder Zugriff auf alle Funktionen, die er zuvor nutzen konnte.',
  fr: "Êtes-vous sûr de vouloir débloquer cet utilisateur?\n\nIl retrouvera l'accès à toutes les fonctionnalités dont il disposait auparavant.",
};

const confirmButtonString: StaticTranslationString = {
  en: 'Confirm',
  de: 'Bestätigen',
  fr: 'Confirmer',
};

const blockingTextString: StaticTranslationString = {
  en: 'Blocking...',
  de: 'Wird gesperrt...',
  fr: 'Blocage...',
};

const unblockingTextString: StaticTranslationString = {
  en: 'Unblocking...',
  de: 'Wird entsperrt...',
  fr: 'Déblocage...',
};

const descriptionString: StaticTranslationString = {
  en: 'Blocked users cannot use any feature that requires a login.',
  de: 'Gesperrte Benutzer können keine Funktion nutzen, die eine Anmeldung erfordert.',
  fr: 'Les utilisateurs bloqués ne peuvent utiliser aucune fonctionnalité nécessitant une connexion.',
};

const failureString: StaticTranslationString = {
  en: 'The change could not be saved. Please try again.',
  de: 'Die Änderung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
  fr: "La modification n'a pas pu être enregistrée. Veuillez réessayer.",
};

/**
 * Custom admin field for the `blocked` flag of a user.
 *
 * Instead of a plain checkbox this renders an explicit block / unblock button that
 * asks for confirmation before submitting the document — mirroring the confirmation
 * flow used when publishing a page.
 */
export const BlockUserField: React.FC<CheckboxFieldClientProps> = ({ path, readOnly }) => {
  const { value, setValue } = useField<boolean>({ path });
  const { submit } = useForm();
  const { id } = useDocumentInfo();
  const { code } = useLocale() as { code: Config['locale'] };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const isBlocked = value === true;
  const nextValue = !isBlocked;

  // A user can only be blocked once the document exists.
  const isDisabled = readOnly === true || id === undefined;

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      setValue(nextValue);
      await submit({ overrides: { blocked: nextValue } });
      setIsModalOpen(false);
    } catch (submitError) {
      console.error('Failed to change the blocked status:', submitError);
      setValue(!nextValue);
      setError(failureString[code]);
    } finally {
      setIsSubmitting(false);
    }
  }, [code, nextValue, setValue, submit]);

  return (
    <div className="field-type">
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() => void handleConfirm()}
        message={isBlocked ? unblockConfirmationString[code] : blockConfirmationString[code]}
        isSubmitting={isSubmitting}
        locale={code}
        title={isBlocked ? unblockActionString[code] : blockActionString[code]}
        confirmLabel={confirmButtonString[code]}
        submittingText={isBlocked ? unblockingTextString[code] : blockingTextString[code]}
        confirmVariant={isBlocked ? 'primary' : 'danger'}
      />

      <div className="flex flex-col gap-2 rounded-md border border-(--theme-elevation-150) p-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
              isBlocked ? 'bg-[var(--theme-error-500)]' : 'bg-[var(--theme-success-500)]'
            }`}
          />
          <span className="text-sm font-semibold text-(--theme-elevation-800)">
            {isBlocked ? blockedStatusString[code] : activeStatusString[code]}
          </span>
        </div>

        <p className="text-xs text-(--theme-elevation-500)">{descriptionString[code]}</p>

        <button
          type="button"
          disabled={isDisabled}
          onClick={() => setIsModalOpen(true)}
          className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
            isBlocked
              ? 'bg-[var(--theme-success-500)] hover:bg-[var(--theme-success-600)]'
              : 'bg-[var(--theme-error-500)] hover:bg-[var(--theme-error-600)]'
          }`}
        >
          {isBlocked ? unblockActionString[code] : blockActionString[code]}
        </button>

        {error !== undefined && <p className="text-xs text-[var(--theme-error-500)]">{error}</p>}
      </div>
    </div>
  );
};

export default BlockUserField;
