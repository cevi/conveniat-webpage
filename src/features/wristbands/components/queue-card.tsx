'use client';

import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLabel } from '@/components/ui/section-label';
import { ScanStatus } from '@/features/wristbands/components/scan-status';
import type { ScanNotice, ScanPhase } from '@/features/wristbands/hooks/use-band-scanner';
import type { Queue } from '@/features/wristbands/queue';
import { translate } from '@/features/wristbands/texts';
import type { HofPerson } from '@/features/wristbands/types';
import type { Locale } from '@/types/types';
import { PartyPopper, Search, SkipForward } from 'lucide-react';
import type React from 'react';

/** Ceviname, Abteilung and, for a leader, that they lead: what tells two Lea Meier apart. */
const detailsOf = (person: HofPerson, locale: Locale): string =>
  [
    person.nickname,
    person.abteilung,
    person.role === 'leader' ? translate('leaders', locale) : null,
  ]
    .filter((part) => part !== null && part !== '')
    .join(' · ');

const NameRow: React.FC<{ person: HofPerson; locale: Locale; children?: React.ReactNode }> = ({
  person,
  locale,
  children,
}) => {
  const details = detailsOf(person, locale);
  return (
    <li className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-green-900">
          {person.fullName}
        </span>
        {details !== '' && (
          <span className="block truncate text-[13px] text-green-700">{details}</span>
        )}
      </span>
      {children}
    </li>
  );
};

/**
 * "Jetzt dran": the person the next band goes to, large enough to call out across the Hof, with
 * the scanner under the name, and who comes after. Skipped people wait under "Übersprungen"
 * until they are brought back.
 */
export const QueueCard: React.FC<{
  queue: Queue;
  locale: Locale;
  /** says why nobody is up: everybody of the Hof, or of the chosen filters, wears a band */
  emptyText: string;
  phase: ScanPhase;
  notice: ScanNotice | undefined;
  onResume: () => void;
  onSkip: (person: HofPerson) => void;
  onChoose: () => void;
  onBringBack: (person: HofPerson) => void;
}> = ({ queue, locale, emptyText, phase, notice, onResume, onSkip, onChoose, onBringBack }) => {
  const { current } = queue;
  const busy = phase === 'checking' || phase === 'writing' || phase === 'saving';
  const details = current === undefined ? '' : detailsOf(current, locale);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <SectionLabel className="px-1">{translate('nowUp', locale)}</SectionLabel>
        {current === undefined ? (
          <Card>
            <EmptyState icon={PartyPopper} title={emptyText} />
          </Card>
        ) : (
          <Card as="section" className="space-y-4 p-4">
            <div aria-live="polite">
              <h2 className="font-heading text-heading text-[28px] leading-tight font-extrabold break-words">
                {current.fullName}
              </h2>
              {details !== '' && (
                <p className="mt-1 text-[17px] leading-snug text-green-700">{details}</p>
              )}
            </div>
            <ScanStatus phase={phase} notice={notice} locale={locale} onResume={onResume} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="quiet" size="touch" disabled={busy} onClick={() => onSkip(current)}>
                <SkipForward aria-hidden />
                {translate('skip', locale)}
              </Button>
              <Button variant="outlined" size="touch" disabled={busy} onClick={onChoose}>
                <Search aria-hidden />
                {translate('choosePerson', locale)}
              </Button>
            </div>
          </Card>
        )}
      </section>

      {queue.next.length > 0 && (
        <section className="space-y-2">
          <SectionLabel className="px-1">{translate('after', locale)}</SectionLabel>
          <Card as="ul" divided>
            {queue.next.map((person) => (
              <NameRow key={person.registrationId} person={person} locale={locale} />
            ))}
          </Card>
        </section>
      )}

      {queue.skipped.length > 0 && (
        <section className="space-y-2">
          <SectionLabel className="px-1">
            {translate('skipped', locale)}
            <span className="tabular-nums"> · {queue.skipped.length}</span>
          </SectionLabel>
          <Card as="ul" divided>
            {queue.skipped.map((person) => (
              <NameRow key={person.registrationId} person={person} locale={locale}>
                <Button
                  variant="outlined"
                  size="touch"
                  aria-label={translate('bringBackLabel', locale, { name: person.fullName })}
                  onClick={() => onBringBack(person)}
                >
                  {translate('bringBack', locale)}
                </Button>
              </NameRow>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
};
