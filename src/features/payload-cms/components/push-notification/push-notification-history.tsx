'use client';
import { MAX_DELIVERY_ATTEMPTS } from '@/lib/push/push-delivery-policy';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Button, Pill, ShimmerEffect } from '@payloadcms/ui';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import type React from 'react';
import type { JSX } from 'react';

export const historyTitle: StaticTranslationString = {
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
const attemptLabel = (attempts: number): StaticTranslationString => ({
  de: `Versuch ${String(attempts)} von ${String(MAX_DELIVERY_ATTEMPTS)}: `,
  fr: `Essai ${String(attempts)} sur ${String(MAX_DELIVERY_ATTEMPTS)} : `,
  en: `Attempt ${String(attempts)} of ${String(MAX_DELIVERY_ATTEMPTS)}: `,
});
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

type LogStatus =
  'failed' | 'interacted' | 'suppressed' | 'delivered' | 'sent' | 'retrying' | 'pending';

const statusLabels: Record<LogStatus, StaticTranslationString> = {
  failed: { de: 'Fehlgeschlagen', fr: 'Échoué', en: 'Failed' },
  interacted: { de: 'Interagiert', fr: 'Interagi', en: 'Interacted' },
  suppressed: { de: 'App war offen', fr: 'App ouverte', en: 'App was open' },
  delivered: { de: 'Zugestellt', fr: 'Livré', en: 'Delivered' },
  sent: { de: 'Gesendet', fr: 'Envoyé', en: 'Sent' },
  retrying: { de: 'Wird wiederholt', fr: 'Nouvel essai prévu', en: 'Retrying' },
  pending: { de: 'Ausstehend', fr: 'En attente', en: 'Pending' },
};

const statusPillStyles: Record<
  LogStatus,
  NonNullable<React.ComponentProps<typeof Pill>['pillStyle']>
> = {
  failed: 'error',
  interacted: 'success',
  suppressed: 'light',
  delivered: 'success',
  sent: 'light',
  retrying: 'warning',
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

/** A section title with its description, and an optional action on the right. */
export const SectionHeading: React.FC<{
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

/** Every push sent to one person, newest first, refreshed every 15 seconds. */
export const NotificationHistory: React.FC<{ userId: string; locale: Locale }> = ({
  userId,
  locale,
}) => {
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
      if (log.status === 'FAILED') status = 'failed';
      // Still queued after a failed attempt: the error is the last one, not the verdict.
      else if (log.status === 'PENDING' && log.error !== null) status = 'retrying';
      else if (log.interactedAt !== null) status = 'interacted';
      // The device received it but showed nothing, because the app was open on the chat.
      else if (log.interactionType === 'SUPPRESSED') status = 'suppressed';
      else if (log.status === 'DELIVERED' || log.deliveredAt !== null) status = 'delivered';
      else if (log.status === 'SENT') status = 'sent';

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
              <div
                className={cn(
                  'mt-1 truncate text-sm',
                  status === 'retrying'
                    ? 'text-(--theme-elevation-500)'
                    : 'text-(--theme-error-500)',
                )}
                title={log.error}
              >
                {status === 'retrying' ? attemptLabel(log.attempts)[locale] : ''}
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
