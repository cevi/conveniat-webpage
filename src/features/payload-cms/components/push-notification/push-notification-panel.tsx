'use client';
import {
  historyTitle,
  NotificationHistory,
  SectionHeading,
} from '@/features/payload-cms/components/push-notification/push-notification-history';
import { useSendTestNotification } from '@/features/payload-cms/components/push-notification/use-send-test-notification';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import { TRPCProvider } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Button, TextInput, useDocumentInfo, useTranslation } from '@payloadcms/ui';
import { Send } from 'lucide-react';
import type React from 'react';

const sendTitle: StaticTranslationString = {
  de: 'Test-Benachrichtigung senden',
  fr: 'Envoyer une notification de test',
  en: 'Send test notification',
};
const sendDescription: StaticTranslationString = {
  de: 'Sendet eine Push-Benachrichtigung an genau dieses Gerät.',
  fr: 'Envoie une notification push à cet appareil uniquement.',
  en: 'Sends a push notification to this device only.',
};
const contentLabel: StaticTranslationString = { de: 'Inhalt', fr: 'Contenu', en: 'Content' };
const urlLabel: StaticTranslationString = {
  de: 'URL (optional)',
  fr: 'URL (optionnel)',
  en: 'URL (optional)',
};
const sendLabel: StaticTranslationString = { de: 'Senden', fr: 'Envoyer', en: 'Send' };
const sendingLabel: StaticTranslationString = {
  de: 'Wird gesendet …',
  fr: 'Envoi …',
  en: 'Sending …',
};
const sentLabel: StaticTranslationString = {
  de: 'Test-Benachrichtigung gesendet.',
  fr: 'Notification de test envoyée.',
  en: 'Test notification sent.',
};
const enterContentLabel: StaticTranslationString = {
  de: 'Bitte einen Inhalt eingeben.',
  fr: 'Veuillez saisir un contenu.',
  en: 'Please enter some content.',
};
const unknownErrorLabel: StaticTranslationString = {
  de: 'Unbekannter Fehler.',
  fr: 'Erreur inconnue.',
  en: 'Unknown error.',
};
const sendFailedLabel: StaticTranslationString = {
  de: 'Die Push-Benachrichtigung konnte nicht gesendet werden.',
  fr: "La notification push n'a pas pu être envoyée.",
  en: 'The push notification could not be sent.',
};
const subscriptionRemovedLabel: StaticTranslationString = {
  de: 'Das Gerät hat die Push-Benachrichtigungen abbestellt oder das Abonnement ist abgelaufen. Es wurde deshalb gelöscht.',
  fr: "L'appareil s'est désabonné des notifications push ou l'abonnement a expiré. Il a donc été supprimé.",
  en: 'The device unsubscribed from push notifications or the subscription expired, so it was deleted.',
};
const noUserLabel: StaticTranslationString = {
  de: 'Mit diesem Abonnement ist keine Person verknüpft, daher gibt es keinen Verlauf.',
  fr: "Aucune personne n'est liée à cet abonnement, il n'y a donc pas d'historique.",
  en: 'No person is linked to this subscription, so there is no history.',
};
const userIdOf = (user: PushNotificationSubscription['user']): string | undefined => {
  if (typeof user === 'string') return user;
  return user?.id;
};

const SendTestNotification: React.FC<{
  subscription: PushNotificationSubscription;
  userId: string | undefined;
  locale: Locale;
}> = ({ subscription, userId, locale }) => {
  const { content, setContent, url, setUrl, isSubmitting, handleSend } = useSendTestNotification({
    subscription,
    userId,
    sentText: sentLabel[locale],
    enterContentErrorText: enterContentLabel[locale],
    unknownErrorText: unknownErrorLabel[locale],
    sendFailedErrorText: sendFailedLabel[locale],
    subscriptionRemovedText: subscriptionRemovedLabel[locale],
  });

  return (
    <section className="mb-12">
      <SectionHeading title={sendTitle[locale]} description={sendDescription[locale]} />
      {/* No <form> here: the ui field already renders inside Payload's document form. */}
      <div className="flex flex-col gap-6">
        <TextInput
          path="testNotificationContent"
          label={contentLabel[locale]}
          required
          value={content}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            void handleSend();
          }}
        />
        <TextInput
          path="testNotificationUrl"
          label={urlLabel[locale]}
          placeholder="https://conveniat27.ch/app/…"
          value={url}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUrl(event.target.value)}
        />
        <Button
          buttonStyle="primary"
          className="m-0 self-start"
          disabled={isSubmitting}
          icon={<Send className="h-4 w-4" />}
          iconPosition="left"
          onClick={() => void handleSend()}
          size="medium"
        >
          {isSubmitting ? sendingLabel[locale] : sendLabel[locale]}
        </Button>
      </div>
    </section>
  );
};

const PushNotificationPanelContent: React.FC = () => {
  const { data } = useDocumentInfo();
  const { i18n } = useTranslation();
  const locale = getAdminLocale(i18n);

  if (data === undefined) return <></>;

  const subscription = data as PushNotificationSubscription;
  const userId = userIdOf(subscription.user);

  return (
    <>
      <SendTestNotification subscription={subscription} userId={userId} locale={locale} />
      {userId === undefined ? (
        <section>
          <SectionHeading title={historyTitle[locale]} description={noUserLabel[locale]} />
        </section>
      ) : (
        <NotificationHistory userId={userId} locale={locale} />
      )}
    </>
  );
};

/**
 * Test-send form and delivery history for one push subscription, rendered as a `ui` field.
 * Both halves share one TRPCProvider so a sent notification shows up in the history at once.
 */
const PushNotificationPanel: React.FC = () => (
  <TRPCProvider>
    <PushNotificationPanelContent />
  </TRPCProvider>
);

export default PushNotificationPanel;
