import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { AnnouncementPushStats } from '@/features/payload-cms/payload-cms/utils/announcement-push-stats';
import { getAnnouncementPushStats } from '@/features/payload-cms/payload-cms/utils/announcement-push-stats';
import type { Locale, StaticTranslationString } from '@/types/types';
import { FieldLabel } from '@payloadcms/ui';
import type { UIFieldServerProps } from 'payload';
import type React from 'react';

const title: StaticTranslationString = {
  en: 'Push notifications',
  de: 'Push-Benachrichtigungen',
  fr: 'Notifications push',
};
const notSentYet: StaticTranslationString = {
  en: 'Sent once the announcement is published.',
  de: 'Werden beim Veröffentlichen verschickt.',
  fr: "Envoyées lors de la publication de l'annonce.",
};
const noRecipients: StaticTranslationString = {
  en: 'Nobody in this channel has push notifications turned on.',
  de: 'In diesem Kanal hat niemand Push-Benachrichtigungen aktiviert.',
  fr: "Personne dans ce canal n'a activé les notifications push.",
};
const sentTo = (count: number): StaticTranslationString => ({
  en: `Sent to ${String(count)} ${count === 1 ? 'person' : 'people'}`,
  de: `An ${String(count)} ${count === 1 ? 'Person' : 'Personen'} gesendet`,
  fr: `Envoyée à ${String(count)} ${count === 1 ? 'personne' : 'personnes'}`,
});
const explanation: StaticTranslationString = {
  en: 'Counted per person across all of their devices. Only people who allowed notifications get a push; chat reads include everyone.',
  de: 'Pro Person über alle ihre Geräte gezählt. Nur wer Benachrichtigungen erlaubt hat, erhält einen Push; im Chat gelesen zählt alle.',
  fr: 'Compté par personne sur tous ses appareils. Seules les personnes ayant autorisé les notifications reçoivent un push ; les lectures dans le chat comptent tout le monde.',
};
const readInChatLabel: StaticTranslationString = {
  en: 'Read in chat',
  de: 'Im Chat gelesen',
  fr: 'Lue dans le chat',
};

type PushMetric = 'delivered' | 'clicked' | 'dismissed' | 'failed';

const metricLabels: Record<PushMetric, StaticTranslationString> = {
  delivered: { en: 'Delivered', de: 'Zugestellt', fr: 'Livrée' },
  clicked: { en: 'Opened from push', de: 'Über Push geöffnet', fr: 'Ouverte via push' },
  dismissed: { en: 'Dismissed', de: 'Weggewischt', fr: 'Ignorée' },
  failed: { en: 'Failed', de: 'Fehlgeschlagen', fr: 'Échouée' },
};

/** Bar colours from Payload's theme, so the summary follows light and dark mode. */
const metricColors: Record<PushMetric, string> = {
  delivered: 'var(--theme-success-500)',
  clicked: 'var(--theme-elevation-800)',
  dismissed: 'var(--theme-elevation-400)',
  failed: 'var(--theme-error-500)',
};

const MetricRow: React.FC<{
  label: string;
  count: number;
  total: number;
  color: string;
}> = ({ label, count, total, color }) => {
  const percentage = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        <span className="tabular-nums">
          {count}
          <span className="ml-2 inline-block w-10 text-right text-(--theme-elevation-500)">
            {percentage}%
          </span>
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-(--theme-elevation-100)">
        <div
          className="h-full rounded-full"
          style={{ width: `${String(percentage)}%`, background: color }}
        />
      </div>
    </li>
  );
};

const Summary: React.FC<{ stats: AnnouncementPushStats; locale: Locale }> = ({ stats, locale }) => (
  <>
    <p className="m-0 mb-3">{sentTo(stats.recipients)[locale]}</p>
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {(['delivered', 'clicked', 'dismissed', 'failed'] as const).map((metric) => (
        <MetricRow
          key={metric}
          label={metricLabels[metric][locale]}
          count={stats[metric]}
          total={stats.recipients}
          color={metricColors[metric]}
        />
      ))}
    </ul>
    <div className="mt-4 flex items-baseline justify-between gap-2 border-t border-(--theme-elevation-100) pt-3">
      <span>{readInChatLabel[locale]}</span>
      <span className="tabular-nums">{stats.readInChat}</span>
    </div>
  </>
);

/**
 * Sidebar summary of how the push notifications of a published announcement fared:
 * delivery, taps and dismissals per person, next to how many people read it in the chat.
 */
export const AnnouncementPushSummaryField = async ({
  data,
  i18n,
}: UIFieldServerProps): Promise<React.ReactElement> => {
  const locale = getAdminLocale(i18n);
  const chatMessageUuid: unknown = (data as Record<string, unknown> | undefined)?.[
    'chatMessageUuid'
  ];
  const stats =
    typeof chatMessageUuid === 'string' && chatMessageUuid !== ''
      ? await getAnnouncementPushStats(chatMessageUuid)
      : undefined;

  let body: React.ReactNode;
  if (stats === undefined) {
    body = <p className="m-0 text-(--theme-elevation-500)">{notSentYet[locale]}</p>;
  } else if (stats.recipients === 0 && stats.readInChat === 0) {
    body = <p className="m-0 text-(--theme-elevation-500)">{noRecipients[locale]}</p>;
  } else {
    body = (
      <>
        <Summary stats={stats} locale={locale} />
        <p className="m-0 mt-3 text-sm text-(--theme-elevation-500)">{explanation[locale]}</p>
      </>
    );
  }

  return (
    <div className="field-type mb-8">
      <FieldLabel label={title[locale]} />
      {body}
    </div>
  );
};
