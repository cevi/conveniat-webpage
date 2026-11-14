'use client';

import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLabel } from '@/components/ui/section-label';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import type { HofShiftDay, HofShiftOverview } from '@/features/schedule/api/hof-shift-overview';
import { ShiftsComponent } from '@/features/schedule/components/shifts-component';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Share2, Users } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const texts = {
  totalLine: {
    de: '{done} von {quota} Einsätzen besetzt',
    en: '{done} of {quota} shifts filled',
    fr: '{done} services sur {quota} assurés',
  },
  totalHint: {
    de: 'Kontingent vom Helferpool. Es zählen alle Anmeldungen von Leuten aus deinem Hof, zwei Einsätze einer Person doppelt.',
    en: 'Quota set by the Helferpool. Every enrolment of people of your Hof counts, two shifts of one person twice.',
    fr: 'Quota fixé par le Helferpool. Chaque inscription de personnes de ton Hof compte, deux services d’une même personne deux fois.',
  },
  perDay: { de: 'Pro Tag', en: 'Per day', fr: 'Par jour' },
  ofQuota: { de: '{done} von {quota}', en: '{done} of {quota}', fr: '{done} sur {quota}' },
  enrolledOnly: { de: '{done} angemeldet', en: '{done} enrolled', fr: '{done} inscrits' },
  reached: { de: 'erreicht', en: 'reached', fr: 'atteint' },
  present: { de: 'Da', en: 'There', fr: 'Présent' },
  absent: { de: 'Fehlt', en: 'Missing', fr: 'Absent' },
  missing: { de: 'noch {n} gesucht', en: '{n} more needed', fr: 'encore {n}' },
  noOne: {
    de: 'Noch niemand aus deinem Hof angemeldet.',
    en: 'Nobody from your Hof enrolled yet.',
    fr: 'Personne de ton Hof n’est encore inscrit.',
  },
  enrolledAt: { de: 'angemeldet {when}', en: 'enrolled {when}', fr: 'inscrit {when}' },
  remind: { de: 'Hof erinnern', en: 'Remind the Hof', fr: 'Rappeler au Hof' },
  remindHint: {
    de: 'Teilt eine Nachricht mit den offenen Tagen, z.B. in euren Hof-Chat.',
    en: 'Shares a message with the open days, e.g. into your Hof chat.',
    fr: 'Partage un message avec les jours ouverts, p. ex. dans le chat de ton Hof.',
  },
  copied: { de: 'Nachricht kopiert', en: 'Message copied', fr: 'Message copié' },
  remindIntro: {
    de: '{hof} braucht noch Leute für die Schichteinsätze:',
    en: '{hof} still needs people for the shifts:',
    fr: '{hof} a encore besoin de monde pour les services :',
  },
  remindLine: { de: '{day}: noch {n}', en: '{day}: {n} more', fr: '{day} : encore {n}' },
  remindOutro: {
    de: 'Melde dich in der App unter Schichteinsätze an:',
    en: 'Enrol in the app under Schichteinsätze:',
    fr: 'Inscris-toi dans l’app sous Schichteinsätze :',
  },
  emptyTitle: {
    de: 'Noch keine Schichteinsätze für deinen Hof',
    en: 'No shifts for your Hof yet',
    fr: 'Pas encore de services pour ton Hof',
  },
  emptyHint: {
    de: 'Sobald der Helferpool ein Kontingent setzt oder sich jemand aus deinem Hof anmeldet, siehst du es hier.',
    en: 'As soon as the Helferpool sets a quota or someone from your Hof enrols, you see it here.',
    fr: 'Dès que le Helferpool fixe un quota ou que quelqu’un de ton Hof s’inscrit, tu le vois ici.',
  },
} satisfies Record<string, StaticTranslationString>;

const fill = (text: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    text,
  );

const dayParts = (locale: Locale, day: string): { weekday: string; date: string } => {
  const date = new Date(`${day}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat(`${locale}-CH`, { weekday: 'short', timeZone: 'UTC' })
      .format(date)
      .replace('.', ''),
    date: new Intl.DateTimeFormat(`${locale}-CH`, {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'UTC',
    }).format(date),
  };
};

/** "12. Juni, 14:32" in Zurich time, the camp's time. */
const formatEnrolledAt = (locale: Locale, iso: string): string =>
  new Intl.DateTimeFormat(`${locale}-CH`, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  }).format(new Date(iso));

const Rail: React.FC<{ done: number; quota: number; label: string }> = ({ done, quota, label }) => (
  <div
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={quota}
    aria-valuenow={done}
    aria-label={label}
    className="bg-quiet h-1.5 w-full overflow-hidden rounded-full"
  >
    <div
      className="bg-conveniat-green h-full rounded-full"
      style={{ width: `${String(Math.min(100, (done / Math.max(quota, 1)) * 100))}%` }}
    />
  </div>
);

const NeedPill: React.FC<{ done: number; quota: number; locale: Locale }> = ({
  done,
  quota,
  locale,
}) =>
  done >= quota ? (
    <span className="border-tint-line bg-tint inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold text-green-800">
      <Check className="h-3 w-3" aria-hidden="true" />
      {texts.reached[locale]}
    </span>
  ) : (
    <span className="border-danger-line bg-danger-soft text-danger-text inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold">
      {fill(texts.missing[locale], { n: quota - done })}
    </span>
  );

/** Whether the person came, once the Schichtleitung marked it; nothing before. */
const AttendanceChip: React.FC<{
  attendance: 'PRESENT' | 'ABSENT' | null | undefined;
  locale: Locale;
}> = ({ attendance, locale }) => {
  if (attendance === 'PRESENT') {
    return (
      <span className="border-tint-line bg-tint inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold text-green-800">
        <Check className="h-3 w-3" aria-hidden="true" />
        {texts.present[locale]}
      </span>
    );
  }
  if (attendance === 'ABSENT') {
    return (
      <span className="border-danger-line bg-danger-soft text-danger-text inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold">
        {texts.absent[locale]}
      </span>
    );
  }
  return <></>;
};

const DayRow: React.FC<{ day: HofShiftDay; locale: Locale; isLast: boolean }> = ({
  day,
  locale,
  isLast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { weekday, date } = dayParts(locale, day.day);
  const people = Array.isArray(day.people) ? day.people : [];
  const summary =
    day.quota === undefined
      ? fill(texts.enrolledOnly[locale], { done: day.enrolled })
      : fill(texts.ofQuota[locale], { done: day.enrolled, quota: day.quota });

  return (
    <li className={cn(!isLast && 'border-line border-b')}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="focus-visible:focus-row flex min-h-14 w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        <span className="flex w-11 shrink-0 flex-col items-center">
          <span className="text-[11px] font-semibold tracking-wide text-green-700 uppercase">
            {weekday}
          </span>
          <span className="font-heading text-heading text-[15px] font-extrabold tabular-nums">
            {date}
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex items-center justify-between gap-2">
            <span className="font-heading text-heading text-[15px] font-bold tabular-nums">
              {summary}
            </span>
            {day.quota !== undefined && (
              <NeedPill done={day.enrolled} quota={day.quota} locale={locale} />
            )}
          </span>
          {day.quota !== undefined && (
            <Rail done={day.enrolled} quota={day.quota} label={summary} />
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-green-700 transition-transform',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div className="bg-page px-3.5 pb-3">
          {people.length === 0 ? (
            <p className="py-2 text-[15px] text-green-700">{texts.noOne[locale]}</p>
          ) : (
            <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
              {people.map((person) => (
                <li key={`${person.shiftId} ${person.name}`} className="px-3.5 py-2.5">
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-heading text-[15px] font-semibold">{person.name}</span>
                    <AttendanceChip attendance={person.attendance} locale={locale} />
                  </p>
                  <p className="text-[13.5px] text-green-700">
                    {person.shiftTitle} · {person.time.replace(' - ', '–')}
                  </p>
                  <p className="text-[13px] text-green-500">
                    {fill(texts.enrolledAt[locale], {
                      when: formatEnrolledAt(locale, person.enrolledAt),
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

/** The message "Hof erinnern" shares: the days still short, and where to enrol. */
const reminderText = (locale: Locale, hofName: string, days: HofShiftDay[]): string => {
  const openDays = days.filter((day) => day.quota !== undefined && day.enrolled < day.quota);
  const lines = openDays.map((day) => {
    const { weekday, date } = dayParts(locale, day.day);
    return `– ${fill(texts.remindLine[locale], {
      day: `${weekday} ${date}`,
      n: (day.quota ?? 0) - day.enrolled,
    })}`;
  });
  return [
    fill(texts.remindIntro[locale], { hof: hofName }),
    ...lines,
    texts.remindOutro[locale],
    `${globalThis.location.origin}/app/helper-portal`,
  ].join('\n');
};

/**
 * "Mein Hof" on the Schichteinsätze: for the AVP, what the Helferpool asks of their Hof per day,
 * how far its people got, and who enrolled for which shift and when. One action, sharing the
 * days still short to the Hof, since the AVP asks people and does not enrol them.
 */
export const HofShiftsView: React.FC<{ locale: Locale }> = ({ locale }) => {
  const trpc = useTRPC();
  const [hofId, setHofId] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const { data } = useQuery(
    trpc.shifts.getHofShiftOverview.queryOptions(hofId === undefined ? undefined : { hofId }),
  );

  // read defensively: a persisted cache from an older build may hold another shape
  const overview: HofShiftOverview | undefined = data;
  const hoefe = Array.isArray(overview?.hoefe) ? overview.hoefe : [];
  const days = Array.isArray(overview?.days) ? overview.days : [];
  const hof = hoefe.find((entry) => entry.id === overview?.hofId);
  // a link to "Mein Hof" opened by someone who is AVP of no Hof shows the shifts instead
  if (hof === undefined) return data === undefined ? <></> : <ShiftsComponent locale={locale} />;

  const withQuota = days.filter((day) => day.quota !== undefined);
  const quota = withQuota.reduce((sum, day) => sum + (day.quota ?? 0), 0);
  const done = withQuota.reduce((sum, day) => sum + Math.min(day.enrolled, day.quota ?? 0), 0);

  const remind = async (): Promise<void> => {
    const text = reminderText(locale, hof.name, days);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
      } catch {
        // dismissing the share sheet rejects like a failure; there is nothing left to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 sm:p-6">
      {hoefe.length > 1 && (
        <div className={segmentedTrackClassName} role="group">
          {hoefe.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={entry.id === hof.id}
              className={cn(segmentClassName(entry.id === hof.id), 'flex-1 text-[15px]')}
              onClick={() => setHofId(entry.id)}
            >
              <span className="truncate px-2">{entry.name}</span>
            </button>
          ))}
        </div>
      )}

      {days.length === 0 ? (
        <EmptyState
          icon={Users}
          title={texts.emptyTitle[locale]}
          description={texts.emptyHint[locale]}
        />
      ) : (
        <>
          {quota > 0 && (
            <div className="border-line rounded-[14px] border bg-white p-3.5">
              <span className="bg-conveniat-green inline-block rounded-[5px] px-1.5 py-0.5 text-[12px] font-semibold text-white">
                {hof.name}
              </span>
              <p className="font-heading text-heading mt-1.5 text-[18px] font-bold tabular-nums">
                {fill(texts.totalLine[locale], { done, quota })}
              </p>
              <div className="mt-2.5 mb-3">
                <Rail
                  done={done}
                  quota={quota}
                  label={fill(texts.totalLine[locale], { done, quota })}
                />
              </div>
              <p className="text-[13.5px] leading-[19px] text-green-700">
                {texts.totalHint[locale]}
              </p>
            </div>
          )}

          <section>
            <SectionLabel>{texts.perDay[locale]}</SectionLabel>
            <ul className="border-line mt-2 overflow-hidden rounded-[14px] border bg-white">
              {days.map((day, index) => (
                <DayRow
                  key={day.day}
                  day={day}
                  locale={locale}
                  isLast={index === days.length - 1}
                />
              ))}
            </ul>
          </section>

          {done < quota && (
            <div>
              <Button
                variant="primary"
                size="touch"
                className="w-full"
                onClick={() => void remind()}
              >
                {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
                {copied ? texts.copied[locale] : texts.remind[locale]}
              </Button>
              <p className="mt-2 text-[13px] text-green-700">{texts.remindHint[locale]}</p>
            </div>
          )}
        </>
      )}
    </article>
  );
};
