'use client';

import { Button } from '@/components/ui/buttons/button';
import { listRowClassName } from '@/components/ui/list-row';
import { personName } from '@/features/wristbands/components/band-labels';
import { wristbandErrorTexts } from '@/features/wristbands/error-texts';
import { translate } from '@/features/wristbands/texts';
import type { HofPerson } from '@/features/wristbands/types';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { Check, ChevronDown, CircleAlert, Loader2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

/** Ceviname and, on a Hof of several Abteilungen, the person's. */
const detailsOf = (person: HofPerson, showAbteilung: boolean): string =>
  [person.nickname, showAbteilung ? person.abteilung : null]
    .filter((part) => part !== null && part !== '')
    .join(' · ');

const PersonText: React.FC<{ person: HofPerson; locale: Locale; showAbteilung: boolean }> = ({
  person,
  locale,
  showAbteilung,
}) => {
  const details = detailsOf(person, showAbteilung);
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-green-900">
          {person.fullName}
        </span>
        {details !== '' && (
          <span className="block truncate text-[13px] text-green-700">{details}</span>
        )}
      </span>
      <span
        className={cn(
          'flex shrink-0 items-center gap-1 text-[13px]',
          person.band === null ? 'text-green-500' : 'font-semibold text-green-900',
        )}
      >
        {person.band !== null && <Check className="text-conveniat-green size-4" aria-hidden />}
        {translate(person.band === null ? 'noBand' : 'hasBand', locale)}
      </span>
    </>
  );
};

/**
 * A person of the Hof and whether they wear a band, never its UID: an AVP knows a band by who
 * wears it. A person with a band opens the band's actions
 * right under the row: give it to someone else, take it back, or block it as lost, which asks
 * first because only the admins can release it again.
 */
export const PersonRow: React.FC<{
  hofId: string;
  person: HofPerson;
  locale: Locale;
  showAbteilung: boolean;
  expanded: boolean;
  onToggle: () => void;
  onReassign: (person: HofPerson) => void;
}> = ({ hofId, person, locale, showAbteilung, expanded, onToggle, onReassign }) => {
  const utils = trpc.useUtils();
  const unassign = trpc.wristband.unassignWristband.useMutation();
  const revoke = trpc.wristband.revokeWristband.useMutation();
  const [askingRevoke, setAskingRevoke] = useState(false);
  const [problem, setProblem] = useState<string | undefined>();
  const band = person.band;
  const busy = unassign.isPending || revoke.isPending;

  if (band === null) {
    return (
      <li className="flex min-h-14 items-center gap-3 px-4 py-2.5">
        <PersonText person={person} locale={locale} showAbteilung={showAbteilung} />
      </li>
    );
  }

  const name = personName(person);
  // the row confirms by itself: once the list is fresh, it says "kein Band"
  const done = async (): Promise<void> => {
    setAskingRevoke(false);
    setProblem(undefined);
    onToggle();
    await utils.wristband.getHofWristbandList.invalidate({ hofId });
  };
  const failed = async (error: unknown): Promise<void> => {
    setProblem(userErrorMessage(error, locale, wristbandErrorTexts));
    await utils.wristband.getHofWristbandList.invalidate({ hofId });
  };

  return (
    <li>
      <button
        type="button"
        className={listRowClassName()}
        aria-expanded={expanded}
        aria-label={`${person.fullName}, ${translate('hasBand', locale)}`}
        onClick={() => {
          setAskingRevoke(false);
          setProblem(undefined);
          onToggle();
        }}
      >
        <PersonText person={person} locale={locale} showAbteilung={showAbteilung} />
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-green-500 transition-transform',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {expanded && (
        <div
          role="group"
          aria-label={translate('bandActions', locale, { name: person.fullName })}
          className="grid gap-2 px-4 pb-4"
        >
          {problem !== undefined && (
            <p
              role="alert"
              className="border-danger-line bg-danger-soft text-danger-text flex items-start gap-2 rounded-xl border p-3 text-[15px] leading-snug"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {problem}
            </p>
          )}
          {askingRevoke ? (
            <div className="bg-danger-soft space-y-3 rounded-xl p-3">
              <p className="text-danger-text text-[15px] leading-normal">
                {translate('revokeAsk', locale, { name })}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="quiet"
                  size="touch"
                  disabled={busy}
                  onClick={() => setAskingRevoke(false)}
                >
                  {translate('cancel', locale)}
                </Button>
                <Button
                  variant="danger"
                  size="touch"
                  disabled={busy}
                  onClick={() =>
                    revoke.mutate(
                      { hofId, uid: band.uid },
                      {
                        onSuccess: () => void done(),
                        onError: (error) => void failed(error),
                      },
                    )
                  }
                >
                  {revoke.isPending && <Loader2 className="animate-spin" aria-hidden />}
                  {translate('revokeYes', locale)}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                variant="outlined"
                size="touch"
                disabled={busy}
                onClick={() => onReassign(person)}
              >
                {translate('reassign', locale)}
              </Button>
              <Button
                variant="outlined"
                size="touch"
                disabled={busy}
                onClick={() =>
                  unassign.mutate(
                    { hofId, uid: band.uid },
                    {
                      onSuccess: () => void done(),
                      onError: (error) => void failed(error),
                    },
                  )
                }
              >
                {unassign.isPending && <Loader2 className="animate-spin" aria-hidden />}
                {translate('unassign', locale)}
              </Button>
              <Button
                variant="danger"
                size="touch"
                disabled={busy}
                onClick={() => setAskingRevoke(true)}
              >
                {translate('revoke', locale)}
              </Button>
            </>
          )}
        </div>
      )}
    </li>
  );
};
