import { environmentVariables } from '@/config/environment-variables';
import { outboxHoldEndsAt } from '@/features/payload-cms/payload-cms/utils/email-outbox';
import { DashboardStatCard } from '@/features/payload-cms/payload-cms/widgets/dashboard-stat-card';
import { countBackgroundEmailsLastHour } from '@/lib/background-email-budget';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { Payload, WidgetServerProps } from 'payload';

const title: StaticTranslationString = {
  en: 'Email Stats (Last 7 Days)',
  de: 'Email Statistiken (Letzte 7 Tage)',
  fr: 'Statistiques des e-mails (7 derniers jours)',
};

const labels = {
  sent: {
    en: 'Sent Successfully',
    de: 'Erfolgreich gesendet',
    fr: 'Envoyé avec succès',
  },
  queued: {
    en: 'Queued',
    de: 'In Warteschlange',
    fr: "En file d'attente",
  },
  sending: {
    en: 'Being sent',
    de: 'Wird gesendet',
    fr: "En cours d'envoi",
  },
  errors: {
    en: 'Bounces / Errors',
    de: 'Fehler / Unzustellbar',
    fr: 'Erreurs / Rebond',
  },
};

const budgetText = (sent: number, limit: number, locale: Locale): string =>
  ({
    de: `Warteschlange: ${String(sent)} von ${String(limit)} Mails in der letzten Stunde verschickt`,
    en: `Queue: ${String(sent)} of ${String(limit)} mails sent in the last hour`,
    fr: `File d'attente : ${String(sent)} e-mails sur ${String(limit)} envoyés dans la dernière heure`,
  })[locale];

const heldText = (until: string, locale: Locale): string =>
  ({
    de: `Warteschlange pausiert bis ${until}: Der Mailserver hat sein Limit erreicht.`,
    en: `Queue paused until ${until}: the mail server reached its limit.`,
    fr: `File d'attente en pause jusqu'à ${until} : le serveur de messagerie a atteint sa limite.`,
  })[locale];

/** The state of the outgoing queue, or nothing when Redis cannot tell: the counts still show. */
const readQueueState = async (
  payload: Payload,
): Promise<{ sentLastHour: number; holdEndsAt: Date | undefined } | undefined> => {
  try {
    const [sentLastHour, holdEndsAt] = await Promise.all([
      countBackgroundEmailsLastHour(),
      outboxHoldEndsAt(),
    ]);
    return { sentLastHour, holdEndsAt };
  } catch (error) {
    payload.logger.warn({
      err: error,
      msg: 'Could not read the state of the outgoing mail queue.',
    });
    return undefined;
  }
};

export default async function EmailStatsWidget({
  req,
}: WidgetServerProps): Promise<React.ReactElement> {
  const { payload } = req;
  const locale = req.locale as Locale;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const countWithStatus = async (
    status: 'success' | 'error' | 'queued' | 'pending',
    lastWeekOnly: boolean,
  ): Promise<number> => {
    const { totalDocs } = await payload.count({
      collection: 'outgoing-emails',
      where: {
        ...(lastWeekOnly ? { createdAt: { greater_than: sevenDaysAgo.toISOString() } } : {}),
        deliveryStatus: { equals: status },
      },
    });
    return totalDocs;
  };

  // The queue is not limited to the week: a mail that has waited longer than that is the one
  // to notice.
  const [sentCount, errorCount, queuedCount, sendingCount, queue] = await Promise.all([
    countWithStatus('success', true),
    countWithStatus('error', true),
    countWithStatus('queued', false),
    countWithStatus('pending', false),
    readQueueState(payload),
  ]);

  const holdUntil =
    queue?.holdEndsAt === undefined
      ? undefined
      : new Intl.DateTimeFormat('de-CH', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Zurich',
        }).format(queue.holdEndsAt);

  return (
    <DashboardStatCard
      title={title[locale]}
      isAlert={holdUntil !== undefined}
      stats={[
        { value: sentCount, label: labels.sent[locale] },
        { value: queuedCount, label: labels.queued[locale] },
        { value: sendingCount, label: labels.sending[locale] },
        { value: errorCount, label: labels.errors[locale], isAlert: errorCount > 0 },
      ]}
      {...(queue === undefined
        ? {}
        : {
            footer: (
              <p className="m-0 text-sm text-(--theme-elevation-500)">
                {holdUntil === undefined
                  ? budgetText(
                      queue.sentLastHour,
                      environmentVariables.BACKGROUND_EMAIL_HOURLY_LIMIT,
                      locale,
                    )
                  : heldText(holdUntil, locale)}
              </p>
            ),
          })}
    />
  );
}
