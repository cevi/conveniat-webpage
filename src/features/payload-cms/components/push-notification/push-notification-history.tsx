'use client';
import {
  type DeliveryStatus,
  deliveryStatusOf,
  groupDeliveriesByPush,
} from '@/features/payload-cms/components/push-notification/push-delivery-groups';
import { describePushDevice } from '@/features/payload-cms/components/push-notification/push-device-label';
import { MAX_DELIVERY_ATTEMPTS } from '@/lib/push/push-delivery-policy';
import type { RouterOutputs } from '@/trpc/client';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Button, Pill, ShimmerEffect } from '@payloadcms/ui';
import { format } from 'date-fns';
import { ChevronDown, RefreshCw } from 'lucide-react';
import type React from 'react';
import type { JSX } from 'react';
import { useState } from 'react';

export const historyTitle: StaticTranslationString = {
  de: 'Verlauf',
  fr: 'Historique',
  en: 'History',
};
const historyDescription: StaticTranslationString = {
  de: 'Die letzten 20 Benachrichtigungen an diese Person, über alle ihre Geräte.',
  fr: 'Les 20 dernières notifications envoyées à cette personne, sur tous ses appareils.',
  en: 'The last 20 notifications sent to this person, across all of their devices.',
};
const refreshLabel: StaticTranslationString = {
  de: 'Aktualisieren',
  fr: 'Actualiser',
  en: 'Refresh',
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
const deviceCountLabel = (count: number): StaticTranslationString => ({
  de: `${String(count)} Geräte`,
  fr: `${String(count)} appareils`,
  en: `${String(count)} devices`,
});
const failedCountLabel = (count: number): StaticTranslationString => ({
  de: `${String(count)} fehlgeschlagen`,
  fr: `${String(count)} en échec`,
  en: `${String(count)} failed`,
});
const removedDeviceLabel: StaticTranslationString = {
  de: 'Entferntes Gerät',
  fr: 'Appareil retiré',
  en: 'Removed device',
};
const webPushLabel: StaticTranslationString = { de: 'Web-Push', fr: 'Web push', en: 'Web push' };
const nativeAppLabel: StaticTranslationString = {
  de: 'conveniat27-App',
  fr: 'App conveniat27',
  en: 'conveniat27 app',
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

type LogStatus = DeliveryStatus;

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

type PushLog = RouterOutputs['pushTracking']['getRecentLogs']['items'][number];

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

/** The last 20 pushes to one person, newest first, refreshed every 15 seconds. */
export const NotificationHistory: React.FC<{ userId: string; locale: Locale }> = ({
  userId,
  locale,
}) => {
  const { data, isLoading, refetch, isRefetching } = trpc.pushTracking.getRecentLogs.useQuery(
    { userId },
    // someone else's pushes stay out of the cache the browser keeps across visits
    { refetchInterval: 15_000, meta: { persist: false } },
  );
  const { data: devices } = trpc.pushTracking.getPushDeviceList.useQuery(
    { userId },
    { meta: { persist: false } },
  );
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());

  const groups = groupDeliveriesByPush(data?.items ?? []);

  /** The device a delivery went to, by its subscription, else by what the device reported. */
  const deviceNameOf = (log: PushLog): string => {
    const device = devices?.find((candidate) => candidate.id === log.subscriptionId);
    if (device !== undefined) return describePushDevice(device, locale).name;
    if (log.channel === 'NATIVE_FCM') return nativeAppLabel[locale];
    if (log.userAgent !== null) {
      return describePushDevice({ platform: 'web', userAgent: log.userAgent }, locale).name;
    }
    // the list is loaded and the device is not on it: it was removed or pruned since
    return devices === undefined ? webPushLabel[locale] : removedDeviceLabel[locale];
  };

  const toggle = (key: string): void =>
    setExpandedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const renderError = (log: PushLog, status: LogStatus): JSX.Element | undefined =>
    log.error === null ? undefined : (
      <div
        className={cn(
          'mt-1 truncate text-sm',
          status === 'retrying' ? 'text-(--theme-elevation-500)' : 'text-(--theme-error-500)',
        )}
        title={log.error}
      >
        {status === 'retrying' ? attemptLabel(log.attempts)[locale] : ''}
        {log.error}
      </div>
    );

  const renderTimes = (log: PushLog): JSX.Element => (
    <>
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
    </>
  );

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
    if (groups.length === 0) {
      return (
        <tr>
          <td colSpan={COLUMN_COUNT} className={cn(CELL, 'text-(--theme-elevation-500)')}>
            {noNotificationsLabel[locale]}
          </td>
        </tr>
      );
    }
    return groups.flatMap(({ key, deliveries, status }, index) => {
      const [first] = deliveries;
      if (first === undefined) return [];
      const isChat = isChatPayload(first.content);
      const isGroup = deliveries.length > 1;
      const isExpanded = expandedKeys.has(key);
      const failed = deliveries.filter((log) => deliveryStatusOf(log) === 'failed').length;
      // the earliest answer of any device, so the row says when the push first arrived
      const earliest = (pick: (log: PushLog) => Date | string | null): PushLog => {
        let found: { log: PushLog; at: number } | undefined;
        for (const log of deliveries) {
          const value = pick(log);
          if (value === null) continue;
          const at = new Date(value).getTime();
          if (found === undefined || at < found.at) found = { log, at };
        }
        return found?.log ?? first;
      };
      const firstDelivered = earliest((log) => log.deliveredAt);
      const firstInteracted = earliest((log) => log.interactedAt);
      const stripe = index % 2 === 0 ? 'bg-(--theme-elevation-50)' : '';

      const pushRow = (
        <tr key={key} className={stripe}>
          <td className={cn(CELL, 'whitespace-nowrap')}>
            <Pill pillStyle={statusPillStyles[status]} size="small">
              {statusLabels[status][locale]}
            </Pill>
          </td>
          <td className={cn(CELL, 'max-w-md')}>
            <div className={cn('truncate', { 'italic opacity-60': isChat })} title={first.content}>
              {isChat ? chatMessageLabel[locale] : first.content}
            </div>
            {isGroup ? (
              <button
                type="button"
                aria-expanded={isExpanded}
                className="mt-1 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-sm text-(--theme-elevation-500) hover:text-(--theme-elevation-800)"
                onClick={() => toggle(key)}
              >
                <ChevronDown
                  aria-hidden
                  className={cn('size-3.5 transition-transform', { 'rotate-180': isExpanded })}
                />
                {deviceCountLabel(deliveries.length)[locale]}
                {failed > 0 && (
                  <span className="text-(--theme-error-500)">
                    {' · '}
                    {failedCountLabel(failed)[locale]}
                  </span>
                )}
              </button>
            ) : (
              renderError(first, status)
            )}
          </td>
          <td className={cn(CELL, 'whitespace-nowrap')}>
            {format(new Date(first.sentAt), DATE_FORMAT)}
          </td>
          <td className={cn(CELL, 'whitespace-nowrap')}>
            {firstDelivered.deliveredAt === null
              ? '–'
              : format(new Date(firstDelivered.deliveredAt), DATE_FORMAT)}
          </td>
          <td className={cn(CELL, 'whitespace-nowrap')}>
            {firstInteracted.interactedAt === null ? (
              '–'
            ) : (
              <>
                {format(new Date(firstInteracted.interactedAt), DATE_FORMAT)}
                <div className="text-xs tracking-wide text-(--theme-elevation-500) uppercase">
                  {firstInteracted.interactionType}
                </div>
              </>
            )}
          </td>
        </tr>
      );
      if (!isGroup || !isExpanded) return [pushRow];

      // one row per device, indented under the push it belongs to
      const deviceRows = deliveries.map((log) => {
        const deviceStatus = deliveryStatusOf(log);
        return (
          <tr key={log.id} className={stripe}>
            <td className={cn(CELL, 'pl-8 whitespace-nowrap')}>
              <Pill pillStyle={statusPillStyles[deviceStatus]} size="small">
                {statusLabels[deviceStatus][locale]}
              </Pill>
            </td>
            <td className={cn(CELL, 'max-w-md')}>
              <div className="truncate">{deviceNameOf(log)}</div>
              {renderError(log, deviceStatus)}
            </td>
            <td className={CELL} />
            {renderTimes(log)}
          </tr>
        );
      });
      return [pushRow, ...deviceRows];
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
    </section>
  );
};
