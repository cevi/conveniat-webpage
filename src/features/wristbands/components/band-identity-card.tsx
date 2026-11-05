import { Card } from '@/components/ui/card';
import { FactRow } from '@/components/ui/fact-row';
import { IconTile } from '@/components/ui/icon-tile';
import { formatUid } from '@/features/wristbands/components/band-labels';
import { formatCampTime, readerText } from '@/features/wristbands/reader-texts';
import type { WristbandIdentity } from '@/features/wristbands/types';
import type { Locale } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronRight,
  CircleAlert,
  CloudOff,
  Map as MapIcon,
  Nfc,
  ShieldQuestion,
  Tent,
} from 'lucide-react';
import type React from 'react';

/** A notice that is only good to know: neutral, with an icon. */
const Notice: React.FC<{
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <div className="bg-quiet flex items-start gap-3 rounded-[14px] p-4">
    <IconTile icon={icon} />
    <div className="min-w-0 flex-1">
      <h3 className="text-[15px] font-semibold text-green-900">{title}</h3>
      <p className="mt-0.5 text-[13px] leading-normal text-green-700">{description}</p>
      {children}
    </div>
  </div>
);

/** A band that names nobody because something is wrong with it: in the danger tokens. */
const Refusal: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <section
    role="alert"
    className="border-danger-line bg-danger-soft flex items-start gap-3 rounded-[14px] border p-4"
  >
    <CircleAlert className="text-danger mt-0.5 size-6 shrink-0" aria-hidden />
    <div className="min-w-0">
      <h2 className="font-heading text-danger-text text-[20px] leading-snug font-extrabold">
        {title}
      </h2>
      <p className="mt-1 text-[15px] leading-normal text-green-900">{description}</p>
    </div>
  </section>
);

/**
 * The band's UID, folded away: it means nothing to most people, but tells security and first
 * aid which band they hold when they report it.
 */
const BandDetails: React.FC<{ uid: string; locale: Locale }> = ({ uid, locale }) => (
  <details className="group px-1 text-[13px] text-green-700">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 font-semibold [&::-webkit-details-marker]:hidden">
      <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
      {readerText('details', locale)}
    </summary>
    <p className="pb-1 pl-5 tabular-nums">{readerText('uid', locale, { uid: formatUid(uid) })}</p>
  </details>
);

/** The wearer, large: the name, the Ceviname, and in one card the Hof and the Quartier. */
const Wearer: React.FC<{
  identity: Extract<WristbandIdentity, { state: 'assigned' }>;
  locale: Locale;
}> = ({ identity, locale }) => (
  <Card as="section">
    <div className="px-4 pt-4 pb-3" aria-live="polite">
      <h2 className="font-heading text-heading text-[28px] leading-tight font-extrabold">
        {identity.fullName}
      </h2>
      {identity.nickname !== null && identity.nickname !== '' && (
        <p className="mt-0.5 text-[17px] font-semibold text-green-700">v/o {identity.nickname}</p>
      )}
    </div>
    <div className="border-line border-t">
      {identity.hof !== '' && (
        <FactRow icon={Tent} title={identity.hof} sub={readerText('hof', locale)} />
      )}
      {identity.quartier !== null && (
        <FactRow icon={MapIcon} title={identity.quartier} sub={readerText('quartier', locale)} />
      )}
    </div>
  </Card>
);

/**
 * Whose a band is, as security and first aid read it: the wearer large and clear, or why the
 * band names nobody, and the band's UID under "Details". Only for them: nobody else sees a UID. Says when the answer comes from the list on the phone and how old that
 * is, and when the band's authenticity was not checked. Shows nothing the server did not send.
 */
export const BandIdentityCard: React.FC<{
  identity: WristbandIdentity;
  locale: Locale;
  /** the list on the phone answered, loaded at `updatedAt` */
  fromRoster?: { updatedAt: number } | null;
  /** a tap from the home screen, which reads the UID alone */
  coldTap?: boolean;
  /** under the note that the band was not checked, like the way to check it in the app */
  checkAction?: React.ReactNode;
}> = ({ identity, locale, fromRoster = null, coldTap = false, checkAction }) => {
  let body: React.ReactNode;
  switch (identity.state) {
    case 'assigned': {
      body = <Wearer identity={identity} locale={locale} />;
      break;
    }
    case 'not-genuine': {
      body = (
        <Refusal
          title={readerText('notGenuineTitle', locale)}
          description={readerText('notGenuineDescription', locale)}
        />
      );
      break;
    }
    case 'revoked': {
      body = (
        <Refusal
          title={readerText('revokedTitle', locale)}
          description={readerText('revokedDescription', locale)}
        />
      );
      break;
    }
    case 'unassigned': {
      body = (
        <Notice
          icon={Nfc}
          title={readerText('unassignedTitle', locale)}
          description={readerText('unassignedDescription', locale, { hof: identity.hof })}
        />
      );
      break;
    }
    case 'unknown': {
      body = (
        <Notice
          icon={Nfc}
          title={readerText('unknownTitle', locale)}
          description={readerText(
            fromRoster === null ? 'unknownDescription' : 'unknownOnRosterDescription',
            locale,
          )}
        />
      );
      break;
    }
  }

  return (
    <div className="space-y-3">
      {body}
      {identity.state === 'assigned' && !identity.verified && (
        <Notice
          icon={ShieldQuestion}
          title={readerText('notCheckedTitle', locale)}
          description={readerText(coldTap ? 'notCheckedColdTap' : 'notCheckedNoSignature', locale)}
        >
          {checkAction}
        </Notice>
      )}
      {fromRoster !== null && (
        <Notice
          icon={CloudOff}
          title={readerText('fromRosterTitle', locale, {
            time: formatCampTime(fromRoster.updatedAt, locale),
          })}
          description={readerText('fromRosterDescription', locale)}
        />
      )}
      <BandDetails uid={identity.uid} locale={locale} />
    </div>
  );
};
