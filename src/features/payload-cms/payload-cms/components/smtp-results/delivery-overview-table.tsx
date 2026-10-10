'use client';

import {
  LOCALIZED_SMTP_LABELS,
  WARNING_MESSAGES,
} from '@/features/payload-cms/payload-cms/components/smtp-results/constants';
import type {
  DeliveryAttempt,
  DeliveryEvent,
  DeliveryOverview,
  RecipientDelivery,
  RecipientState,
} from '@/features/payload-cms/payload-cms/components/smtp-results/delivery-overview';
import { outcomeOf } from '@/features/payload-cms/payload-cms/components/smtp-results/delivery-overview';
import type { SmtpLanguage } from '@/features/payload-cms/payload-cms/components/smtp-results/types';
import { parseSimplifiedRejectionReason } from '@/features/payload-cms/payload-cms/components/smtp-results/utils';
import { cn } from '@/utils/tailwindcss-override';
import { Pill } from '@payloadcms/ui';
import { ArrowRight, Check, Clock, CornerDownRight, Hand, HelpCircle, X } from 'lucide-react';
import type React from 'react';

type Labels = (typeof LOCALIZED_SMTP_LABELS)[SmtpLanguage];
type PillStyle = NonNullable<React.ComponentProps<typeof Pill>['pillStyle']>;

const DATE_LOCALES: Record<SmtpLanguage, string> = { de: 'de-CH', fr: 'fr-CH', en: 'en-GB' };

// The order of the summary: what needs a look comes first.
const STATE_ORDER: RecipientState[] = [
  'failed',
  'notSent',
  'delayed',
  'overdue',
  'noReport',
  'relayed',
  'delivered',
];

/**
 * Green is kept for a delivery a server confirmed and red for a failure nothing will repair
 * on its own. Blue is a mail still on its way, grey one we know nothing about.
 */
type Tone = 'green' | 'blue' | 'gray' | 'red';

// Payload's `success` pill is blue and its theme has no green. The admin palette's green is
// the muted conveniat one, which reads as grey next to a grey pill, so this one is spelled out.
const TONE_PILLS: Record<Tone, { pillStyle: PillStyle; className?: string }> = {
  green: {
    pillStyle: 'light',
    className: 'bg-[#d3f0db] text-[#14592f] dark:bg-[#17462c] dark:text-[#b7e8c6]',
  },
  blue: { pillStyle: 'success' },
  gray: { pillStyle: 'light-gray' },
  red: { pillStyle: 'error' },
};

const STATE_TONES: Record<RecipientState, Tone> = {
  failed: 'red',
  notSent: 'red',
  delayed: 'blue',
  overdue: 'gray',
  noReport: 'gray',
  relayed: 'blue',
  delivered: 'green',
};

const stateLabel = (state: RecipientState, labels: Labels): string =>
  ({
    failed: labels.stateFailed,
    notSent: labels.stateNotSent,
    delayed: labels.stateDelayed,
    overdue: labels.stateOverdue,
    noReport: labels.stateNoReport,
    relayed: labels.stateRelayed,
    delivered: labels.stateDelivered,
  })[state];

const stateHint = (recipient: RecipientDelivery, labels: Labels, isListed: boolean): string => {
  const outcome = outcomeOf(recipient.events);
  if (outcome?.manual === true) return labels.hintManual;

  switch (recipient.state) {
    case 'failed': {
      const reason = parseSimplifiedRejectionReason(outcome?.status, outcome?.diagnostic);
      return reason === undefined ? labels.rejectionGeneric : labels[reason];
    }
    case 'notSent': {
      return recipient.submission?.detail ?? '';
    }
    case 'delayed': {
      return labels.hintDelayed;
    }
    case 'overdue': {
      return labels.hintOverdue;
    }
    case 'noReport': {
      return isListed ? labels.hintListed : labels.hintNoReport;
    }
    case 'relayed': {
      return labels.hintRelayed;
    }
    case 'delivered': {
      return labels.hintDelivered;
    }
  }
};

/**
 * Formats in the camp's time zone, so the server render and the browser agree.
 */
const formatTime = (iso: string | undefined, lang: SmtpLanguage): string => {
  if (iso === undefined) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(DATE_LOCALES[lang], {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const ICON_CLASS = 'h-3 w-3';
// Payload spaces a pill for its own icons, which carry their padding inside.
const PILL_CLASS = 'gap-1 px-1.5 text-xs';

const EventLine: React.FC<{ event: DeliveryEvent; labels: Labels; lang: SmtpLanguage }> = ({
  event,
  labels,
  lang,
}) => {
  let tone: Tone = 'blue';
  let icon = <ArrowRight aria-hidden="true" className={ICON_CLASS} />;
  let label = event.action === 'expanded' ? labels.actionExpanded : labels.actionRelayed;

  switch (event.action) {
    case 'delivered': {
      tone = 'green';
      icon = <Check aria-hidden="true" className={ICON_CLASS} />;
      label = labels.actionDelivered;
      break;
    }
    case 'failed': {
      tone = 'red';
      icon = <X aria-hidden="true" className={ICON_CLASS} />;
      label = labels.actionFailed;
      break;
    }
    case 'delayed': {
      icon = <Clock aria-hidden="true" className={ICON_CLASS} />;
      label = labels.actionDelayed;
      break;
    }
    default: {
      break;
    }
  }
  if (event.manual === true) {
    icon = <Hand aria-hidden="true" className={ICON_CLASS} />;
    label = labels.actionManual;
  }

  const answer = event.manual === true ? event.diagnostic : (event.diagnostic ?? event.status);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <Pill
          alignIcon="left"
          className={cn(PILL_CLASS, TONE_PILLS[tone].className)}
          icon={icon}
          pillStyle={TONE_PILLS[tone].pillStyle}
          size="small"
        >
          {label}
        </Pill>
        <span className="text-xs whitespace-nowrap text-(--theme-elevation-500)">
          {formatTime(event.at, lang)}
        </span>
      </div>
      {event.server !== undefined && (
        <div className="font-mono text-xs break-all">{event.server}</div>
      )}
      {(event.action === 'failed' || event.manual === true) && answer !== undefined && (
        <div className="font-mono text-xs break-words text-(--theme-elevation-500)">{answer}</div>
      )}
    </div>
  );
};

const RecipientRow: React.FC<{
  recipient: RecipientDelivery;
  labels: Labels;
  lang: SmtpLanguage;
  gridClass: string;
  isListed: boolean;
}> = ({ recipient, labels, lang, gridClass, isListed }) => {
  const { submission } = recipient;
  const isProblem = recipient.state === 'failed' || recipient.state === 'notSent';

  return (
    <div
      role="row"
      className={cn(
        gridClass,
        'border-t border-(--theme-elevation-100) px-3 py-3 first:border-t-0',
      )}
    >
      <div role="cell" className="min-w-0">
        <div className="flex items-start gap-1 font-medium break-all">
          {!recipient.expected && (
            <CornerDownRight
              aria-label={labels.notAddressed}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--theme-elevation-500)"
            />
          )}
          {recipient.address}
        </div>
        {recipient.via !== undefined && (
          <div className="text-xs break-all text-(--theme-elevation-500)">
            {labels.via.replace('{address}', recipient.via)}
          </div>
        )}
      </div>

      <div role="cell" className="min-w-0">
        {submission !== undefined && (
          <Pill
            alignIcon="left"
            className={PILL_CLASS}
            icon={
              submission.accepted ? (
                <Check aria-hidden="true" className={ICON_CLASS} />
              ) : (
                <X aria-hidden="true" className={ICON_CLASS} />
              )
            }
            pillStyle={submission.accepted ? 'light-gray' : 'error'}
            size="small"
          >
            {submission.accepted ? labels.submissionAccepted : labels.submissionFailed}
          </Pill>
        )}
        {submission?.durationMs !== undefined && (
          <div className="mt-0.5 text-xs text-(--theme-elevation-500)">
            {submission.durationMs} ms
          </div>
        )}
      </div>

      <div role="cell" className="flex min-w-0 flex-col gap-2">
        {recipient.events.map((event, index) => (
          <EventLine key={index} event={event} labels={labels} lang={lang} />
        ))}
        {recipient.events.length === 0 && submission?.accepted === true && (
          <span className="flex items-center gap-1 text-xs text-(--theme-elevation-500)">
            <HelpCircle aria-hidden="true" className={ICON_CLASS} />
            {labels.stateNoReport}
          </span>
        )}
      </div>

      <div role="cell" className="min-w-0">
        <div
          className={cn(
            'font-semibold',
            isProblem && 'text-(--theme-error-600)',
            recipient.state === 'delivered' && 'text-[#14592f] dark:text-[#b7e8c6]',
          )}
        >
          {stateLabel(recipient.state, labels)}
        </div>
        <div
          className={cn(
            'text-xs break-words',
            isProblem ? 'text-(--theme-error-600)' : 'text-(--theme-elevation-500)',
          )}
        >
          {stateHint(recipient, labels, isListed)}
        </div>
      </div>
    </div>
  );
};

const StateSummary: React.FC<{ attempt: DeliveryAttempt; labels: Labels }> = ({
  attempt,
  labels,
}) => (
  <>
    {STATE_ORDER.map((state) => {
      const count = attempt.recipients.filter((recipient) => recipient.state === state).length;
      if (count === 0) return;
      return (
        <Pill
          key={state}
          className={cn('text-sm', TONE_PILLS[STATE_TONES[state]].className)}
          pillStyle={TONE_PILLS[STATE_TONES[state]].pillStyle}
          size="small"
        >
          {count} {stateLabel(state, labels)}
        </Pill>
      );
    })}
  </>
);

/**
 * The delivery state of a mail as a table: one row per recipient, with the answer of our own
 * mail server, every report another server sent back, and what the two add up to.
 *
 * The rows stack on a narrow container, because the same field sits in the sidebar of a form
 * submission.
 */
export const DeliveryOverviewTable: React.FC<{
  overview: DeliveryOverview;
  lang: SmtpLanguage;
  smtpDomain: string;
}> = ({ overview, lang, smtpDomain }) => {
  const labels = LOCALIZED_SMTP_LABELS[lang];
  const { current, earlier } = overview;
  const gridClass = 'grid grid-cols-1 gap-2 @[640px]:grid-cols-[5fr_3fr_6fr_5fr] @[640px]:gap-4';

  const hasUnaddressed =
    current.unassigned.length > 0 || current.recipients.some((recipient) => !recipient.expected);

  const fromAddress = current.fromAddress ?? '';
  const hasForeignSender = fromAddress.length > 0 && !fromAddress.endsWith(`@${smtpDomain}`);

  return (
    <div className="@container">
      <div className="rounded border border-(--theme-elevation-150) bg-(--theme-elevation-0) text-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-(--theme-elevation-150) px-3 py-2">
          <StateSummary attempt={current} labels={labels} />
          {current.startedAt !== undefined && (
            <span className="ml-auto text-xs text-(--theme-elevation-500)">
              {labels.sentAt.replace('{time}', formatTime(current.startedAt, lang))}
            </span>
          )}
        </div>

        {hasForeignSender && (
          <div className="border-b border-(--theme-elevation-150) px-3 py-2 text-xs text-(--theme-warning-600)">
            {WARNING_MESSAGES[lang]
              .replace('{fromAddress}', fromAddress)
              .replace('{smtpDomain}', smtpDomain)}
          </div>
        )}

        <div role="table">
          <div
            role="row"
            className={cn(
              gridClass,
              'hidden border-b border-(--theme-elevation-150) bg-(--theme-elevation-50) px-3 py-2 text-xs font-semibold text-(--theme-elevation-500) @[640px]:grid',
            )}
          >
            <div role="columnheader">{labels.columnRecipient}</div>
            <div role="columnheader">{labels.columnSubmission}</div>
            <div role="columnheader">{labels.columnReports}</div>
            <div role="columnheader">{labels.columnState}</div>
          </div>
          {current.recipients.map((recipient) => (
            <RecipientRow
              key={recipient.address}
              recipient={recipient}
              labels={labels}
              lang={lang}
              gridClass={gridClass}
              isListed={hasUnaddressed}
            />
          ))}
        </div>

        {current.unassigned.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-(--theme-elevation-150) px-3 py-2">
            <div className="text-xs font-semibold text-(--theme-elevation-500)">
              {labels.unassigned}
            </div>
            {current.unassigned.map((event, index) => (
              <EventLine key={index} event={event} labels={labels} lang={lang} />
            ))}
          </div>
        )}

        {earlier.map((attempt, index) => (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 border-t border-(--theme-elevation-150) px-3 py-2 text-xs text-(--theme-elevation-500)"
          >
            <span>
              {labels.earlierAttempt} {formatTime(attempt.startedAt, lang)}
            </span>
            <StateSummary attempt={attempt} labels={labels} />
            <span className="break-words">
              {attempt.recipients.find((recipient) => recipient.state === 'notSent')?.submission
                ?.detail ?? ''}
            </span>
          </div>
        ))}

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-(--theme-elevation-150) bg-(--theme-elevation-50) px-3 py-2 text-xs text-(--theme-elevation-500)">
          <span>{labels.reportCount.replace('{count}', String(overview.reportCount))}</span>
          {overview.unreadableCount > 0 && (
            <span>
              {labels.unreadableCount.replace('{count}', String(overview.unreadableCount))}
            </span>
          )}
          {overview.lastFetchedAt !== undefined && (
            <span>
              {labels.lastFetched.replace('{time}', formatTime(overview.lastFetchedAt, lang))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
