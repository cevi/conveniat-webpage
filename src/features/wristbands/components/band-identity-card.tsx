import { Card } from '@/components/ui/card';
import { FactRow } from '@/components/ui/fact-row';
import { IconTile } from '@/components/ui/icon-tile';
import { formatUid } from '@/features/wristbands/components/band-labels';
import { formatCampTime, readerText } from '@/features/wristbands/reader-texts';
import type { WristbandIdentity } from '@/features/wristbands/types';
import type { Locale } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import {
  CircleAlert,
  CloudOff,
  Lock,
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
}> = ({ icon, title, description }) => (
  <div className="bg-quiet flex items-start gap-3 rounded-[14px] p-4">
    <IconTile icon={icon} />
    <div className="min-w-0 flex-1">
      <h3 className="text-[15px] font-semibold text-balance text-green-900">{title}</h3>
      <p className="mt-0.5 text-[13px] leading-normal text-balance text-green-700">{description}</p>
    </div>
  </div>
);

/** A band that names nobody because something is wrong with it: in the danger tokens. */
export const BandRefusal: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
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
 * The band's UID, quiet under the card: it means nothing to most people, but tells security and
 * first aid which band they hold when they report it.
 */
const BandNumber: React.FC<{ uid: string; locale: Locale }> = ({ uid, locale }) => (
  <p className="px-1 text-center text-[13px] text-green-500 tabular-nums">
    {readerText('uid', locale, { uid: formatUid(uid) })}
  </p>
);

/** A fact the band shows only once it is held to the phone again: its place, greyed and locked. */
const LockedRow: React.FC<{ icon: LucideIcon; label: string; locale: Locale }> = ({
  icon: Icon,
  label,
  locale,
}) => (
  <div className="not-first:before:bg-line relative flex min-h-[60px] items-center gap-3 px-3.5 py-2.5 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-16 not-first:before:h-px">
    <span className="bg-quiet grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] text-green-400">
      <Icon className="size-5" aria-hidden />
    </span>
    {/* the line heights of `FactRow`, so the row keeps its height once the fact is there */}
    <div className="min-w-0 flex-1">
      <div className="flex h-5 items-center" aria-hidden>
        <div className="bg-chip h-3 w-32 rounded-full" />
      </div>
      <div className="mt-px text-[13px] leading-[18px] text-green-500">
        {label}
        <span className="sr-only">: {readerText('lockedUntilScan', locale)}</span>
      </div>
    </div>
    <Lock className="size-4 shrink-0 text-green-400" aria-hidden />
  </div>
);

/** Who to reach about the wearer of a verified band, folded into the card's rows. */
export interface WearerContacts {
  /** under the Hof's name, e.g. "Hof · AVP Funke" */
  hofSub: string;
  /** at the end of the Hof's row: the chat with its AVP */
  hofAction?: React.ReactNode;
  /** under the Hof's row, e.g. its AVPs to choose from */
  afterHof?: React.ReactNode;
  /** the card's last row: the chat with the wearer */
  lastRow: React.ReactNode;
}

/**
 * The wearer, large: the name, the Ceviname, and in one card the Hof and the Quartier. A band
 * known by its UID alone shows the two locked, with `unlock` as the last row; once read again,
 * the same rows hold the facts and `contacts` the chats, so the card keeps its height.
 */
const Wearer: React.FC<{
  identity: Extract<WristbandIdentity, { state: 'assigned' }>;
  locale: Locale;
  /** for a band known by its UID alone: the way to its Hof and Quartier, as the last row */
  unlock?: React.ReactNode;
  contacts?: WearerContacts | undefined;
}> = ({ identity, locale, unlock, contacts }) => {
  // with contacts every row stays, so nothing moves from the locked card to this one
  const showQuartier = identity.quartier !== null || contacts !== undefined;
  return (
    <Card as="section">
      <div className="px-4 pt-4 pb-3" aria-live="polite">
        <h2 className="font-heading text-heading text-[28px] leading-tight font-extrabold">
          {identity.fullName}
        </h2>
        {identity.nickname !== null && identity.nickname !== '' && (
          <p className="mt-0.5 text-[17px] font-semibold text-green-700">v/o {identity.nickname}</p>
        )}
      </div>
      {(identity.hof !== '' || identity.quartier !== null) && (
        <div className="border-line border-t">
          {identity.hof !== '' && (
            <FactRow
              icon={Tent}
              title={identity.hof}
              sub={
                <span className="block truncate">
                  {contacts?.hofSub ?? readerText('hof', locale)}
                </span>
              }
              action={contacts?.hofAction}
            />
          )}
          {contacts?.afterHof}
          {showQuartier && (
            <FactRow
              icon={MapIcon}
              title={identity.quartier ?? readerText('noQuartier', locale)}
              sub={readerText('quartier', locale)}
            />
          )}
        </div>
      )}
      {contacts?.lastRow}
      {unlock !== undefined && (
        <>
          {/* the same frame as the facts, so nothing moves once they replace these */}
          <div className="border-line border-t">
            <LockedRow icon={Tent} label={readerText('hof', locale)} locale={locale} />
            <LockedRow icon={MapIcon} label={readerText('quartier', locale)} locale={locale} />
          </div>
          {unlock}
        </>
      )}
    </Card>
  );
};

/**
 * Whose a band is, as security and first aid read it: the wearer large and clear, or why the
 * band names nobody, and the band's UID under it. Only for them: nobody else sees a UID. Says
 * when the answer comes from the list on the phone and how old that is. A band known by its UID
 * alone shows its Hof and Quartier locked, with `unlock` to hold it to the phone again; read
 * without a signature, it says the band gives none. Shows nothing the server did not send.
 */
export const BandIdentityCard: React.FC<{
  identity: WristbandIdentity;
  locale: Locale;
  /** the list on the phone answered, loaded at `updatedAt` */
  fromRoster?: { updatedAt: number } | null;
  /**
   * for a band known by its UID alone, e.g. tapped from the home screen: the last row of the
   * card, which reads the band again
   */
  unlock?: React.ReactNode;
  /** for a verified band: the chats with its wearer and its Hof's AVP, in the card's rows */
  contacts?: WearerContacts;
}> = ({ identity, locale, fromRoster = null, unlock, contacts }) => {
  let body: React.ReactNode;
  switch (identity.state) {
    case 'assigned': {
      body = (
        <Wearer
          identity={identity}
          locale={locale}
          unlock={identity.verified ? undefined : unlock}
          contacts={identity.verified ? contacts : undefined}
        />
      );
      break;
    }
    case 'not-genuine': {
      body = (
        <BandRefusal
          title={readerText('notGenuineTitle', locale)}
          description={readerText('notGenuineDescription', locale)}
        />
      );
      break;
    }
    case 'revoked': {
      body = (
        <BandRefusal
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
          description={
            // a band not verified yet keeps its Hof to itself, see `getWristbandCard`
            identity.hof === ''
              ? readerText('unassignedNoHofDescription', locale)
              : readerText('unassignedDescription', locale, { hof: identity.hof })
          }
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
      {identity.state === 'assigned' && !identity.verified && unlock === undefined && (
        <Notice
          icon={ShieldQuestion}
          title={readerText('notCheckedTitle', locale)}
          description={readerText('notCheckedNoSignature', locale)}
        />
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
      <BandNumber uid={identity.uid} locale={locale} />
    </div>
  );
};
