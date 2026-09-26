'use client';
import { useSendTestNotification } from '@/features/payload-cms/components/push-notification/use-send-test-notification';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import { trpc, TRPCProvider } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  Button,
  Pill,
  ShimmerEffect,
  TextInput,
  useDocumentInfo,
  useTranslation,
} from '@payloadcms/ui';
import { format } from 'date-fns';
import { RefreshCw, Send } from 'lucide-react';
import type React from 'react';
import type { JSX } from 'react';

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
const historyTitle: StaticTranslationString = {
  de: 'Verlauf',
  fr: 'Historique',
  en: 'History',
};
const historyDescription: StaticTranslationString = {
  de: 'Alle Benachrichtigungen an diese Person, über alle ihre Geräte.',
  fr: 'Toutes les notifications envoyées à cette personne, sur tous ses appareils.',
  en: 'Every notification sent to this person, across all of their devices.',
};
const refreshLabel: StaticTranslationString = {
  de: 'Aktualisieren',
  fr: 'Actualiser',
  en: 'Refresh',
};
const loadMoreLabel: StaticTranslationString = {
  de: 'Mehr laden',
  fr: 'Charger plus',
  en: 'Load more',
};
const loadingLabel: StaticTranslationString = {
  de: 'Wird geladen …',
  fr: 'Chargement …',
  en: 'Loading …',
};
const noNotificationsLabel: StaticTranslationString = {
  de: 'Noch keine Benachrichtigungen.',
  fr: 'Aucune notification pour le moment.',
  en: 'No notifications yet.',
};
const noUserLabel: StaticTranslationString = {
  de: 'Mit diesem Abonnement ist keine Person verknüpft, daher gibt es keinen Verlauf.',
  fr: "Aucune personne n'est liée à cet abonnement, il n'y a donc pas d'historique.",
  en: 'No person is linked to this subscription, so there is no history.',
};
const chatMessageLabel: StaticTranslationString = {
  de: 'Chat-Nachricht',
  fr: 'Message de chat',
  en: 'Chat message',
};
const columnLabels: Record<
  'status' | 'message' | 'sent' | 'delivered' | 'interaction',
  StaticTranslationString
> = {
  status: { de: 'Status', fr: 'Statut', en: 'Status' },
  message: { de: 'Nachricht', fr: 'Message', en: 'Message' },
  sent: { de: 'Gesendet', fr: 'Envoyé', en: 'Sent' },
  delivered: { de: 'Zugestellt', fr: 'Livré', en: 'Delivered' },
  interaction: { de: 'Interaktion', fr: 'Interaction', en: 'Interaction' },
};

type LogStatus = 'failed' | 'interacted' | 'delivered' | 'pending';

const statusLabels: Record<LogStatus, StaticTranslationString> = {
  failed: { de: 'Fehlgeschlagen', fr: 'Échoué', en: 'Failed' },
  interacted: { de: 'Interagiert', fr: 'Interagi', en: 'Interacted' },
  delivered: { de: 'Zugestellt', fr: 'Livré', en: 'Delivered' },
  pending: { de: 'Ausstehend', fr: 'En attente', en: 'Pending' },
};

const statusPillStyles: Record<
  LogStatus,
  NonNullable<React.ComponentProps<typeof Pill>['pillStyle']>
> = {
  failed: 'error',
  interacted: 'success',
  delivered: 'success',
  pending: 'light-gray',
};

const COLUMN_COUNT = 5;
const CELL = 'px-4 py-3 align-top';
const DATE_FORMAT = 'd. MMM, HH:mm';

/** Chat pushes store their JSON payload as content, which says nothing to a reader. */
const isChatPayload = (content: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(content);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      (('type' in parsed && parsed.type === 'chat_message') || 'messageId' in parsed)
    );
  } catch {
    return false;
  }
};

const userIdOf = (user: PushNotificationSubscription['user']): string | undefined => {
  if (typeof user === 'string') return user;
  return user?.id;
};

const SectionHeading: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="mb-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="m-0">{title}</h3>
      {action}
    </div>
    <p className="m-0 mt-1 text-(--theme-elevation-500)">{description}</p>
  </div>
);

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

const NotificationHistory: React.FC<{ userId: string; locale: Locale }> = ({ userId, locale }) => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    trpc.pushTracking.getRecentLogs.useInfiniteQuery(
      { userId, limit: 10 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        refetchInterval: 15_000,
      },
    );

  const logs = data?.pages.flatMap((page) => page.items) ?? [];

  const renderRows = (): JSX.Element | JSX.Element[] => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={COLUMN_COUNT} className={CELL}>
            <ShimmerEffect height={120} />
          </td>
        </tr>
      );
    }
    if (logs.length === 0) {
      return (
        <tr>
          <td colSpan={COLUMN_COUNT} className={cn(CELL, 'text-(--theme-elevation-500)')}>
            {noNotificationsLabel[locale]}
          </td>
        </tr>
      );
    }
    return logs.map((log) => {
      let status: LogStatus = 'pending';
      if (log.status === 'FAILED' || log.error !== null) status = 'failed';
      else if (log.interactedAt !== null) status = 'interacted';
      else if (log.status === 'DELIVERED' || log.deliveredAt !== null) status = 'delivered';

      const isChat = isChatPayload(log.content);

      return (
        <tr key={log.id} className="odd:bg-(--theme-elevation-50)">
          <td className={cn(CELL, 'whitespace-nowrap')}>
            <Pill pillStyle={statusPillStyles[status]} size="small">
              {statusLabels[status][locale]}
            </Pill>
          </td>
          <td className={cn(CELL, 'max-w-md')}>
            <div className={cn('truncate', { 'italic opacity-60': isChat })} title={log.content}>
              {isChat ? chatMessageLabel[locale] : log.content}
            </div>
            {log.error !== null && (
              <div className="mt-1 truncate text-sm text-(--theme-error-500)" title={log.error}>
                {log.error}
              </div>
            )}
          </td>
          <td className={cn(CELL, 'whitespace-nowrap')}>
            {format(new Date(log.sentAt), DATE_FORMAT)}
          </td>
          <td className={cn(CELL, 'whitespace-nowrap')}>
            {log.deliveredAt === null ? '–' : format(new Date(log.deliveredAt), DATE_FORMAT)}
          </td>
          <td className={cn(CELL, 'whitespace-nowrap')}>
            {log.interactedAt === null ? (
              '–'
            ) : (
              <>
                {format(new Date(log.interactedAt), DATE_FORMAT)}
                <div className="text-xs tracking-wide text-(--theme-elevation-500) uppercase">
                  {log.interactionType}
                </div>
              </>
            )}
          </td>
        </tr>
      );
    });
  };

  return (
    <section>
      <SectionHeading
        title={historyTitle[locale]}
        description={historyDescription[locale]}
        action={
          <Button
            buttonStyle="pill"
            className="m-0"
            disabled={isRefetching}
            icon={<RefreshCw className={cn('size-3.5', { 'animate-spin': isRefetching })} />}
            iconPosition="left"
            onClick={() => void refetch()}
            size="small"
          >
            {refreshLabel[locale]}
          </Button>
        }
      />
      {/* Styled after Payload's list table. Its `.table` class cannot be reused, because
          Tailwind's `table` utility turns the scroll wrapper into `display: table`. */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="text-(--theme-elevation-400)">
            <tr>
              {(['status', 'message', 'sent', 'delivered', 'interaction'] as const).map(
                (column) => (
                  <th key={column} className={cn(CELL, 'text-left font-normal')}>
                    {columnLabels[column][locale]}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>{renderRows()}</tbody>
        </table>
      </div>
      {hasNextPage && (
        <Button
          buttonStyle="pill"
          className="m-0"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          size="small"
        >
          {isFetchingNextPage ? loadingLabel[locale] : loadMoreLabel[locale]}
        </Button>
      )}
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
