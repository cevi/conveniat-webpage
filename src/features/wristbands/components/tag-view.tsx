'use client';

import { SetHeaderActions } from '@/components/header/header-actions';
import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import { BandIdentityCard } from '@/features/wristbands/components/band-identity-card';
import { personName } from '@/features/wristbands/components/band-labels';
import { readerText } from '@/features/wristbands/reader-texts';
import { tagText, tagTexts } from '@/features/wristbands/tag-texts';
import { translate } from '@/features/wristbands/texts';
import type { WristbandCard } from '@/features/wristbands/types';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { chatErrorTexts } from '@/lib/chat-error-texts';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { userErrorMessage } from '@/utils/user-error-message';
import { Loader2, MessageSquare, Nfc, ScanLine, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { toast } from 'sonner';

/**
 * Starts the private chat a band leads to and opens it: with the wearer, or for the safety
 * team with an AVP of the band's Hof. Says why when there is none.
 */
const useStartChat = (
  uid: string,
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
          toast(tagText('ownBand', locale));
          break;
        }
        case 'noAccount': {
          toast(tagText('noAccount', locale));
          break;
        }
        case 'unknownBand': {
          toast(tagText('bandGone', locale));
          break;
        }
      }
    },
    onError: (error) => {
      toast.error(userErrorMessage(error, locale, chatErrorTexts, tagTexts.chatFailed));
    },
  });
  return {
    start: (avpUserId?: string): void =>
      mutation.mutate(avpUserId === undefined ? { uid } : { uid, avpUserId }),
    pending: mutation.isPending,
  };
};

/** The wearer as everybody signed in sees them: the Ceviname or the first name, nothing else. */
const Wearer: React.FC<{
  wearer: Extract<WristbandCard['wearer'], { state: 'worn' }>;
  locale: Locale;
  onStartChat: () => void;
  pending: boolean;
}> = ({ wearer, locale, onStartChat, pending }) => (
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
    {wearer.canChat && (
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
 * The page a tapped band opens, for anyone signed in. What it shows comes from the server,
 * which decides by role: the wearer's Ceviname or first name and a chat with them for
 * everybody, the full name, Hof and Quartier and the Hof's AVP for the safety team.
 */
export const TagView: React.FC<{ uid: string }> = ({ uid }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const cardQuery = trpc.wristband.getWristbandCard.useQuery(
    { uid },
    // personal data, read anew on every tap rather than kept on the phone
    { meta: { persist: false }, retry: false },
  );
  const chat = useStartChat(uid, locale);
  const card = cardQuery.data;

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
    const { wearer, safety } = card;
    content = (
      <div className="space-y-6">
        {wearer.state === 'own' && (
          <EmptyState
            icon={Nfc}
            title={tagText('ownTitle', locale)}
            description={tagText('ownDescription', locale)}
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
          <Wearer
            wearer={wearer}
            locale={locale}
            onStartChat={() => chat.start()}
            pending={chat.pending}
          />
        )}
        {safety !== null && (
          <>
            <BandIdentityCard
              identity={safety.identity}
              locale={locale}
              coldTap
              checkAction={
                <Button variant="outlined" size="touch" className="mt-3 w-full" asChild>
                  <Link href="/app/wristbands/lesen">
                    <ScanLine aria-hidden />
                    {readerText('checkInApp', locale)}
                  </Link>
                </Button>
              }
            />
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
        )}
      </div>
    );
  }

  return (
    <>
      <SetHeaderActions />
      {content}
    </>
  );
};
