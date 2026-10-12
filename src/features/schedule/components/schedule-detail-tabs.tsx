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

const sectionHeading = 'font-heading text-[11px] font-bold tracking-wider text-gray-500 uppercase';

export const DetailTabBar: React.FC<{
  tabs: DetailTab[];
  active: DetailTab;
  onSelect: (tab: DetailTab) => void;
  accentText: string;
  locale: Locale;
}> = ({ tabs, active, onSelect, accentText, locale }) => (
  <div role="tablist" className="flex gap-5 overflow-x-auto border-b border-gray-200">
    {tabs.map((tab) => (
      <button
        key={tab}
        type="button"
        role="tab"
        aria-selected={tab === active}
        onClick={() => onSelect(tab)}
        className={cn(
          'flex shrink-0 cursor-pointer items-center gap-1 border-b-2 py-2.5 text-sm font-semibold',
          tab === active ? 'border-current text-gray-900' : 'border-transparent text-gray-400',
        )}
      >
        {LEADER_TABS.has(tab) && <Lock className="h-3.5 w-3.5" />}
        <span className={cn(tab === active && accentText)}>{programmeLabels[tab][locale]}</span>
      </button>
    ))}
  </div>
);

const LeadersOnlyNote: React.FC<{ locale: Locale }> = ({ locale }) => (
  <p className="flex items-center gap-1.5 text-xs text-gray-500">
    <Lock className="h-3.5 w-3.5" />
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
          <div className="grid grid-cols-[2.75rem_1fr] gap-3 border-b border-gray-100 py-2.5">
            <time className="text-xs leading-snug font-semibold text-gray-900 tabular-nums">
              {formatMinutesAsTime(step.startsAt)}
              <span className="block font-normal text-gray-400">{step.duration}′</span>
            </time>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-gray-900">{step.title}</h4>
              {step.text && (
                <p className="mt-0.5 text-[13px] leading-relaxed whitespace-pre-line text-gray-500">
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
          <h3 className={sectionHeading}>{programmeLabels.materialList[locale]}</h3>
          <table className="mt-1 w-full text-[13px]">
            <tbody>
              {materials.map((material, index) => (
                <tr key={material.id ?? index} className="border-b border-gray-100 align-top">
                  <td className="w-16 py-2 pr-2 text-gray-500 tabular-nums">{material.amount}</td>
                  <td className="py-2 text-gray-900">{material.item}</td>
                  <td className="py-2 pl-2 text-right text-xs text-gray-500">
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
          <h3 className={sectionHeading}>{programmeLabels.attachments[locale]}</h3>
          <div className="mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white">
            {attachments.map((document) =>
              typeof document === 'object' ? (
                <a
                  key={document.id}
                  href={document.url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 border-b border-gray-100 px-3.5 py-2.5 text-sm last:border-b-0"
                >
                  <FileText className="text-conveniat-green h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-gray-900">
                    {document.title ?? document.filename}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
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
        <section key={title} className="rounded-2xl border border-gray-100 bg-white p-3.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Icon className="text-conveniat-green h-4 w-4" />
            {title}
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line text-gray-600">
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
