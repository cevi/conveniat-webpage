'use client';

import { QuickAccessSkeleton } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-skeleton';
import { QuickAccessEditor } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/quick-access-editor';
import { useChosenQuickAccess } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/hooks/use-chosen-quick-access';
import type {
  QuickAccessFlags,
  QuickAccessTileId,
} from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import {
  isTileAvailable,
  QUICK_ACCESS_TILES,
  tileOf,
} from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import { supportMailLink } from '@/features/settings/utils/support-mail';
import { useAuthStatus } from '@/hooks/use-auth-status';
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

const tileClassName =
  'focus-visible:focus-surface border-line hover:bg-quiet flex min-h-[64px] w-full cursor-pointer items-center gap-2.5 rounded-[14px] border bg-white px-3 py-2.5 text-left text-[14px] leading-[18px] font-semibold text-green-900';

const TileContent: React.FC<{ icon: LucideIcon; label: string }> = ({ icon, label }) => (
  <>
    <IconTile icon={icon} />
    {/* balanced, so "Mein QR-Code" breaks before the word and not at its hyphen */}
    <span className="min-w-0 text-balance">{label}</span>
  </>
);

/**
 * "Schnellzugriff" on Home: the few things somebody reaches for during the camp, as tiles. The
 * user chooses which and in what order on this phone, see `useChosenQuickAccess`; a tile whose
 * feature is off, or that needs an account the guest does not have, stays hidden but keeps its
 * place. A guest gets the way to log in first.
 */
export const DashboardQuickAccess: React.FC<{
  locale: Locale;
  flags: QuickAccessFlags;
  supportEmail: string;
}> = ({ locale, flags, supportEmail }) => {
  const { data: session } = useSession();
  const status = useAuthStatus();
  const parsedUser = HitobitoNextAuthUserSchema.safeParse(session?.user);
  const user = parsedUser.success ? parsedUser.data : undefined;
  const isGuest = user === undefined;

  const { chosen, isCustomized, setChosen, reset } = useChosenQuickAccess();
  const [isEditing, setIsEditing] = useState(false);
  const customizeButton = useRef<HTMLButtonElement>(null);

  // until the session is known, the tiles that need an account are unknown too; without them
  // the other tiles would jump into their cells
  if (status === 'loading') return <QuickAccessSkeleton />;

  const context = { signedIn: !isGuest, flags };
  const available: QuickAccessTileId[] = QUICK_ACCESS_TILES.filter((tile) =>
    isTileAvailable(tile, context),
  ).map((tile) => tile.id);
  const shown = chosen.filter((id) => available.includes(id));

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <SectionLabel>{quickAccessTitle[locale]}</SectionLabel>
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
      </div>
      {(isGuest || shown.length > 0) && (
        <ul className="grid grid-cols-2 gap-2.5">
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
            const label = tile.label[locale];
            return (
              <li key={id}>
                {tile.href === undefined ? (
                  <a
                    href={supportMailLink(supportEmail, locale, user?.uuid)}
                    className={tileClassName}
                  >
                    <TileContent icon={tile.icon} label={label} />
                  </a>
                ) : (
                  <Link href={tile.href} className={tileClassName}>
                    <TileContent icon={tile.icon} label={label} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <QuickAccessEditor
        locale={locale}
        open={isEditing}
        onOpenChange={setIsEditing}
        anchor={customizeButton}
        chosen={chosen}
        available={available}
        isCustomized={isCustomized}
        onChange={setChosen}
        onReset={reset}
      />
    </section>
  );
};
