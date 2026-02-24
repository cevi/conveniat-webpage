import type { SmtpLanguage } from '@/features/payload-cms/payload-cms/components/smtp-results/types';
import { useTranslation } from '@payloadcms/ui';

export const useSmtpTranslation = (): { lang: SmtpLanguage } => {
  const { i18n } = useTranslation();

  const langRaw = i18n.language;
  const currentLang = typeof langRaw === 'string' && langRaw.length > 0 ? langRaw : 'de';
  const isValidLang = currentLang === 'en' || currentLang === 'de' || currentLang === 'fr';
  const lang: SmtpLanguage = isValidLang ? currentLang : 'de';

  return { lang };
};
