'use client';

import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import { supportMailLink } from '@/features/settings/utils/support-mail';
import { HitobitoNextAuthUserSchema } from '@/types/hitobito-next-auth-user';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { LucideIcon } from 'lucide-react';
import { ImageUp, LifeBuoy, LogIn, Package, QrCode } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import type React from 'react';

const quickAccessTitle: StaticTranslationString = {
  de: 'Schnellzugriff',
  en: 'Quick access',
  fr: 'Accès rapide',
};

const labels = {
  upload: { de: 'Bilder hochladen', en: 'Upload pictures', fr: 'Envoyer des photos' },
  qrCode: { de: 'Mein QR-Code', en: 'My QR code', fr: 'Mon code QR' },
  material: { de: 'Materialdepot', en: 'Material depot', fr: 'Dépôt de matériel' },
  support: { de: 'Hilfe & Support', en: 'Help & support', fr: 'Aide & support' },
  signIn: { de: 'Anmelden', en: 'Log in', fr: 'Connexion' },
} satisfies Record<string, StaticTranslationString>;

const tileClassName =
  'border-line hover:bg-quiet flex min-h-[64px] w-full cursor-pointer items-center gap-2.5 rounded-[14px] border bg-white px-3 py-2.5 text-left text-[14px] leading-[18px] font-semibold text-green-900';

const TileContent: React.FC<{ icon: LucideIcon; label: string }> = ({ icon, label }) => (
  <>
    <IconTile icon={icon} />
    <span className="min-w-0">{label}</span>
  </>
);

/** Feature flags of the CMS that decide whether a tile exists. */
export interface QuickAccessFlags {
  imageUploadEnabled: boolean;
  /** the Materialdepot of this deployment, see `FEATURE_ENABLE_MATERIAL_MANAGEMENT` */
  materialEnabled: boolean;
}

/**
 * "Schnellzugriff" on Home: the few things somebody reaches for during the camp, as tiles. The
 * tabs and the menu lead everywhere else. A guest gets the way to log in instead of the tiles
 * that need an account.
 */
export const DashboardQuickAccess: React.FC<{
  locale: Locale;
  flags: QuickAccessFlags;
  supportEmail: string;
}> = ({ locale, flags, supportEmail }) => {
  const { data: session, status } = useSession();
  const parsedUser = HitobitoNextAuthUserSchema.safeParse(session?.user);
  const user = parsedUser.success ? parsedUser.data : undefined;
  const isGuest = status !== 'loading' && user === undefined;

  const linkTiles: { key: string; href: string; icon: LucideIcon; label: string }[] = [
    ...(user !== undefined && flags.imageUploadEnabled
      ? [{ key: 'upload', href: '/app/upload-images', icon: ImageUp, label: labels.upload[locale] }]
      : []),
    // the chat opens its QR sheet for this parameter
    ...(user === undefined
      ? []
      : [{ key: 'qr', href: '/app/chat?qr=mine', icon: QrCode, label: labels.qrCode[locale] }]),
    ...(user !== undefined && flags.materialEnabled
      ? [{ key: 'material', href: '/app/material', icon: Package, label: labels.material[locale] }]
      : []),
  ];

  return (
    <section className="space-y-2">
      <SectionLabel>{quickAccessTitle[locale]}</SectionLabel>
      <ul className="grid grid-cols-2 gap-2.5">
        {isGuest && (
          <li>
            <button
              type="button"
              className={tileClassName}
              onClick={() => void signIn('cevi-db', { callbackUrl: '/entrypoint' })}
            >
              <TileContent icon={LogIn} label={labels.signIn[locale]} />
            </button>
          </li>
        )}
        {linkTiles.map(({ key, href, icon, label }) => (
          <li key={key}>
            <Link href={href} className={tileClassName}>
              <TileContent icon={icon} label={label} />
            </Link>
          </li>
        ))}
        <li>
          <a href={supportMailLink(supportEmail, locale, user?.uuid)} className={tileClassName}>
            <TileContent icon={LifeBuoy} label={labels.support[locale]} />
          </a>
        </li>
      </ul>
    </section>
  );
};
