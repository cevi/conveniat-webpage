'use client';
import { SetHeaderActions } from '@/components/header/header-actions';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import { BandIdentityCard } from '@/features/wristbands/components/band-identity-card';
import { ReadBandCard } from '@/features/wristbands/components/read-band-card';
import { BandContacts } from '@/features/wristbands/components/tag-view';
import { useNativeNfcAvailable } from '@/features/wristbands/hooks/use-native-nfc-available';
import { useReadWristband } from '@/features/wristbands/hooks/use-read-wristband';
import type { RosterOnPhone } from '@/features/wristbands/hooks/use-wristband-roster';
import { useWristbandRoster } from '@/features/wristbands/hooks/use-wristband-roster';
import { formatCampTime, readerText } from '@/features/wristbands/reader-texts';
import { translate } from '@/features/wristbands/texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { ListChecks, Loader2, Nfc, ShieldOff } from 'lucide-react';
import type React from 'react';

import { useQuery } from '@tanstack/react-query';

const Loading: React.FC<{ locale: Locale }> = ({ locale }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-green-500">
    <Loader2 className="size-4 animate-spin" aria-hidden />
    {translate('loading', locale)}
  </div>
);

/** How much the list on the phone holds and how old it is, the base of every offline answer. */
const RosterStatus: React.FC<{ roster: RosterOnPhone; locale: Locale }> = ({ roster, locale }) => {
  let summary: string;
  if (roster.data !== undefined) {
    summary = readerText('rosterSummary', locale, {
      // a list an older app left on the phone may lack it
      n: Array.isArray(roster.data.entries) ? roster.data.entries.length : 0,
      time: formatCampTime(roster.updatedAt, locale),
    });
  } else if (roster.fetching) {
    summary = readerText('rosterLoading', locale);
  } else {
    summary = readerText('rosterMissing', locale);
  }

  return (
    <section className="space-y-2">
      <SectionLabel className="px-1">{readerText('roster', locale)}</SectionLabel>
      <div className="bg-quiet flex items-start gap-3 rounded-[14px] p-4">
        <IconTile icon={ListChecks} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-green-900 tabular-nums">{summary}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[13px] leading-normal text-green-700">
            {roster.data !== undefined && roster.fetching && (
              <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
            )}
            {roster.data !== undefined && roster.fetching
              ? readerText('rosterRefreshing', locale)
              : readerText('rosterHint', locale)}
          </p>
        </div>
      </div>
    </section>
  );
};

/** Reading bands: the main action, the answer, and the list that answers offline. */
const Reader: React.FC<{ roster: RosterOnPhone; locale: Locale }> = ({ roster, locale }) => {
  const nfcAvailable = useNativeNfcAvailable();
  const read = useReadWristband(roster);

  return (
    <div className="space-y-6">
      {nfcAvailable === true && (
        <ReadBandCard
          state={read.state}
          locale={locale}
          onStart={read.start}
          onCancel={read.cancel}
        />
      )}
      {nfcAvailable === false && (
        <div className="bg-quiet flex items-start gap-3 rounded-[14px] p-4">
          <IconTile icon={Nfc} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-balance text-green-900">
              {readerText('notInAppTitle', locale)}
            </h2>
            <p className="mt-0.5 text-[13px] leading-normal text-balance text-green-700">
              {readerText('notInAppDescription', locale)}
            </p>
          </div>
        </div>
      )}

      {read.state.step === 'read' && (
        <BandIdentityCard
          identity={read.state.result.identity}
          fromRoster={read.state.result.fromRoster}
          locale={locale}
        />
      )}
      {/* the chats need the server, which the list on the phone answered without */}
      {read.state.step === 'read' && read.state.result.fromRoster === null && (
        <BandContacts
          key={read.state.result.identity.uid}
          uid={read.state.result.identity.uid}
          signature={read.state.result.signature}
        />
      )}

      <RosterStatus roster={roster} locale={locale} />
    </div>
  );
};

/**
 * The page security and first aid read a band on, in the native app: who wears it, of which
 * Hof and Quartier. Without a connection the list on the phone answers. Everyone else is told
 * the page is not theirs, and the list never reaches their phone.
 */
export const ReaderView: React.FC = () => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const accessQuery = useQuery(trpc.wristband.getWristbandAccess.queryOptions());
  const reader = accessQuery.data?.reader;
  const roster = useWristbandRoster(reader);

  let content: React.ReactNode;
  if (reader === true) {
    content = <Reader roster={roster} locale={locale} />;
  } else if (reader === false) {
    content = (
      <EmptyState
        icon={ShieldOff}
        title={readerText('notReaderTitle', locale)}
        description={readerText('notReaderDescription', locale)}
      />
    );
  } else if (accessQuery.isError) {
    content = (
      <EmptyState
        icon={Nfc}
        title={translate('loadFailed', locale)}
        action={
          <Button variant="outlined" size="touch" onClick={() => void accessQuery.refetch()}>
            {translate('reload', locale)}
          </Button>
        }
      />
    );
  } else {
    content = <Loading locale={locale} />;
  }

  return (
    <>
      <SetHeaderActions />
      {content}
    </>
  );
};
