'use client';

import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { ListRow } from '@/components/ui/list-row';
import { SectionLabel } from '@/components/ui/section-label';
import { toast } from '@/components/ui/toast';
import type { WearerContacts } from '@/features/wristbands/components/band-identity-card';
import { BandIdentityCard, BandRefusal } from '@/features/wristbands/components/band-identity-card';
import { personName } from '@/features/wristbands/components/band-labels';
import { ReadBandCard } from '@/features/wristbands/components/read-band-card';
import type { BandCheck } from '@/features/wristbands/hooks/use-check-band';
import { useCheckBand } from '@/features/wristbands/hooks/use-check-band';
import { useNativeNfcAvailable } from '@/features/wristbands/hooks/use-native-nfc-available';
import type { ReadState } from '@/features/wristbands/hooks/use-read-wristband';
import { readerText } from '@/features/wristbands/reader-texts';
import { tagText, tagTexts } from '@/features/wristbands/tag-texts';
import { translate } from '@/features/wristbands/texts';
import type { WristbandCard } from '@/features/wristbands/types';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { chatErrorTexts } from '@/lib/chat-error-texts';
import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { keepPreviousData } from '@tanstack/react-query';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { UseTRPCQueryResult } from '@trpc/react-query/shared';
import { ChevronRight, Loader2, MessageSquare, Nfc, ScanLine, UserRound, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

/**
 * Starts the private chat a band leads to and opens it: with the wearer, or for the safety
 * team with an AVP of the band's Hof. Says why when there is none.
 */
const useStartChat = (
  uid: string,
  signature: string | null | undefined,
  locale: Locale,
): { start: (avpUserId?: string) => void; pending: boolean } => {
  const router = useRouter();
  const mutation = trpc.chat.startChatFromWristband.useMutation({
    // offline it fails at once and says so, instead of waiting unseen
    networkMode: 'always',
    onSuccess: (result) => {
      switch (result.status) {
        case 'started': {
          router.push(`/app/chat/${result.chatId}`);
          break;
        }
        case 'ownBand': {
          toast.info(tagText('ownBand', locale));
          break;
        }
        case 'noAccount': {
          toast.info(tagText('noAccount', locale));
          break;
        }
        case 'unknownBand': {
          toast.info(tagText('bandGone', locale));
          break;
        }
        case 'notVerified': {
          toast.info(tagText('notVerified', locale));
          break;
        }
      }
    },
    onError: (error) => {
      toast.error(userErrorMessage(error, locale, chatErrorTexts, tagTexts.chatFailed));
    },
  });
  return {
    start: (avpUserId?: string): void => {
      // only offered for a verified card, which a signature led to; the server checks it again
      const input = { uid, signature: signature ?? null };
      mutation.mutate(avpUserId === undefined ? input : { ...input, avpUserId });
    },
    pending: mutation.isPending,
  };
};

/**
 * The wearer as everybody signed in sees them: the Ceviname or the first name, nothing else,
 * and the chat once the band is verified.
 */
const Wearer: React.FC<{
  wearer: Extract<WristbandCard['wearer'], { state: 'worn' }>;
  verified: boolean;
  locale: Locale;
  onStartChat: () => void;
  pending: boolean;
}> = ({ wearer, verified, locale, onStartChat, pending }) => (
  <Card as="section" className="space-y-4 p-4">
    <div className="flex items-center gap-3">
      <IconTile icon={UserRound} size="lg" />
      <div className="min-w-0">
        <h2 className="font-heading text-heading text-[28px] leading-tight font-extrabold break-words">
          {wearer.name ?? tagText('someone', locale)}
        </h2>
        <p className="text-[15px] text-green-700">{tagText('wornBy', locale)}</p>
      </div>
    </div>
    {verified && wearer.canChat && (
      <Button
        variant="primary"
        size="touch"
        className="w-full"
        disabled={pending}
        onClick={onStartChat}
      >
        <MessageSquare aria-hidden />
        {tagText('startChat', locale)}
      </Button>
    )}
  </Card>
);

/** The AVP of the band's Hof, for the safety team to reach. */
const HofAvps: React.FC<{
  avps: NonNullable<NonNullable<WristbandCard['safety']>['avps']>;
  locale: Locale;
  onStartChat: (userId: string) => void;
  pending: boolean;
}> = ({ avps, locale, onStartChat, pending }) => (
  <section className="space-y-2">
    <SectionLabel className="px-1">{tagText('hofAvp', locale)}</SectionLabel>
    {avps.length === 0 ? (
      <p className="bg-quiet rounded-[14px] p-4 text-[15px] text-green-700">
        {tagText('noAvp', locale)}
      </p>
    ) : (
      <Card as="ul" divided>
        {avps.map((avp) => {
          const name = personName(avp);
          return (
            <li key={avp.userId} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <IconTile icon={UserRound} />
              <span className="min-w-0 flex-1 text-[15px] font-semibold text-green-900">
                {name}
              </span>
              <Button
                variant="outlined"
                size="touch"
                disabled={pending}
                aria-label={tagText('startChatWith', locale, { name })}
                onClick={() => onStartChat(avp.userId)}
              >
                {tagText('startChat', locale)}
              </Button>
            </li>
          );
        })}
      </Card>
    )}
  </section>
);

/**
 * The way from a band known by its UID alone to the verified card: a scan on the page, in the
 * native app only. Another band on the phone is offered as that band's own page.
 */
const CheckBand: React.FC<{
  check: BandCheck;
  /** the card is asked again with the signature just read */
  checking: boolean;
  /** a scan read the band, but it gave out no signature */
  withoutSignature: boolean;
  locale: Locale;
}> = ({ check, checking, withoutSignature, locale }) => {
  const nfcAvailable = useNativeNfcAvailable();
  const { state } = check;
  if (nfcAvailable === undefined) return <></>;

  if (state.step === 'other-band') {
    return (
      <Card as="section" className="space-y-4 p-4" aria-live="polite">
        <div className="flex items-start gap-3">
          <IconTile icon={Nfc} />
          <div className="min-w-0">
            <h2 className="font-heading text-heading text-[17px] leading-snug font-bold">
              {tagText('otherBandTitle', locale)}
            </h2>
            <p className="mt-1 text-[15px] text-green-700">
              {tagText('otherBandDescription', locale)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_auto]">
          <Button variant="primary" size="touch" asChild>
            <Link href={`/tag/${state.uid}`} replace>
              {tagText('showOtherBand', locale)}
            </Link>
          </Button>
          <Button variant="quiet" size="touch" onClick={check.start}>
            {readerText('retry', locale)}
          </Button>
        </div>
      </Card>
    );
  }

  let readState: ReadState = { step: 'idle' };
  if (checking) readState = { step: 'checking' };
  else if (state.step === 'waiting') readState = { step: 'waiting' };
  else if (state.step === 'failed') readState = { step: 'failed', code: state.code };

  if (readState.step !== 'idle') {
    return (
      <ReadBandCard
        state={readState}
        locale={locale}
        onStart={check.start}
        onCancel={check.cancel}
      />
    );
  }

  let description = tagText('rescanDescription', locale);
  if (!nfcAvailable) description = tagText('rescanInApp', locale);
  else if (withoutSignature) description = readerText('notCheckedNoSignature', locale);
  return (
    <Card as="section" className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <IconTile icon={ScanLine} />
        <div className="min-w-0">
          <h2 className="font-heading text-heading text-[17px] leading-snug font-bold">
            {tagText('rescanTitle', locale)}
          </h2>
          <p className="mt-1 text-[15px] text-green-700">{description}</p>
        </div>
      </div>
      {nfcAvailable && (
        <ReadBandCard
          state={readState}
          locale={locale}
          onStart={check.start}
          onCancel={check.cancel}
          label={tagText('checkBand', locale)}
        />
      )}
    </Card>
  );
};

interface StartChat {
  start: (avpUserId?: string) => void;
  pending: boolean;
}
type Avps = NonNullable<NonNullable<WristbandCard['safety']>['avps']>;

/** The Ceviname, or without one the first name: how the Hof calls its AVP. */
const callName = (person: { fullName: string; nickname: string | null }): string =>
  person.nickname ?? person.fullName.split(' ')[0] ?? person.fullName;

/** A 44px chat button at the end of a row of the band's card. */
const ChatIconButton: React.FC<{ label: string; pending: boolean; onClick: () => void }> = ({
  label,
  pending,
  onClick,
}) => (
  <Button
    variant="plain"
    size="touchIcon"
    className="-my-1"
    aria-label={label}
    disabled={pending}
    onClick={onClick}
  >
    <MessageSquare aria-hidden />
  </Button>
);

/**
 * The safety team's ways to reach someone about a verified band, in its card's rows: the Hof's
 * AVP at the end of the Hof's row, all of them under it when there are several, and the wearer
 * in the card's last row, where the scan row was, so the card keeps its height.
 */
const useSafetyContacts = (
  card: WristbandCard | undefined,
  chat: StartChat,
  locale: Locale,
): WearerContacts | undefined => {
  const [showAvps, setShowAvps] = useState(false);
  const avps: Avps | null = card?.safety?.avps ?? null;
  if (card === undefined || !card.verified || avps === null) return undefined;

  const { wearer } = card;
  const identity = card.safety?.identity;
  let wearerName = identity?.state === 'assigned' ? callName(identity) : '';
  if (wearer.state === 'worn' && wearer.name !== null) wearerName = wearer.name;
  const canChat = wearer.state === 'worn' && wearer.canChat;
  const [onlyAvp] = avps;

  let hofAction: React.ReactNode;
  if (avps.length === 1 && onlyAvp !== undefined) {
    hofAction = (
      <ChatIconButton
        label={tagText('startChatWith', locale, { name: personName(onlyAvp) })}
        pending={chat.pending}
        onClick={() => chat.start(onlyAvp.userId)}
      />
    );
  } else if (avps.length > 1) {
    hofAction = (
      <Button
        variant="plain"
        size="touchIcon"
        className="-my-1"
        aria-label={tagText('chatWithAvp', locale)}
        aria-expanded={showAvps}
        onClick={() => setShowAvps((shown) => !shown)}
      >
        <MessageSquare aria-hidden />
      </Button>
    );
  }

  const lastRowClassName = 'border-line border-t px-3.5';
  const chatTile = (
    <span className="bg-tint text-conveniat-green grid size-10 shrink-0 place-items-center rounded-xl">
      {chat.pending ? (
        <Loader2 className="size-5 animate-spin" aria-hidden />
      ) : (
        <MessageSquare className="size-5" aria-hidden />
      )}
    </span>
  );
  const lastRow = canChat ? (
    <ListRow className={lastRowClassName} disabled={chat.pending} onClick={() => chat.start()}>
      {chatTile}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-green-900">
          {tagText('startChat', locale)}
        </span>
        <span className="block truncate text-[13px] text-green-700">
          {tagText('chatWith', locale, { name: wearerName })}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-green-500" aria-hidden />
    </ListRow>
  ) : (
    <div className={cn(lastRowClassName, 'flex min-h-14 items-center gap-3 py-2.5')}>
      <span className="bg-quiet grid size-10 shrink-0 place-items-center rounded-xl text-green-400">
        <MessageSquare className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-green-900">
          {tagText('chat', locale)}
        </span>
        <span className="block truncate text-[13px] text-green-700">
          {tagText('chatNoApp', locale, { name: wearerName })}
        </span>
      </span>
    </div>
  );

  return {
    hofSub:
      avps.length === 0
        ? tagText('hofWithoutAvp', locale)
        : tagText('hofWithAvp', locale, { names: avps.map((avp) => callName(avp)).join(', ') }),
    hofAction,
    afterHof:
      showAvps && avps.length > 1 ? (
        <ul className="bg-quiet/60">
          {avps.map((avp) => (
            <li key={avp.userId} className="flex min-h-14 items-center gap-3 py-1.5 pr-3.5 pl-16">
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-green-900">
                {personName(avp)}
              </span>
              <ChatIconButton
                label={tagText('startChatWith', locale, { name: personName(avp) })}
                pending={chat.pending}
                onClick={() => chat.start(avp.userId)}
              />
            </li>
          ))}
        </ul>
      ) : undefined,
    lastRow,
  };
};

/**
 * The last row of the band's card for the safety team while the band is known by its UID alone:
 * held to the phone again, the band shows its Hof, its Quartier and the AVP. Starts the scan on
 * a tap, which iOS needs for its own NFC sheet anyway.
 */
const UnlockRow: React.FC<{ check: BandCheck; checking: boolean; locale: Locale }> = ({
  check,
  checking,
  locale,
}) => {
  const nfcAvailable = useNativeNfcAvailable();
  const waiting = check.state.step === 'waiting';
  const tile = (
    <span
      className={cn(
        'bg-tint text-conveniat-green grid size-10 shrink-0 place-items-center rounded-xl',
        waiting && 'animate-pulse',
      )}
    >
      {checking ? (
        <Loader2 className="size-5 animate-spin" aria-hidden />
      ) : (
        <Nfc className="size-5" aria-hidden />
      )}
    </span>
  );
  let sub = tagText('unlockSafety', locale);
  if (nfcAvailable === false) sub = tagText('rescanInApp', locale);
  else if (checking) sub = tagText('unlockChecking', locale);
  else if (waiting) sub = tagText('unlockWaiting', locale);
  const text = (
    <span className="min-w-0 flex-1" aria-live="polite">
      <span className="block text-[15px] font-semibold text-green-900">
        {tagText('unlockTitle', locale)}
      </span>
      <span className="block text-[13px] text-green-700">{sub}</span>
    </span>
  );
  const rowClassName = 'border-line bg-tint/50 border-t';

  if (nfcAvailable !== true || waiting || checking) {
    return (
      <div className={cn(rowClassName, 'flex min-h-14 items-center gap-3 px-3.5 py-2.5')}>
        {tile}
        {text}
        {waiting && (
          // an icon, so the title keeps its one line and the row its height
          <Button
            variant="plain"
            size="touchIcon"
            className="-my-1"
            aria-label={translate('cancel', locale)}
            onClick={check.cancel}
          >
            <X aria-hidden />
          </Button>
        )}
      </div>
    );
  }
  return (
    <ListRow className={cn(rowClassName, 'px-3.5')} onClick={check.start}>
      {tile}
      {text}
      <ChevronRight className="size-5 shrink-0 text-green-500" aria-hidden />
    </ListRow>
  );
};

/** What a verified band leads the safety team to: a chat with the wearer and the Hof's AVP. */
const SafetyContacts: React.FC<{
  card: WristbandCard;
  chat: { start: (avpUserId?: string) => void; pending: boolean };
  locale: Locale;
}> = ({ card, chat, locale }) => {
  const { wearer, safety } = card;
  if (!card.verified || safety === null) return <></>;
  return (
    <>
      {wearer.state === 'worn' && wearer.canChat && (
        <Button
          variant="primary"
          size="touch"
          className="w-full"
          disabled={chat.pending}
          onClick={() => chat.start()}
        >
          <MessageSquare aria-hidden />
          {tagText('startChat', locale)}
        </Button>
      )}
      {safety.avps !== null && (
        <HofAvps
          avps={safety.avps}
          locale={locale}
          onStartChat={(userId) => chat.start(userId)}
          pending={chat.pending}
        />
      )}
    </>
  );
};

/** The page's card of a band, read anew on every tap rather than kept on the phone. */
const useWristbandCard = (
  uid: string,
  signature: string | null | undefined,
  enabled: boolean,
): UseTRPCQueryResult<WristbandCard, TRPCClientErrorLike<AppRouter>> =>
  trpc.wristband.getWristbandCard.useQuery(signature === undefined ? { uid } : { uid, signature }, {
    enabled,
    meta: { persist: false },
    retry: false,
    // the card read by the UID alone stays while the signature is checked
    placeholderData: keepPreviousData,
  });

/**
 * The chats a band read by security and first aid leads to, under the reader's answer: the
 * reader has the signature, so one more tap starts the chat. Nothing for a band the server
 * did not verify.
 */
export const BandContacts: React.FC<{ uid: string; signature: string | null }> = ({
  uid,
  signature,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const cardQuery = useWristbandCard(uid, signature, true);
  const chat = useStartChat(uid, signature, locale);
  if (cardQuery.data === undefined) return <></>;
  return <SafetyContacts card={cardQuery.data} chat={chat} locale={locale} />;
};

/**
 * The page a tapped band opens, for anyone signed in. What it shows comes from the server,
 * which decides by role and by NXP's signature, see `getWristbandCard`: by the UID alone the
 * wearer's name, and the way to check the band; once checked a chat with the wearer, and for
 * the safety team the Hof, the Quartier and the Hof's AVP. The signature comes with the tap
 * from the native app on Android, or from a scan on the page.
 */
export const TagView: React.FC<{ uid: string }> = ({ uid }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const check = useCheckBand(uid);
  const cardQuery = useWristbandCard(uid, check.signature, check.ready);
  const chat = useStartChat(uid, check.signature, locale);
  const card = cardQuery.data;
  const contacts = useSafetyContacts(card, chat, locale);

  let content: React.ReactNode;
  if (card === undefined) {
    content = cardQuery.isError ? (
      <EmptyState
        icon={Nfc}
        title={tagText('loadFailed', locale)}
        description={userErrorMessage(cardQuery.error, locale)}
        action={
          <Button variant="outlined" size="touch" onClick={() => void cardQuery.refetch()}>
            {translate('reload', locale)}
          </Button>
        }
      />
    ) : (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-green-500">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {translate('loading', locale)}
      </div>
    );
  } else {
    const { wearer, safety, verified } = card;
    const checking = check.signature !== undefined && cardQuery.isPlaceholderData;
    // for the safety team the band's card already says when a scan read no signature
    const checkBand = (
      <CheckBand
        check={check}
        checking={checking}
        withoutSignature={safety === null && check.signature === null}
        locale={locale}
      />
    );
    content = (
      <div className="space-y-6">
        {wearer.state === 'own' && (
          <EmptyState
            icon={Nfc}
            title={tagText('ownTitle', locale)}
            description={tagText('ownDescription', locale)}
          />
        )}
        {wearer.state === 'not-genuine' && safety === null && (
          <BandRefusal
            title={readerText('notGenuineTitle', locale)}
            description={readerText('notGenuineDescription', locale)}
          />
        )}
        {wearer.state === 'none' && safety === null && (
          <EmptyState
            icon={Nfc}
            title={tagText('bandTitle', locale)}
            description={tagText('nobodyDescription', locale)}
          />
        )}
        {safety === null && wearer.state === 'worn' && (
          <>
            <Wearer
              wearer={wearer}
              verified={verified}
              locale={locale}
              onStartChat={() => chat.start()}
              pending={chat.pending}
            />
            {/* checking leads to the chat, so it is offered where there is one */}
            {!verified && wearer.canChat && checkBand}
          </>
        )}
        {safety !== null && (
          <>
            <BandIdentityCard
              identity={safety.identity}
              locale={locale}
              unlock={<UnlockRow check={check} checking={checking} locale={locale} />}
              {...(contacts === undefined ? {} : { contacts })}
            />
            {/* an assigned band reads again from its card's last row; what went wrong shows here */}
            {!verified &&
              (safety.identity.state === 'unassigned' ||
                (safety.identity.state === 'assigned' &&
                  (check.state.step === 'failed' || check.state.step === 'other-band'))) &&
              checkBand}
          </>
        )}
      </div>
    );
  }

  return <>{content}</>;
};
