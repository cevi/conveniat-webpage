'use client';

import { Button } from '@/components/ui/buttons/button';
import { listRowClassName } from '@/components/ui/list-row';
import { personName, shortUid } from '@/features/wristbands/components/band-labels';
import { wristbandErrorTexts } from '@/features/wristbands/error-texts';
import { translate } from '@/features/wristbands/texts';
import type { HofPerson } from '@/features/wristbands/types';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { ChevronDown, Loader2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

const PersonText: React.FC<{ person: HofPerson; locale: Locale }> = ({ person, locale }) => (
  <>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-semibold text-green-900">
        {person.fullName}
      </span>
      {person.nickname !== null && person.nickname !== '' && (
        <span className="block truncate text-[13px] text-green-700">{person.nickname}</span>
      )}
    </span>
    <span
      className={cn(
        'shrink-0 text-[13px] tabular-nums',
        person.band === null ? 'text-green-500' : 'font-semibold text-green-900',
      )}
    >
      {person.band === null ? translate('noBand', locale) : shortUid(person.band.uid)}
    </span>
  </>
);

/**
 * A person of the Hof and the band they wear. A person with a band opens the band's actions
 * right under the row: give it to someone else, take it back, or block it as lost, which asks
 * first because only the admins can release it again.
 */
export const PersonRow: React.FC<{
  hofId: string;
  person: HofPerson;
  locale: Locale;
  expanded: boolean;
  onToggle: () => void;
  onReassign: (uid: string) => void;
}> = ({ hofId, person, locale, expanded, onToggle, onReassign }) => {
  const utils = trpc.useUtils();
  const unassign = trpc.wristband.unassignWristband.useMutation();
  const revoke = trpc.wristband.revokeWristband.useMutation();
  const [askingRevoke, setAskingRevoke] = useState(false);
  const band = person.band;
  const busy = unassign.isPending || revoke.isPending;

  if (band === null) {
    return (
      <li className="flex min-h-14 items-center gap-3 px-4 py-2.5">
        <PersonText person={person} locale={locale} />
      </li>
    );
  }

  const uid = shortUid(band.uid);
  const done = async (message: string): Promise<void> => {
    toast.success(message);
    setAskingRevoke(false);
    onToggle();
    await utils.wristband.getHofWristbandList.invalidate({ hofId });
  };
  const failed = async (error: unknown): Promise<void> => {
    toast.error(userErrorMessage(error, locale, wristbandErrorTexts));
    await utils.wristband.getHofWristbandList.invalidate({ hofId });
  };

  return (
    <li>
      <button
        type="button"
        className={listRowClassName()}
        aria-expanded={expanded}
        aria-label={`${person.fullName}, ${translate('band', locale, { uid })}`}
        onClick={() => {
          setAskingRevoke(false);
          onToggle();
        }}
      >
        <PersonText person={person} locale={locale} />
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
          {askingRevoke ? (
            <div className="bg-danger-soft space-y-3 rounded-xl p-3">
              <p className="text-danger-text text-[15px] leading-normal">
                {translate('revokeAsk', locale, { uid, name: personName(person) })}
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
                        onSuccess: () => void done(translate('revoked', locale, { uid })),
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
                onClick={() => onReassign(band.uid)}
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
                      onSuccess: () => void done(translate('unassigned', locale, { uid })),
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
