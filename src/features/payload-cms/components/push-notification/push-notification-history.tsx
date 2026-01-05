'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/buttons/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SendNotificationModal } from '@/features/payload-cms/components/push-notification/send-notification-modal';
import { trpc, TRPCProvider } from '@/trpc/client';
import { useDocumentInfo, useTranslation } from '@payloadcms/ui';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, Copy, RefreshCw, Send } from 'lucide-react';
import React, { type JSX, useState } from 'react';
import type webpush from 'web-push';

const translations = {
  en: {
    sendTestNotification: 'Send Test Notification',
    sendTestDescription:
      'Send a customized push notification to this device to test if everything is working correctly.',
    openSendDialog: 'Open Send Dialog',
    subscriptionDetails: 'Subscription Details',
    copied: 'Copied!',
    copyJson: 'Copy JSON',
    failed: 'Failed',
    interacted: 'Interacted',
    delivered: 'Delivered',
    pending: 'Pending',
    notificationHistory: 'Notification History',
    refresh: 'Refresh',
    status: 'Status',
    message: 'Message',
    sentAt: 'Sent At',
    deliveredAt: 'Delivered At',
    interaction: 'Interaction',
    noNotifications: 'No notifications found for this user.',
    error: 'Error',
    loadingHistory: 'Loading history...',
    loadMore: 'Load more notifications',
    pushSubscription: 'Push Notification Subscription',
    manageSubscription: 'Manage and track push notifications for this device subscription.',
    noUserData: 'No user associated with this subscription.',
    noSubscriptionData: 'No subscription data available.',
    pushForChat: 'Push For Chat Message',
  },
  de: {
    sendTestNotification: 'Test-Benachrichtigung senden',
    sendTestDescription:
      'Senden Sie eine angepasste Push-Benachrichtigung an dieses Gerät, um zu testen, ob alles korrekt funktioniert.',
    openSendDialog: 'Sende-Dialog öffnen',
    subscriptionDetails: 'Abonnement-Details',
    copied: 'Kopiert!',
    copyJson: 'JSON kopieren',
    failed: 'Fehlgeschlagen',
    interacted: 'Interagiert',
    delivered: 'Zugestellt',
    pending: 'Ausstehend',
    notificationHistory: 'Benachrichtigungsverlauf',
    refresh: 'Aktualisieren',
    status: 'Status',
    message: 'Nachricht',
    sentAt: 'Gesendet am',
    deliveredAt: 'Zugestellt am',
    interaction: 'Interaktion',
    noNotifications: 'Keine Benachrichtigungen für diesen Benutzer gefunden.',
    error: 'Fehler',
    loadingHistory: 'Lade Verlauf...',
    loadMore: 'Mehr Benachrichtigungen laden',
    pushSubscription: 'Push-Benachrichtigungs-Abonnement',
    manageSubscription:
      'Verwalten und verfolgen Sie Push-Benachrichtigungen für dieses Geräte-Abonnement.',
    noUserData: 'Kein Benutzer mit diesem Abonnement verknüpft.',
    noSubscriptionData: 'Keine Abonnementdaten verfügbar.',
    pushForChat: 'Push für Chat-Nachricht',
  },
  fr: {
    sendTestNotification: 'Envoyer une notification de test',
    sendTestDescription:
      'Envoyez une notification push personnalisée à cet appareil pour vérifier si tout fonctionne correctement.',
    openSendDialog: 'Ouvrir la boîte de dialogue',
    subscriptionDetails: "Détails de l'abonnement",
    copied: 'Copié !',
    copyJson: 'Copier JSON',
    failed: 'Échoué',
    interacted: 'Interagi',
    delivered: 'Livré',
    pending: 'En attente',
    notificationHistory: 'Historique des notifications',
    refresh: 'Actualiser',
    status: 'Statut',
    message: 'Message',
    sentAt: 'Envoyé à',
    deliveredAt: 'Livré à',
    interaction: 'Interaction',
    noNotifications: 'Aucune notification trouvée pour cet utilisateur.',
    error: 'Erreur',
    loadingHistory: "Chargement de l'historique...",
    loadMore: 'Charger plus de notifications',
    pushSubscription: 'Abonnement aux notifications push',
    manageSubscription: "Gérer et suivre les notifications push pour cet abonnement d'appareil.",
    noUserData: 'Aucun utilisateur associé à cet abonnement.',
    noSubscriptionData: "Aucune donnée d'abonnement disponible.",
    pushForChat: 'Push pour message chat',
  },
};

// ===== Loading Skeleton Rows =====
function NotificationHistorySkeletonRows(): JSX.Element {
  return (
    <>
      {[1, 2, 3, 4, 5].map((index) => (
        <tr key={index} className="animate-pulse bg-gray-50/50 dark:bg-gray-900/20">
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-24 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full max-w-[200px]" />
              <Skeleton className="h-3 w-2/3 max-w-[150px]" />
            </div>
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ===== Send Push Notification Trigger =====
function SendPushNotificationTrigger({
  subscription,
  userId,
}: {
  subscription: webpush.PushSubscription;
  userId?: string | undefined;
}): JSX.Element {
  const { i18n } = useTranslation();
  const t =
    (translations as Record<string, typeof translations.en>)[i18n.language] || translations.en;
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between rounded border border-gray-200 p-4 dark:border-gray-800">
          <div>
            <h3 className="text-foreground flex items-center gap-2 font-semibold">
              <Send className="h-4 w-4" />
              {t.sendTestNotification}
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">{t.sendTestDescription}</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2" size="sm">
            <Send className="h-4 w-4" />
            {t.openSendDialog}
          </Button>
        </div>
      </div>

      <SendNotificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        subscription={subscription}
        userId={userId}
      />
    </>
  );
}

// ===== Document JSON Viewer =====
function DocumentJsonViewer({ data }: { data: Record<string, unknown> }): JSX.Element {
  const { i18n } = useTranslation();
  const t =
    (translations as Record<string, typeof translations.en>)[i18n.language] || translations.en;
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(data, undefined, 2);

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-8 rounded border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-foreground font-semibold">{t.subscriptionDetails}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleCopy()}
          className="gap-2 border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t.copied}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              {t.copyJson}
            </>
          )}
        </Button>
      </div>
      <div className="relative rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <pre className="text-muted-foreground max-h-[300px] overflow-auto font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
          {jsonString}
        </pre>
      </div>
    </div>
  );
}

// ===== Helper Function =====
function renderStatusBadge(
  isFailed: boolean | string | undefined,
  isInteracted: boolean | string | undefined | Date,
  isDelivered: boolean | string | undefined | Date,
  t: typeof translations.en,
): JSX.Element {
  if (isFailed) {
    return (
      <Badge
        variant="destructive"
        className="border-red-200 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-800/50 dark:bg-red-900/40 dark:text-red-300"
      >
        <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
        {t.failed}
      </Badge>
    );
  } else if (isInteracted) {
    return (
      <Badge
        variant="secondary"
        className="border-purple-200 bg-purple-100/80 font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-800/50 dark:bg-purple-900/30 dark:text-purple-400"
      >
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
        {t.interacted}
      </Badge>
    );
  } else if (isDelivered) {
    return (
      <Badge
        variant="secondary"
        className="border-green-200 bg-green-100/80 font-medium text-green-700 hover:bg-green-100 dark:border-green-800/50 dark:bg-green-900/30 dark:text-green-400"
      >
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
        {t.delivered}
      </Badge>
    );
  } else {
    return (
      <Badge
        variant="outline"
        className="border-blue-200 bg-blue-50 font-medium text-blue-600 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400"
      >
        <Clock className="mr-1.5 h-3.5 w-3.5" />
        {t.pending}
      </Badge>
    );
  }
}

// ===== Notification History =====
function NotificationHistory({ userId }: { userId: string }): JSX.Element {
  const { i18n } = useTranslation();
  const t =
    (translations as Record<string, typeof translations.en>)[i18n.language] || translations.en;
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    trpc.pushTracking.getRecentLogs.useInfiniteQuery(
      { userId, limit: 10 },
      {
        enabled: userId !== '',
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        refetchInterval: 15_000, // Refetch every 15 seconds
      },
    );

  const allItems = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mb-8 rounded border border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
        <h3 className="text-foreground font-semibold">{t.notificationHistory}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refetch()}
          disabled={isRefetching}
          className="text-muted-foreground hover:text-foreground gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          {t.refresh}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t.status}</th>
              <th className="px-4 py-3 text-left font-medium">{t.message}</th>
              <th className="px-4 py-3 text-left font-medium">{t.sentAt}</th>
              <th className="px-4 py-3 text-left font-medium">{t.deliveredAt}</th>
              <th className="px-4 py-3 text-left font-medium">{t.interaction}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {/* eslint-disable-next-line no-nested-ternary */}
            {isLoading ? (
              <NotificationHistorySkeletonRows />
            ) : allItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-6 py-12 text-center italic">
                  {t.noNotifications}
                </td>
              </tr>
            ) : (
              allItems.map((log) => {
                const sentAt = new Date(log.sentAt);
                const deliveredAt = log.deliveredAt ? new Date(log.deliveredAt) : undefined;
                const interactedAt = log.interactedAt ? new Date(log.interactedAt) : undefined;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
                const status = (log as any).status as string | undefined;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
                const error = (log as any).error as string | undefined;

                const isFailed = status === 'FAILED' || error;
                const isInteracted = !!interactedAt;
                const isDelivered = status === 'DELIVERED' || deliveredAt || interactedAt;

                let displayMessage = log.content;
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                  const parsed = JSON.parse(log.content);
                  if (
                    parsed &&
                    typeof parsed === 'object' &&
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    (parsed.type === 'chat_message' || 'messageId' in parsed)
                  ) {
                    displayMessage = 'Push For Chat Message';
                  }
                } catch {
                  // Not JSON, ignore
                }

                return (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderStatusBadge(isFailed, isInteracted, isDelivered, t)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <div
                          className={`text-foreground truncate font-medium ${
                            displayMessage === 'Push For Chat Message'
                              ? 'text-muted-foreground italic'
                              : ''
                          }`}
                          title={log.content}
                        >
                          {displayMessage}
                        </div>
                        {error && (
                          <div
                            className="mt-1 truncate text-xs text-red-600 dark:text-red-400"
                            title={error}
                          >
                            Error: {error}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                      {format(sentAt, 'MMM d, HH:mm')}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                      {deliveredAt ? format(deliveredAt, 'MMM d, HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {interactedAt ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground/80 text-[10px] font-bold tracking-wider uppercase">
                            {log.interactionType}
                          </span>
                          <span className="text-muted-foreground">
                            {format(interactedAt, 'MMM d, HH:mm')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <div className="flex justify-center border-t border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isFetchingNextPage ? 'Loading...' : t.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== Main Content Component =====
function PushSubscriptionViewContent(): JSX.Element {
  const { savedDocumentData } = useDocumentInfo();
  const { i18n } = useTranslation();
  const t =
    (translations as Record<string, typeof translations.en>)[i18n.language] || translations.en;

  if (!savedDocumentData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="text-muted-foreground rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 italic dark:border-gray-700 dark:bg-gray-900/50">
          {t.noSubscriptionData}
        </div>
      </div>
    );
  }

  // Extract user ID
  const userField: unknown = savedDocumentData['user'];
  let userId: string | undefined;
  if (typeof userField === 'string') {
    userId = userField;
  } else if (typeof userField === 'object' && userField !== null && 'id' in userField) {
    userId = (userField as { id: string }).id;
  }

  const subscription = savedDocumentData as unknown as webpush.PushSubscription;

  return (
    <div className="w-full space-y-6 p-6 lg:p-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">{t.pushSubscription}</h1>
        <p className="text-muted-foreground">{t.manageSubscription}</p>
      </div>

      <div className="grid grid-cols-1">
        {/* Send Notification Trigger */}
        <SendPushNotificationTrigger subscription={subscription} userId={userId} />

        {/* Notification History */}
        {userId ? (
          <NotificationHistory userId={userId} />
        ) : (
          <div className="mb-8 rounded border border-gray-200 p-8 text-center dark:border-gray-800">
            <h3 className="text-foreground mb-3 text-lg font-semibold">{t.notificationHistory}</h3>
            <p className="text-muted-foreground italic">{t.noUserData}</p>
          </div>
        )}

        {/* Document JSON Viewer */}
        <DocumentJsonViewer data={savedDocumentData} />
      </div>
    </div>
  );
}

// ===== Export with TRPCProvider =====
const PushSubscriptionView: React.FC = () => {
  return (
    <TRPCProvider>
      <div className="bg-background min-h-screen">
        <PushSubscriptionViewContent />
      </div>
    </TRPCProvider>
  );
};

export default PushSubscriptionView;
