import { SectionLabel } from '@/components/ui/section-label';
import type { LeaderNotes } from '@/features/schedule/api/viewer';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { withClockTimes } from '@/features/schedule/utils/programme-utils';
import { formatMinutesAsTime } from '@/features/schedule/utils/time-utils';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronRight, CloudRain, FileText, Lock, ShieldCheck, Users } from 'lucide-react';
import type React from 'react';

export type DetailTab = 'overview' | 'steps' | 'material' | 'safety';

/** The two tabs written for the people running the block; participants never get them. */
const LEADER_TABS = new Set<DetailTab>(['material', 'safety']);

export const DetailTabBar: React.FC<{
  tabs: DetailTab[];
  active: DetailTab;
  onSelect: (tab: DetailTab) => void;
  locale: Locale;
}> = ({ tabs, active, onSelect, locale }) => (
  <div role="tablist" className="border-line flex gap-5 overflow-x-auto border-b">
    {tabs.map((tab) => (
      <button
        key={tab}
        type="button"
        role="tab"
        aria-selected={tab === active}
        onClick={() => onSelect(tab)}
        className={cn(
          'flex h-11 shrink-0 cursor-pointer items-center gap-1 border-b-2 text-sm font-semibold',
          tab === active
            ? 'border-conveniat-green text-green-900'
            : 'border-transparent text-green-700',
        )}
      >
        {LEADER_TABS.has(tab) && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
        {programmeLabels[tab][locale]}
      </button>
    ))}
  </div>
);

const LeadersOnlyNote: React.FC<{ locale: Locale }> = ({ locale }) => (
  <p className="flex items-center gap-1.5 text-[13px] text-green-700">
    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
    {programmeLabels.leadersOnly[locale]}
  </p>
);

type Steps = NonNullable<CampScheduleEntryFrontendType['steps']>;

/** The steps of the block with the clock times of this slot, grouped by its three parts. */
export const StepsTab: React.FC<{
  steps: Steps;
  startMinutes: number;
  accentText: string;
  locale: Locale;
}> = ({ steps, startMinutes, accentText, locale }) => {
  const timed = withClockTimes(steps, startMinutes);

  return (
    <div>
      {timed.map((step, index) => (
        <div key={step.id ?? index}>
          {step.phase !== timed[index - 1]?.phase && (
            <div
              className={cn(
                'pt-2 pl-14 text-[11px] font-bold tracking-wider uppercase',
                accentText,
              )}
            >
              {programmeLabels[step.phase][locale]}
            </div>
          )}
          <div className="border-line grid grid-cols-[2.75rem_1fr] gap-3 border-b py-2.5">
            <time className="text-xs leading-snug font-semibold text-green-900 tabular-nums">
              {formatMinutesAsTime(step.startsAt)}
              <span className="block font-normal text-green-500">{step.duration}′</span>
            </time>
            <div className="min-w-0">
              <h4 className="text-[15px] font-semibold text-green-900">{step.title}</h4>
              {step.text && (
                <p className="mt-0.5 text-[13px] leading-relaxed whitespace-pre-line text-green-700">
                  {step.text}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MaterialTab: React.FC<{ notes: LeaderNotes; locale: Locale }> = ({
  notes,
  locale,
}) => {
  const materials = notes.materials ?? [];
  const attachments = (notes.attachments ?? []).filter(
    (document) => typeof document === 'object' && typeof document.url === 'string',
  );

  return (
    <div className="space-y-4">
      <LeadersOnlyNote locale={locale} />

      {materials.length > 0 && (
        <section>
          <SectionLabel as="h3">{programmeLabels.materialList[locale]}</SectionLabel>
          <table className="mt-1 w-full text-[13px]">
            <tbody>
              {materials.map((material, index) => (
                <tr key={material.id ?? index} className="border-line border-b align-top">
                  <td className="w-16 py-2 pr-2 text-green-700 tabular-nums">{material.amount}</td>
                  <td className="py-2 text-green-900">{material.item}</td>
                  <td className="py-2 pl-2 text-right text-xs text-green-700">
                    {material.responsible}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {attachments.length > 0 && (
        <section>
          <SectionLabel as="h3">{programmeLabels.attachments[locale]}</SectionLabel>
          <div className="border-line divide-line mt-2 divide-y overflow-hidden rounded-[14px] border bg-white">
            {attachments.map((document) =>
              typeof document === 'object' ? (
                <a
                  key={document.id}
                  href={document.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 items-center gap-3 px-3.5 py-2.5 text-[15px]"
                >
                  <FileText className="text-conveniat-green h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-green-900">
                    {document.title ?? document.filename}
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
                </a>
              ) : undefined,
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export const SafetyTab: React.FC<{ notes: LeaderNotes; locale: Locale }> = ({ notes, locale }) => {
  const cards = [
    { icon: ShieldCheck, title: programmeLabels.safetyNotes[locale], text: notes.safety },
    { icon: Users, title: programmeLabels.safeguarding[locale], text: notes.safeguarding },
    { icon: CloudRain, title: programmeLabels.badWeather[locale], text: notes.badWeather },
  ].filter(({ text }) => hasText(text));

  return (
    <div className="space-y-2">
      <LeadersOnlyNote locale={locale} />
      {cards.map(({ icon: Icon, title, text }) => (
        <section key={title} className="border-line rounded-[14px] border bg-white p-3.5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-green-900">
            <Icon className="text-conveniat-green h-4 w-4" aria-hidden="true" />
            {title}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line text-green-700">
            {text}
          </p>
        </section>
      ))}
    </div>
  );
};

const hasText = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.trim() !== '';

/** Which leader tabs a block has something to show in. */
export const leaderTabsOf = (notes: LeaderNotes | null | undefined): DetailTab[] => {
  if (notes === null || notes === undefined) return [];
  const tabs: DetailTab[] = [];
  if ((notes.materials ?? []).length > 0 || (notes.attachments ?? []).length > 0) {
    tabs.push('material');
  }
  if (hasText(notes.safety) || hasText(notes.safeguarding) || hasText(notes.badWeather)) {
    tabs.push('safety');
  }
  return tabs;
};
