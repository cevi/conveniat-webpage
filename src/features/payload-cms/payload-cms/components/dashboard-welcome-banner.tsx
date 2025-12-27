'use client';

import build from '@/build';
import { environmentVariables } from '@/config/environment-variables';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import { resetServerData } from '@/features/payload-cms/payload-cms/initialization/deleting/reset-api';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';
import { useCallback, useState } from 'react';

const welcomeMessageTitle: StaticTranslationString = {
  de: 'conveniat27 CMS',
  en: 'conveniat27 CMS',
  fr: 'CMS du conveniat27',
};

const welcomeMessage: StaticTranslationString = {
  de: 'Hier kannst du alle Inhalte der Webseite verwalten und bearbeiten.',
  en: 'Here you can manage and edit all the content of the website.',
  fr: 'Ici, vous pouvez gérer et modifier tout le contenu du site web.',
};

const flushCacheTitle: StaticTranslationString = {
  de: 'Cache leeren',
  en: 'Flush Cache',
  fr: 'Vider le cache',
};

const flushCacheMessage: StaticTranslationString = {
  de: 'Bist du sicher, dass du den Cache leeren möchtest?',
  en: 'Are you sure you want to flush the cache?',
  fr: 'Êtes-vous sûr de vouloir vider le cache?',
};

const flushCacheSuccessMessage: StaticTranslationString = {
  de: 'Cache erfolgreich geleert!',
  en: 'Cache flushed successfully!',
  fr: 'Cache vidé avec succès!',
};

const flushingText: StaticTranslationString = {
  de: 'Leeren...',
  en: 'Flushing...',
  fr: 'Vidage...',
};

const resetInstanceTitle: StaticTranslationString = {
  de: 'Instanz zurücksetzen',
  en: 'Reset Instance',
  fr: "Réinitialiser l'instance",
};

const resetInstanceMessage: StaticTranslationString = {
  de: 'Bist du sicher, dass du diese Instanz zurücksetzen möchtest? Dies wird alle Daten löschen.',
  en: 'Are you sure you want to reset this instance? This will delete all data.',
  fr: 'Êtes-vous sûr de vouloir réinitialiser cette instance? Cela supprimera toutes les données.',
};

const resettingText: StaticTranslationString = {
  de: 'Zurücksetzen...',
  en: 'Resetting...',
  fr: 'Réinitialisation...',
};

const successTitle: StaticTranslationString = {
  de: 'Erfolg',
  en: 'Success',
  fr: 'Succès',
};

const closeButtonLabel: StaticTranslationString = {
  de: 'Schließen',
  en: 'Close',
  fr: 'Fermer',
};

const confirmButtonLabel: StaticTranslationString = {
  de: 'Bestätigen',
  en: 'Confirm',
  fr: 'Confirmer',
};

const errorTitle: StaticTranslationString = {
  de: 'Fehler',
  en: 'Error',
  fr: 'Erreur',
};

const resetInstanceErrorMessage: StaticTranslationString = {
  de: 'Instanz konnte nicht zurückgesetzt werden.',
  en: 'Failed to reset instance.',
  fr: "L'instance n'a pas pu être réinitialisée.",
};

const flushCacheErrorMessage: StaticTranslationString = {
  de: 'Cache konnte nicht geleert werden.',
  en: 'Failed to flush cache.',
  fr: "Le cache n'a pas pu être vidé.",
};

type ModalType = 'flush-cache' | 'reset-instance';
type ModalState = 'confirm' | 'success' | 'error';

const resetHandler = async (): Promise<void> => {
  try {
    await resetServerData();
  } catch (error) {
    console.error(error);
    // The reset invalidates the session or throws a redirect, which can be perceived as an error.
    // We force a redirect to the logout page to ensure a clean state and avoid showing a false positive error.
    globalThis.location.href = '/admin/logout';
  }
};

const DashboardWelcomeBanner: React.FC<{ locale: Locale }> = ({ locale = 'de' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>('flush-cache');
  const [modalState, setModalState] = useState<ModalState>('confirm');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flushCacheHandler = async (): Promise<void> => {
    try {
      const response = await fetch('/api/flush-cache');
      if (response.ok) {
        setModalState('success');
      } else {
        setModalState('error');
      }
    } catch (error) {
      console.error(error);
      setModalState('error');
    }
  };

  const openModal = (type: ModalType): void => {
    setModalType(type);
    setModalState('confirm');
    setIsModalOpen(true);
  };

  const handleConfirm = useCallback(async (): Promise<void> => {
    if (modalState === 'success' || modalState === 'error') {
      setIsModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await (modalType === 'reset-instance' ? resetHandler() : flushCacheHandler());
    } finally {
      // If we are resetting, we want to keep the loading state until the page redirects
      if (modalType !== 'reset-instance') {
        setIsSubmitting(false);
      }
    }
  }, [modalState, modalType]);

  const isLocalhost = environmentVariables.NEXT_PUBLIC_APP_HOST_URL.includes('localhost');

  const getModalProperties = (): {
    title: string;
    message: string;
    confirmLabel: string;
    hideCancel: boolean;
    confirmVariant: 'primary' | 'danger';
  } => {
    if (modalState === 'success') {
      return {
        title: successTitle[locale],
        message: flushCacheSuccessMessage[locale],
        confirmLabel: closeButtonLabel[locale],
        hideCancel: true,
        confirmVariant: 'primary' as const,
      };
    }

    if (modalState === 'error') {
      return {
        title: errorTitle[locale],
        message:
          modalType === 'reset-instance'
            ? resetInstanceErrorMessage[locale]
            : flushCacheErrorMessage[locale],
        confirmLabel: closeButtonLabel[locale],
        hideCancel: true,
        confirmVariant: 'danger' as const,
      };
    }

    return {
      title: modalType === 'reset-instance' ? resetInstanceTitle[locale] : flushCacheTitle[locale],
      message:
        modalType === 'reset-instance' ? resetInstanceMessage[locale] : flushCacheMessage[locale],
      confirmLabel: confirmButtonLabel[locale],
      hideCancel: false,
      confirmVariant: modalType === 'reset-instance' ? ('danger' as const) : ('primary' as const),
    };
  };

  const modalProperties = getModalProperties();

  return (
    <div className="relative">
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirm}
        isSubmitting={isSubmitting}
        locale={locale}
        submittingText={
          modalType === 'reset-instance' ? resettingText[locale] : flushingText[locale]
        }
        {...modalProperties}
      />

      <h1 className="text-conveniat-green text-3xl font-extrabold">
        {welcomeMessageTitle[locale]} - Version {build.version}
      </h1>
      <p className="mt-2 text-lg">{welcomeMessage[locale]}</p>
      <div className="mt-4 flex flex-wrap gap-4">
        {isLocalhost && (
          <button
            type="button"
            onClick={() => openModal('reset-instance')}
            className="font-heading cursor-pointer rounded-[8px] bg-red-700 px-8 py-3 text-center text-lg leading-normal font-bold text-red-100 duration-100 hover:bg-red-800"
          >
            Reset this instance
          </button>
        )}

        <button
          type="button"
          onClick={() => openModal('flush-cache')}
          className="font-heading bg-conveniat-green cursor-pointer rounded-[8px] px-8 py-3 text-center text-lg leading-normal font-bold text-white duration-100 hover:brightness-110"
        >
          Flush Cache
        </button>
      </div>
    </div>
  );
};

export default DashboardWelcomeBanner;
