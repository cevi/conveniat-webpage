import { environmentVariables } from '@/config/environment-variables';
import type {
  AttemptOutcome,
  HistoryEntry,
} from '@/features/payload-cms/payload-cms/components/outgoing-email/mail-history';
import { deriveMailHistory } from '@/features/payload-cms/payload-cms/components/outgoing-email/mail-history';
import type { SmtpResult } from '@/features/payload-cms/payload-cms/components/smtp-results/types';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import {
  countQueuedAhead,
  outboxHoldEndsAt,
} from '@/features/payload-cms/payload-cms/utils/email-outbox';
import {
  OUTGOING_EMAIL_TYPE_LABELS,
  outgoingEmailTypeOf,
} from '@/features/payload-cms/payload-cms/utils/outgoing-email-type';
import type { OutgoingEmail } from '@/features/payload-cms/payload-types';
import { countBackgroundEmailsLastHour } from '@/lib/background-email-budget';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { FieldLabel } from '@payloadcms/ui';
import type { Payload, UIFieldServerProps } from 'payload';
import type React from 'react';

const DATE_LOCALES: Record<Locale, string> = { de: 'de-CH', fr: 'fr-CH', en: 'en-GB' };

const t = {
  to: { en: 'To', de: 'An', fr: 'À' },
  subject: { en: 'Subject', de: 'Betreff', fr: 'Objet' },
  type: { en: 'Type', de: 'Typ', fr: 'Type' },
  waited: { en: 'Waited in the queue', de: 'In der Warteschlange', fr: "Dans la file d'attente" },
  attempts: { en: 'Attempts', de: 'Versuche', fr: 'Tentatives' },
  rateLimitedCount: {
    en: '{count}× refused for the mail server limit',
    de: '{count}× wegen Limit des Mailservers abgelehnt',
    fr: '{count}× refusé pour la limite du serveur',
  },
  history: { en: 'History', de: 'Verlauf', fr: 'Historique' },
  waitingSince: { en: 'Waiting for', de: 'Wartet seit', fr: 'En attente depuis' },
  ahead: { en: 'Sent before this one', de: 'Vor dieser Mail', fr: 'Envoyés avant celui-ci' },
  aheadValue: { en: '{count} mails', de: '{count} Mails', fr: '{count} e-mails' },
  budget: { en: 'Last hour', de: 'Letzte Stunde', fr: 'Dernière heure' },
  budgetValue: {
    en: '{sent} of {limit} sent',
    de: '{sent} von {limit} verschickt',
    fr: '{sent} sur {limit} envoyés',
  },
  queue: { en: 'Queue', de: 'Warteschlange', fr: "File d'attente" },
  running: { en: 'running', de: 'läuft', fr: 'active' },
  heldUntil: {
    en: 'paused until {time}',
    de: 'pausiert bis {time}',
    fr: "en pause jusqu'à {time}",
  },
  heldExplanation: {
    en: 'The mail server refused a mail for its hourly limit, which counts every mail of the domain. The queue tries again after the pause.',
    de: 'Der Mailserver hat eine Mail wegen seines Stundenlimits abgelehnt, das alle Mails der Domain zählt. Die Warteschlange versucht es nach der Pause wieder.',
    fr: "Le serveur a refusé un e-mail pour sa limite horaire, qui compte tous les e-mails du domaine. La file d'attente réessaie après la pause.",
  },
  sending: {
    en: 'Being handed to the mail server. A mail that stays in this state was interrupted while sending; check whether it arrived and set its status by hand.',
    de: 'Wird gerade an den Mailserver übergeben. Bleibt eine Mail so stehen, wurde der Versand unterbrochen: prüfen, ob sie angekommen ist, und den Status von Hand setzen.',
    fr: "En cours de remise au serveur. Un e-mail qui reste dans cet état a été interrompu pendant l'envoi : vérifiez s'il est arrivé et définissez son statut à la main.",
  },
  created: { en: 'Created', de: 'Erstellt', fr: 'Créé' },
  attempt: { en: 'Attempt {number}', de: 'Versuch {number}', fr: 'Tentative {number}' },
  resend: { en: 'Resent', de: 'Erneut gesendet', fr: 'Renvoyé' },
  afterWait: {
    en: 'after {duration} in the queue',
    de: 'nach {duration} in der Warteschlange',
    fr: "après {duration} dans la file d'attente",
  },
  waitingTail: {
    en: 'Waiting in the queue',
    de: 'Wartet in der Warteschlange',
    fr: "En attente dans la file d'attente",
  },
  override: {
    en: 'Status set by hand to {status}',
    de: 'Status von Hand auf {status} gesetzt',
    fr: 'Statut défini à la main sur {status}',
  },
  overrideSuccess: { en: 'sent', de: 'versendet', fr: 'envoyé' },
  overrideError: { en: 'failed', de: 'fehlgeschlagen', fr: 'échoué' },
  withheld: {
    en: 'Not sent to {recipients}: on the list of suppressed addresses',
    de: 'Nicht an {recipients} gesendet: auf der Liste gesperrter Adressen',
    fr: 'Non envoyé à {recipients} : sur la liste des adresses bloquées',
  },
  report: { en: 'Delivery report', de: 'Zustellbericht', fr: 'Rapport de remise' },
} satisfies Record<string, StaticTranslationString>;

const OUTCOME_TEXT: Record<AttemptOutcome, StaticTranslationString> = {
  accepted: {
    en: 'accepted by the mail server',
    de: 'vom Mailserver angenommen',
    fr: 'accepté par le serveur',
  },
  rateLimited: {
    en: 'refused, the mail server limit was reached',
    de: 'abgelehnt, Limit des Mailservers erreicht',
    fr: 'refusé, limite du serveur atteinte',
  },
  refused: {
    en: 'refused by the mail server',
    de: 'vom Mailserver abgelehnt',
    fr: 'refusé par le serveur',
  },
  withheld: {
    en: 'not sent, every address is suppressed',
    de: 'nicht gesendet, alle Adressen gesperrt',
    fr: 'non envoyé, toutes les adresses sont bloquées',
  },
  discarded: {
    en: 'discarded from the queue',
    de: 'aus der Warteschlange verworfen',
    fr: "retiré de la file d'attente",
  },
};

const REPORT_TEXT: Record<
  Extract<HistoryEntry, { kind: 'report' }>['action'],
  StaticTranslationString
> = {
  delivered: { en: 'delivered', de: 'zugestellt', fr: 'remis' },
  relayed: {
    en: 'passed on to {server}',
    de: 'weitergegeben an {server}',
    fr: 'transmis à {server}',
  },
  expanded: {
    en: 'expanded to a list by {server}',
    de: 'von {server} an eine Liste verteilt',
    fr: 'distribué à une liste par {server}',
  },
  delayed: { en: 'delayed at {server}', de: 'verzögert bei {server}', fr: 'retardé chez {server}' },
  failed: { en: 'undeliverable', de: 'unzustellbar', fr: 'non distribuable' },
};

type Tone = 'neutral' | 'good' | 'warning' | 'problem';

// The admin theme has no green; the delivery list spells out the same one.
const DOT_TONES: Record<Tone, string> = {
  neutral: 'bg-(--theme-elevation-400)',
  good: 'bg-[#2f9e58]',
  warning: 'bg-(--theme-warning-500)',
  problem: 'bg-(--theme-error-500)',
};

const OUTCOME_TONES: Record<AttemptOutcome, Tone> = {
  accepted: 'good',
  rateLimited: 'warning',
  refused: 'problem',
  withheld: 'problem',
  discarded: 'neutral',
};

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replaceAll(/\{(\w+)\}/g, (match, key: string) =>
    values[key] === undefined ? match : String(values[key]),
  );

/** In the camp's time zone, so every admin reads the same times. */
const formatTime = (iso: string | undefined, locale: Locale, withDate = true): string => {
  if (iso === undefined) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    timeZone: 'Europe/Zurich',
    ...(withDate && { day: '2-digit', month: '2-digit' }),
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/** "45 s", "38 min", "1 h 49 min", "2 d 3 h" */
export const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return `${String(Math.max(0, Math.round(ms / 1000)))} s`;
  if (minutes < 60) return `${String(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)} h ${String(minutes % 60)} min`;
  return `${String(Math.floor(hours / 24))} d ${String(hours % 24)} h`;
};

interface LiveQueue {
  ahead: number;
  sentLastHour: number;
  holdEndsAt: Date | undefined;
}

/**
 * The queue as it is right now, with the time it was read. `live` is missing when Redis cannot
 * tell; the history still shows.
 */
const readLiveQueue = async (
  payload: Payload,
  email: Pick<OutgoingEmail, 'id' | 'createdAt' | 'formSubmission' | 'billParticipant'>,
): Promise<{ now: number; live: LiveQueue | undefined }> => {
  const now = Date.now();
  try {
    const [ahead, sentLastHour, holdEndsAt] = await Promise.all([
      countQueuedAhead(payload, email),
      countBackgroundEmailsLastHour(),
      outboxHoldEndsAt(),
    ]);
    return { now, live: { ahead, sentLastHour, holdEndsAt } };
  } catch (error) {
    payload.logger.warn({
      err: error,
      msg: `Could not read the state of the outgoing mail queue for mail ${String(email.id)}.`,
    });
    return { now, live: undefined };
  }
};

const Fact: React.FC<{ label: string; children: React.ReactNode; strong?: boolean }> = ({
  label,
  children,
  strong = false,
}) => (
  <div className="min-w-0">
    <div className="text-[12px] text-(--theme-elevation-500)">{label}</div>
    <div className={cn('text-[14px] break-words', strong && 'text-[15px] font-semibold')}>
      {children}
    </div>
  </div>
);

const LiveQueueBox: React.FC<{
  live: LiveQueue | undefined;
  createdAt: string;
  now: number;
  locale: Locale;
}> = ({ live, createdAt, now, locale }) => {
  const isHeld = live?.holdEndsAt !== undefined;
  return (
    <div className="mb-6 rounded border border-(--theme-elevation-150) bg-(--theme-elevation-50) px-4 py-3">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Fact label={t.waitingSince[locale]} strong>
          {formatDuration(now - Date.parse(createdAt))}
        </Fact>
        {live !== undefined && (
          <>
            <Fact label={t.ahead[locale]} strong>
              {fill(t.aheadValue[locale], { count: live.ahead })}
            </Fact>
            <Fact label={t.budget[locale]} strong>
              {fill(t.budgetValue[locale], {
                sent: live.sentLastHour,
                limit: environmentVariables.BACKGROUND_EMAIL_HOURLY_LIMIT,
              })}
            </Fact>
            <Fact label={t.queue[locale]} strong>
              <span className={cn(isHeld && 'text-(--theme-warning-700)')}>
                {live.holdEndsAt === undefined
                  ? t.running[locale]
                  : fill(t.heldUntil[locale], {
                      time: formatTime(live.holdEndsAt.toISOString(), locale, false),
                    })}
              </span>
            </Fact>
          </>
        )}
      </div>
      {isHeld && (
        <p className="m-0 mt-2 text-[12px] text-(--theme-elevation-500)">
          {t.heldExplanation[locale]}
        </p>
      )}
    </div>
  );
};

/** One line of the history: its time, a dot on the line, what happened. */
const HistoryRow: React.FC<{
  at: string | undefined;
  tone: Tone | 'open';
  isLast: boolean;
  title: string;
  detail?: string | undefined;
  note?: string | undefined;
  locale: Locale;
}> = ({ at, tone, isLast, title, detail, note, locale }) => (
  <li className="grid grid-cols-[6.5rem_1rem_1fr] gap-x-3">
    <span className="text-[13px] whitespace-nowrap text-(--theme-elevation-500) tabular-nums">
      {formatTime(at, locale)}
    </span>
    <span className="relative flex justify-center">
      <span
        aria-hidden="true"
        className={cn(
          'z-10 mt-1 h-2.5 w-2.5 rounded-full',
          tone === 'open'
            ? 'border-2 border-dashed border-(--theme-elevation-400)'
            : DOT_TONES[tone],
        )}
      />
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute top-3.5 -bottom-1 w-0.5 bg-(--theme-elevation-150)"
        />
      )}
    </span>
    <div className={cn('min-w-0', !isLast && 'pb-4')}>
      <div className="text-[14px]">{title}</div>
      {note !== undefined && <div className="text-[12px] text-(--theme-elevation-500)">{note}</div>}
      {detail !== undefined && (
        <div className="font-mono text-[12px] break-words text-(--theme-elevation-500)">
          {detail}
        </div>
      )}
    </div>
  </li>
);

const describe = (
  entry: HistoryEntry,
  locale: Locale,
): { title: string; tone: Tone; detail?: string; note?: string } => {
  switch (entry.kind) {
    case 'created': {
      return { title: t.created[locale], tone: 'neutral' };
    }
    case 'attempt': {
      const name = entry.isResend
        ? t.resend[locale]
        : fill(t.attempt[locale], { number: entry.number });
      return {
        title: `${name}: ${OUTCOME_TEXT[entry.outcome][locale]}`,
        tone: OUTCOME_TONES[entry.outcome],
        ...(entry.detail !== undefined && { detail: entry.detail }),
        ...(entry.waitedMs !== undefined && {
          note: fill(t.afterWait[locale], { duration: formatDuration(entry.waitedMs) }),
        }),
      };
    }
    case 'report': {
      const text = fill(REPORT_TEXT[entry.action][locale], { server: entry.server ?? '?' });
      let tone: Tone = 'neutral';
      if (entry.action === 'delivered') tone = 'good';
      if (entry.action === 'delayed') tone = 'warning';
      if (entry.action === 'failed') tone = 'problem';
      return {
        title: `${t.report[locale]}: ${text}`,
        tone,
        ...(entry.recipient !== undefined && { note: entry.recipient }),
      };
    }
    case 'override': {
      return {
        title: fill(t.override[locale], {
          status: entry.success ? t.overrideSuccess[locale] : t.overrideError[locale],
        }),
        tone: 'neutral',
      };
    }
    case 'withheld': {
      return {
        title: fill(t.withheld[locale], { recipients: entry.recipients }),
        tone: 'problem',
      };
    }
  }
};

/**
 * The top of an outgoing mail's page: who it went to, how long it waited and how often it was
 * tried, and everything that happened to it in order. A mail still in the queue also shows
 * where the queue stands right now, read when the page is opened.
 */
export const OutgoingEmailOverview = async ({
  data,
  i18n,
  payload,
}: UIFieldServerProps): Promise<React.ReactElement> => {
  const locale = getAdminLocale(i18n);
  const email = data as Partial<OutgoingEmail> & Record<string, unknown>;
  const history = deriveMailHistory(
    email.smtpResults as SmtpResult[] | null | undefined,
    email.createdAt,
  );
  const isQueued = email.deliveryStatus === 'queued';
  const { now, live } =
    isQueued && email.id !== undefined && typeof email.createdAt === 'string'
      ? await readLiveQueue(payload, {
          id: email.id,
          createdAt: email.createdAt,
          formSubmission: email.formSubmission ?? null,
          billParticipant: email.billParticipant ?? null,
        })
      : { now: 0, live: undefined };

  const rows = history.entries.map((entry) => ({
    at: 'at' in entry ? entry.at : undefined,
    ...describe(entry, locale),
  }));

  return (
    <div className="field-type mb-6">
      <div className="mb-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Fact label={t.to[locale]}>{email.to}</Fact>
        <Fact label={t.type[locale]}>
          {OUTGOING_EMAIL_TYPE_LABELS[outgoingEmailTypeOf(email)][locale]}
        </Fact>
        <Fact label={t.subject[locale]}>{email.subject}</Fact>
        {history.attempts > 0 && (
          <Fact label={t.attempts[locale]}>
            {history.attempts}
            {history.rateLimitedAttempts > 0 &&
              ` · ${fill(t.rateLimitedCount[locale], { count: history.rateLimitedAttempts })}`}
          </Fact>
        )}
        {!isQueued && history.waitedMs !== undefined && history.waitedMs >= 60_000 && (
          <Fact label={t.waited[locale]}>{formatDuration(history.waitedMs)}</Fact>
        )}
      </div>

      {isQueued && typeof email.createdAt === 'string' && (
        <LiveQueueBox live={live} createdAt={email.createdAt} now={now} locale={locale} />
      )}
      {email.deliveryStatus === 'pending' && (
        <p className="mb-6 rounded border border-(--theme-elevation-150) bg-(--theme-elevation-50) px-4 py-3 text-[14px]">
          {t.sending[locale]}
        </p>
      )}

      <FieldLabel label={t.history[locale]} />
      <ol className="m-0 mt-2 list-none p-0">
        {rows.map((row, index) => (
          <HistoryRow
            key={index}
            at={row.at}
            tone={row.tone}
            isLast={index === rows.length - 1 && !isQueued}
            title={row.title}
            detail={row.detail}
            note={row.note}
            locale={locale}
          />
        ))}
        {isQueued && (
          <HistoryRow
            at={undefined}
            tone="open"
            isLast
            title={t.waitingTail[locale]}
            locale={locale}
          />
        )}
      </ol>
    </div>
  );
};

export default OutgoingEmailOverview;
