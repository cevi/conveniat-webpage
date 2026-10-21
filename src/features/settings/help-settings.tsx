import { LinkComponent } from '@/components/ui/link-component';
import { SectionLabel } from '@/components/ui/section-label';
import { environmentVariables } from '@/config/environment-variables';
import { AboutSettings, type WebBuild } from '@/features/settings/about-settings';
import { SettingsCard, SettingsRow } from '@/features/settings/components/settings-row';
import { supportMailLink } from '@/features/settings/utils/support-mail';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getCachedSession } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { ExternalLink } from 'lucide-react';
import type React from 'react';

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

/**
 * "Hilfe" in the settings: a mail to the support, which carries the user's id so nobody has to
 * look it up, and "Über diese App" with the credits and the build.
 */
export const HelpSettings: React.FC<{ locale: Locale; webBuild: WebBuild | undefined }> = async ({
  locale,
  webBuild,
}) => {
  let userId: string | undefined;
  try {
    const session = await getCachedSession();
    userId = isValidNextAuthUser(session?.user) ? session.user.uuid : undefined;
  } catch {
    // the mail goes out without the id, e.g. while offline
  }

  return (
    <section>
      <SectionLabel className="mb-2 px-1">{helpTitle[locale]}</SectionLabel>
      <SettingsCard>
        <LinkComponent
          href={supportMailLink(environmentVariables.APP_SUPPORT_EMAIL, locale, userId)}
          className="hover:bg-quiet block transition-colors"
          hideExternalIcon
        >
          <SettingsRow
            title={contactSupportText[locale]}
            action={<ExternalLink className="h-5 w-5 text-green-500" aria-hidden="true" />}
          />
        </LinkComponent>
        <AboutSettings locale={locale} webBuild={webBuild} />
      </SettingsCard>
    </section>
  );
};
