'use client';

import { SendNotificationForm } from '@/features/payload-cms/components/push-notification/send-notification-form';
import { useSendTestNotification } from '@/features/payload-cms/components/push-notification/use-send-test-notification';
import { cva } from 'class-variance-authority';
import { Send, X } from 'lucide-react';
import React from 'react';
import { createPortal } from 'react-dom';
import type webpush from 'web-push';

import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import { useTranslation } from '@payloadcms/ui';

const translations = {
  en: {
    enterContent: 'Please enter notification content.',
    unknownError: 'Unknown error occurred.',
    sendFailed: 'Failed to send push notification.',
    title: 'Send Test Notification',
    contentLabel: 'Content',
    contentPlaceholder: 'Notification content...',
    urlLabel: 'URL (Optional)',
    urlPlaceholder: 'URL to open (optional)',
    cancel: 'Cancel',
    sending: 'Sending...',
    send: 'Send Notification',
  },
  de: {
    enterContent: 'Bitte geben Sie den Benachrichtigungsinhalt ein.',
    unknownError: 'Unbekannter Fehler aufgetreten.',
    sendFailed: 'Senden der Push-Benachrichtigung fehlgeschlagen.',
    title: 'Test-Benachrichtigung senden',
    contentLabel: 'Inhalt',
    contentPlaceholder: 'Benachrichtigungsinhalt...',
    urlLabel: 'URL (Optional)',
    urlPlaceholder: 'URL zum Öffnen (optional)',
    cancel: 'Abbrechen',
    sending: 'Sende...',
    send: 'Benachrichtigung senden',
  },
  fr: {
    enterContent: 'Veuillez saisir le contenu de la notification.',
    unknownError: 'Une erreur inconnue est survenue.',
    sendFailed: "Échec de l'envoi de la notification push.",
    title: 'Envoyer une notification de test',
    contentLabel: 'Contenu',
    contentPlaceholder: 'Contenu de la notification...',
    urlLabel: 'URL (Optionnel)',
    urlPlaceholder: 'URL à ouvrir (optionnel)',
    cancel: 'Annuler',
    sending: 'Envoi...',
    send: 'Envoyer la notification',
  },
};

interface SendNotificationModalProperties {
  isOpen: boolean;
  onClose: () => void;
  subscription: webpush.PushSubscription | PushNotificationSubscription;
  userId?: string | undefined;
}

export const SendNotificationModal: React.FC<SendNotificationModalProperties> = ({
  isOpen,
  onClose,
  subscription,
  userId,
}) => {
  const { i18n } = useTranslation();
  const t =
    (translations as Record<string, typeof translations.en>)[i18n.language] ?? translations.en;

  const { content, setContent, url, setUrl, isSubmitting, error, setError, handleSend } =
    useSendTestNotification({
      subscription,
      userId,
      onClose,
      enterContentErrorText: t.enterContent,
      unknownErrorText: t.unknownError,
      sendFailedErrorText: t.sendFailed,
    });

  // eslint-disable-next-line unicorn/no-null
  if (!isOpen) return null;

  const confirmClasses = cva(
    'cursor-pointer relative flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 min-w-[100px] bg-slate-900 hover:bg-slate-800 focus:ring-slate-900',
  );

  const modalContent = (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
            <Send className="h-5 w-5" />
            {t.title}
          </h3>
          <button
            onClick={onClose}
            className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SendNotificationForm
          content={content}
          setContent={setContent}
          url={url}
          setUrl={setUrl}
          error={error}
          setError={setError}
          translations={t}
        />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isSubmitting}
            className={confirmClasses()}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{t.sending}</span>
              </>
            ) : (
              t.send
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // eslint-disable-next-line unicorn/no-null
  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
