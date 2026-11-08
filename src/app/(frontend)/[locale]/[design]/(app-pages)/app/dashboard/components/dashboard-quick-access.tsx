'use client';

import { QuickAccessSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-skeleton';
import { QuickAccessEditor } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/quick-access-editor';
import { useChosenQuickAccess } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/hooks/use-chosen-quick-access';
import type { QuickAccessFlags } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import {
  isTileAvailable,
  QUICK_ACCESS_TILES,
  tileOf,
} from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import type { QuickAccessTileId } from '@/features/settings/quick-access';
import { supportMailLink } from '@/features/settings/utils/support-mail';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { useLeaderAccess } from '@/hooks/use-leader-access';
import { useWristbandAccess } from '@/hooks/use-wristband-access';
import { HitobitoNextAuthUserSchema } from '@/types/hitobito-next-auth-user';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import { LogIn, SlidersHorizontal } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import type React from 'react';
import { useRef, useState } from 'react';

const quickAccessTitle: StaticTranslationString = {
  de: 'Schnellzugriff',
  en: 'Quick access',
  fr: 'Accès rapide',
};

const customizeLabel: StaticTranslationString = {
  de: 'Schnellzugriff anpassen',
  en: 'Customize quick access',
  fr: "Personnaliser l'accès rapide",
};

const signInLabel: StaticTranslationString = { de: 'Anmelden', en: 'Log in', fr: 'Connexion' };

// icon above the name, three to a row; `h-full` keeps a row even when one name takes two lines,
// and the icons start at the top, so they stay on one line across the row
const tileClassName =
  'focus-visible:focus-surface border-line hover:bg-quiet flex h-full min-h-[96px] w-full cursor-pointer flex-col items-center justify-start gap-2 rounded-[14px] border bg-white px-1.5 py-3 text-center text-[13px] leading-[17px] font-semibold text-green-900';

const TileContent: React.FC<{ icon: LucideIcon; label: string }> = ({ icon, label }) => (
  <>
    <IconTile icon={icon} />
    {/* balanced, so "Mein QR-Code" breaks before the word and not at its hyphen; a word of ten
        letters or more may be hyphenated, so "Schichteinsätze" fits a third of a phone and
        "Bilder" stays whole */}
    <span className="max-w-full min-w-0 text-balance hyphens-auto [hyphenate-limit-chars:10_4_4]">
      {label}
    </span>
  </>
);

/**
 * "Schnellzugriff" on Home: the few things somebody reaches for during the camp, as tiles. A
 * signed-in user chooses which and in what order for their account, see `useChosenQuickAccess`;
 * a tile whose feature is off stays hidden but keeps its place. A guest gets the default and the
 * way to log in first, and the preview of the landing page the default without the button.
 */
export const DashboardQuickAccess: React.FC<{
  locale: Locale;
  flags: QuickAccessFlags;
  supportEmail: string;
  /** the CMS preview: shows what everybody starts with, not the editor's own choice */
  isPreview?: boolean;
}> = ({ locale, flags, supportEmail, isPreview = false }) => {
  const { data: session } = useSession();
  const status = useAuthStatus();
  const parsedUser = HitobitoNextAuthUserSchema.safeParse(session?.user);
  const user = parsedUser.success ? parsedUser.data : undefined;
  const isGuest = user === undefined;
  const isCustomizable = !isGuest && !isPreview;

  const { chosen, isLoading, isCustomized, saveFailed, setChosen } =
    useChosenQuickAccess(isCustomizable);
  const [isEditing, setIsEditing] = useState(false);
  const customizeButton = useRef<HTMLButtonElement>(null);
  const wristbands = useWristbandAccess(flags.wristbandsEnabled);
  const isLeader = useLeaderAccess(flags.storyEnabled && !isGuest);

  // until the session and the user's choice are known, the tiles are unknown too; the default
  // ones would jump into other cells once they arrive
  if (status === 'loading' || isLoading) return <QuickAccessSkeleton />;

  // the wristbands are for the AVP of a Hof and for security and first aid, not the deployment's
  // every user
  const context = {
    signedIn: !isGuest,
    flags: {
      ...flags,
      wristbandsEnabled: flags.wristbandsEnabled && wristbands !== undefined,
      // the story and the challenges are for Leitende
      storyEnabled: flags.storyEnabled && isLeader,
    },
  };
  const available: QuickAccessTileId[] = QUICK_ACCESS_TILES.filter((tile) =>
    isTileAvailable(tile, context),
  ).map((tile) => tile.id);
  const shown = chosen.filter((id) => available.includes(id));

  return (
    <section className="space-y-2">
      <div className="flex min-h-5 items-center justify-between">
        <SectionLabel>{quickAccessTitle[locale]}</SectionLabel>
        {isCustomizable && (
          <Button
            ref={customizeButton}
            variant="plain"
            size="touchIcon"
            className="-my-3 -mr-3"
            aria-label={customizeLabel[locale]}
            onClick={() => setIsEditing(true)}
          >
            <SlidersHorizontal aria-hidden="true" />
          </Button>
        )}
      </div>
      {(isGuest || shown.length > 0) && (
        <ul className="grid grid-cols-3 gap-2.5">
          {isGuest && (
            <li>
              <button
                type="button"
                className={tileClassName}
                onClick={() => void signIn('cevi-db', { callbackUrl: '/entrypoint' })}
              >
                <TileContent icon={LogIn} label={signInLabel[locale]} />
              </button>
            </li>
          )}
          {shown.map((id) => {
            const tile = tileOf(id);
            const content = <TileContent icon={tile.icon} label={tile.label[locale]} />;
            if (id === 'support') {
              return (
                <li key={id}>
                  <a
                    href={supportMailLink(supportEmail, locale, user?.uuid)}
                    className={tileClassName}
                  >
                    {content}
                  </a>
                </li>
              );
            }
            if (tile.href === undefined) return null;
            return (
              <li key={id}>
                <Link href={tile.href} className={tileClassName}>
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {isCustomizable && (
        <QuickAccessEditor
          locale={locale}
          open={isEditing}
          onOpenChange={setIsEditing}
          anchor={customizeButton}
          chosen={chosen}
          shown={shown}
          available={available}
          isCustomized={isCustomized}
          saveFailed={saveFailed}
          onChange={setChosen}
        />
      )}
    </section>
  );
};
