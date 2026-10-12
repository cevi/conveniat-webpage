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
import { Check, ChevronRight, Clock, CornerDownRight, X } from 'lucide-react';
import type React from 'react';

type Labels = (typeof LOCALIZED_SMTP_LABELS)[SmtpLanguage];
type PillStyle = NonNullable<React.ComponentProps<typeof Pill>['pillStyle']>;

const DATE_LOCALES: Record<SmtpLanguage, string> = { de: 'de-CH', fr: 'fr-CH', en: 'en-GB' };

// What needs a look comes first, in the summary and in the list.
const STATE_ORDER: RecipientState[] = ['failed', 'notSent', 'delayed', 'sent', 'delivered'];

/**
 * Green is kept for a delivery a server confirmed and red for a failure nothing will repair
 * on its own. Grey is the normal case of a mail that left without complaint, blue one a
 * server is still trying to deliver.
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
  sent: 'gray',
  delivered: 'green',
};

const stateLabel = (state: RecipientState, labels: Labels): string =>
  ({
    failed: labels.stateFailed,
    notSent: labels.stateNotSent,
    delayed: labels.stateDelayed,
    sent: labels.stateSent,
    delivered: labels.stateDelivered,
  })[state];

/** The few words next to the state: why it failed, or that nothing went wrong. */
const stateHint = (recipient: RecipientDelivery, labels: Labels): string => {
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
    case 'sent': {
      return labels.hintSent;
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

const StatePill: React.FC<{ state: RecipientState; labels: Labels }> = ({ state, labels }) => {
  const tone = STATE_TONES[state];
  let icon = <Check aria-hidden="true" className={ICON_CLASS} />;
  if (tone === 'red') icon = <X aria-hidden="true" className={ICON_CLASS} />;
  if (state === 'delayed') icon = <Clock aria-hidden="true" className={ICON_CLASS} />;

  return (
    <Pill
      alignIcon="left"
      className={cn(PILL_CLASS, TONE_PILLS[tone].className)}
      icon={icon}
      pillStyle={TONE_PILLS[tone].pillStyle}
      size="small"
    >
      {stateLabel(state, labels)}
    </Pill>
  );
};

const eventText = (event: DeliveryEvent, labels: Labels): string => {
  if (event.manual === true) return labels.trailManual;
  const template = {
    delivered: labels.trailDelivered,
    relayed: labels.trailHandedOver,
    expanded: labels.trailExpanded,
    failed: labels.trailFailed,
    delayed: labels.trailDelayed,
  }[event.action];
  return template.replace('{server}', event.server ?? labels.trailNoServer);
};

/** One line of what happened to a mail on its way, with the time it happened. */
const TrailLine: React.FC<{
  at: string | undefined;
  lang: SmtpLanguage;
  isProblem?: boolean;
  children: React.ReactNode;
}> = ({ at, lang, isProblem = false, children }) => (
  <div className={cn('flex gap-3', isProblem && 'text-(--theme-error-600)')}>
    <span className="w-24 shrink-0 whitespace-nowrap">{formatTime(at, lang)}</span>
    <span className="min-w-0 break-words">{children}</span>
  </div>
);

/** The technical trail of one recipient's mail: our own server's answer, then every report. */
const RecipientTrail: React.FC<{
  recipient: RecipientDelivery;
  labels: Labels;
  lang: SmtpLanguage;
}> = ({ recipient, labels, lang }) => {
  const { submission } = recipient;

  return (
    <div className="mx-3 mb-3 flex flex-col gap-1 rounded bg-(--theme-elevation-50) px-3 py-2 font-mono text-xs">
      {submission?.accepted === true && (
        <TrailLine at={submission.at} lang={lang}>
          {labels.trailAccepted}
          {submission.durationMs !== undefined && ` (${String(submission.durationMs)} ms)`}
        </TrailLine>
      )}
      {submission?.accepted === false && (
        <TrailLine at={submission.at} lang={lang} isProblem>
          {labels.trailNotAccepted}: {submission.detail}
        </TrailLine>
      )}
      {recipient.events.map((event, index) => {
        const answer = event.diagnostic ?? event.status;
        const showsAnswer = event.action === 'failed' || event.manual === true;
        return (
          <TrailLine key={index} at={event.at} lang={lang} isProblem={event.action === 'failed'}>
            {eventText(event, labels)}
            {showsAnswer && answer !== undefined && `: ${answer}`}
          </TrailLine>
        );
      })}
    </div>
  );
};

const RecipientRow: React.FC<{
  recipient: RecipientDelivery;
  labels: Labels;
  lang: SmtpLanguage;
}> = ({ recipient, labels, lang }) => {
  const isProblem = recipient.state === 'failed' || recipient.state === 'notSent';

  return (
    // Open where something went wrong, so the reason is there without a click.
    <details
      className="group border-t border-(--theme-elevation-100) first:border-t-0"
      open={isProblem}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 text-(--theme-elevation-500) transition-transform group-open:rotate-90"
        />
        <span className="flex min-w-0 flex-1 basis-56 items-center gap-1 break-all">
          {!recipient.expected && (
            <CornerDownRight
              aria-label={labels.notAddressed}
              className="h-3.5 w-3.5 shrink-0 text-(--theme-elevation-500)"
            />
          )}
          {recipient.address}
          {recipient.via !== undefined && (
            <span className="text-xs text-(--theme-elevation-500)">
              {labels.via.replace('{address}', recipient.via)}
            </span>
          )}
        </span>
        <span
          className={cn(
            'text-xs break-words',
            isProblem ? 'text-(--theme-error-600)' : 'text-(--theme-elevation-500)',
          )}
        >
          {stateHint(recipient, labels)}
        </span>
        <StatePill state={recipient.state} labels={labels} />
      </summary>
      <RecipientTrail recipient={recipient} labels={labels} lang={lang} />
    </details>
  );
};

/** How many recipients of an attempt are in each state, the ones needing a look first. */
export const StateSummary: React.FC<{ attempt: DeliveryAttempt; labels: Labels }> = ({
  attempt,
  labels,
}) => (
  <>
    {STATE_ORDER.map((state) => {
      const count = attempt.recipients.filter((recipient) => recipient.state === state).length;
      if (count === 0) return;
      const tone = TONE_PILLS[STATE_TONES[state]];
      return (
        <Pill
          key={state}
          className={cn('text-sm', tone.className)}
          pillStyle={tone.pillStyle}
          size="small"
        >
          {count} {stateLabel(state, labels)}
        </Pill>
      );
    })}
  </>
);

/**
 * The delivery state of a mail: one line per recipient with a single state, the ones that
 * failed first and opened. What each server answered sits behind the line.
 *
 * A mail counts as sent once our mail server took it and nobody reported a failure. That is
 * all most mail servers ever tell a sender, so a confirmed delivery is shown when there is
 * one and never expected.
 */
export const DeliveryOverviewList: React.FC<{
  overview: DeliveryOverview;
  lang: SmtpLanguage;
  smtpDomain: string;
}> = ({ overview, lang, smtpDomain }) => {
  const labels = LOCALIZED_SMTP_LABELS[lang];
  const { current, earlier } = overview;

  const recipients = current.recipients.toSorted(
    (a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state),
  );
  const fromAddress = current.fromAddress ?? '';
  const hasForeignSender = fromAddress.length > 0 && !fromAddress.endsWith(`@${smtpDomain}`);

  return (
    <div className="rounded border border-(--theme-elevation-150) bg-(--theme-elevation-0) text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-(--theme-elevation-150) px-3 py-2">
        <span className="font-semibold">
          {labels.recipientCount.replace('{count}', String(recipients.length))}
        </span>
        {current.startedAt !== undefined && (
          <span className="text-xs text-(--theme-elevation-500)">
            {labels.sentAt.replace('{time}', formatTime(current.startedAt, lang))}
          </span>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <StateSummary attempt={current} labels={labels} />
        </span>
      </div>

      {hasForeignSender && (
        <div className="border-b border-(--theme-elevation-150) px-3 py-2 text-xs text-(--theme-warning-600)">
          {WARNING_MESSAGES[lang]
            .replace('{fromAddress}', fromAddress)
            .replace('{smtpDomain}', smtpDomain)}
        </div>
      )}

      {recipients.map((recipient) => (
        <RecipientRow key={recipient.address} recipient={recipient} labels={labels} lang={lang} />
      ))}

      {current.unassigned.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-(--theme-elevation-150) px-3 py-2">
          <div className="text-xs font-semibold text-(--theme-elevation-500)">
            {labels.unassigned}
          </div>
          <div className="flex flex-col gap-1 font-mono text-xs">
            {current.unassigned.map((event, index) => (
              <TrailLine key={index} at={event.at} lang={lang}>
                {eventText(event, labels)}
              </TrailLine>
            ))}
          </div>
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

      <div className="flex flex-col gap-1 border-t border-(--theme-elevation-150) bg-(--theme-elevation-50) px-3 py-2 text-xs text-(--theme-elevation-500)">
        <span>{labels.sentMeaning}</span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
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
        </span>
      </div>
    </div>
  );
};
