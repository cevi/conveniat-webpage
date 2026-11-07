import { LinkComponent } from '@/components/ui/link-component';
import { SectionLabel } from '@/components/ui/section-label';
import { environmentVariables } from '@/config/environment-variables';
import { AboutSettings, type WebBuild } from '@/features/settings/about-settings';
import { SettingsCard, SettingsRow } from '@/features/settings/components/settings-row';
import { PrivacySettings } from '@/features/settings/privacy-settings';
import { supportMailLink } from '@/features/settings/utils/support-mail';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getCachedSession } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { ExternalLink } from 'lucide-react';
import type React from 'react';
import { Suspense } from 'react';

const helpTitle: StaticTranslationString = {
  de: 'Hilfe',
  en: 'Help',
  fr: 'Aide',
};

const contactSupportText: StaticTranslationString = {
  de: 'Support kontaktieren',
  en: 'Contact support',
  fr: 'Contacter le support',
};

/** The mail to the support, with the user's id when someone is logged in. */
const SupportLink: React.FC<{ locale: Locale; userId: string | undefined }> = ({
  locale,
  userId,
}) => (
  <LinkComponent
    href={supportMailLink(environmentVariables.APP_SUPPORT_EMAIL, locale, userId)}
    className="hover:bg-quiet focus-visible:focus-row relative block transition-colors"
    hideExternalIcon
  >
    <SettingsRow
      title={contactSupportText[locale]}
      action={<ExternalLink className="h-5 w-5 text-green-500" aria-hidden="true" />}
    />
  </LinkComponent>
);

/** The support link once the session is read, which happens per request. */
const SupportLinkOfUser: React.FC<{ locale: Locale }> = async ({ locale }) => {
  let userId: string | undefined;
  try {
    const session = await getCachedSession();
    userId = isValidNextAuthUser(session?.user) ? session.user.uuid : undefined;
  } catch {
    // the mail goes out without the id, e.g. while offline
  }
  return <SupportLink locale={locale} userId={userId} />;
};

/**
 * "Hilfe" in the settings: a mail to the support, which carries the user's id so nobody has to
 * look it up, "Datenschutz" with the consent to session recordings and the privacy policy, and
 * "Über diese App" with the credits and the build. Only the user's id waits for the session; the
 * link without it stands in until then, so the section is part of the static shell.
 */
export const HelpSettings: React.FC<{ locale: Locale; webBuild: WebBuild | undefined }> = ({
  locale,
  webBuild,
}) => (
  <section>
    <SectionLabel className="mb-2 px-1">{helpTitle[locale]}</SectionLabel>
    <SettingsCard>
      <Suspense fallback={<SupportLink locale={locale} userId={undefined} />}>
        <SupportLinkOfUser locale={locale} />
      </Suspense>
      <PrivacySettings locale={locale} />
      <AboutSettings locale={locale} webBuild={webBuild} />
    </SettingsCard>
  </section>
);
