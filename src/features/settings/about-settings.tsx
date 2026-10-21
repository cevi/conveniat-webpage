'use client';

import { IconTile } from '@/components/ui/icon-tile';
import { LinkComponent } from '@/components/ui/link-component';
import { SectionLabel } from '@/components/ui/section-label';
import { SettingsCard, SettingsRow } from '@/features/settings/components/settings-row';
import { useNativeAppInfo } from '@/hooks/use-native-app-info';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Calendar, ExternalLink, Heart, Laptop, Mail, Server, Smartphone } from 'lucide-react';
import React from 'react';

interface AboutSettingsProperties {
  locale: Locale;
  webBuild?:
    | {
        version: string;
        timestamp: string;
        git: {
          branch: string;
          hash: string;
        };
      }
    | undefined;
}

const aboutTitle: StaticTranslationString = {
  de: 'Über diese App',
  en: 'About this App',
  fr: 'À propos de cette application',
};

const authorTitle: StaticTranslationString = {
  de: 'Design & Technische Umsetzung',
  en: 'Design & Technical Implementation',
  fr: 'Design & mise en œuvre technique',
};

const contactTitle: StaticTranslationString = {
  de: 'Kontakt Cevi.Tools',
  en: 'Contact Cevi.Tools',
  fr: 'Contact Cevi.Tools',
};

const buildInfoTitle: StaticTranslationString = {
  de: 'Build-Informationen',
  en: 'Build Information',
  fr: 'Informations de Build',
};

const webBuildLabel: StaticTranslationString = {
  de: 'Web-Version',
  en: 'Web Version',
  fr: 'Version Web',
};

const nativeBuildLabel: StaticTranslationString = {
  de: 'App-Version',
  en: 'App Version',
  fr: 'Version App',
};

const buildDateLabel: StaticTranslationString = {
  de: 'Datum des Builds',
  en: 'Build Date',
  fr: 'Date de Build',
};

const renderAuthorDescription = (locale: Locale): React.ReactNode => {
  switch (locale) {
    case 'en': {
      return (
        <>
          The website{' '}
          <LinkComponent
            href="https://conveniat27.ch"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            conveniat27.ch
          </LinkComponent>{' '}
          and the associated conveniat27 app are developed on a voluntary basis by{' '}
          <LinkComponent
            href="https://cevi.tools"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            Cevi.Tools
          </LinkComponent>
          . The source code is freely available on{' '}
          <LinkComponent
            href="https://github.com/cevi"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            GitHub
          </LinkComponent>
          .
        </>
      );
    }
    case 'fr': {
      return (
        <>
          Le site web{' '}
          <LinkComponent
            href="https://conveniat27.ch"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            conveniat27.ch
          </LinkComponent>{' '}
          et l&apos;application conveniat27 associée sont développés bénévolement par{' '}
          <LinkComponent
            href="https://cevi.tools"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            Cevi.Tools
          </LinkComponent>
          . Le code source est disponible gratuitement sur{' '}
          <LinkComponent
            href="https://github.com/cevi"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            GitHub
          </LinkComponent>
          .
        </>
      );
    }
    default: {
      return (
        <>
          Die Webseite{' '}
          <LinkComponent
            href="https://conveniat27.ch"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            conveniat27.ch
          </LinkComponent>{' '}
          und die zugehörige conveniat27-App werden in ehrenamtlicher Arbeit von{' '}
          <LinkComponent
            href="https://cevi.tools"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            Cevi.Tools
          </LinkComponent>{' '}
          entwickelt. Der Quellcode steht auf{' '}
          <LinkComponent
            href="https://github.com/cevi"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            GitHub
          </LinkComponent>{' '}
          frei zur Verfügung.
        </>
      );
    }
  }
};

const renderHosttechDescription = (locale: Locale): React.ReactNode => {
  switch (locale) {
    case 'en': {
      return (
        <>
          Many thanks also to{' '}
          <LinkComponent
            href="https://www.hosttech.ch"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            hosttech
          </LinkComponent>
          , which provides the server resources for running the website and app free of charge.
        </>
      );
    }
    case 'fr': {
      return (
        <>
          Un grand merci également à{' '}
          <LinkComponent
            href="https://www.hosttech.ch"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            hosttech
          </LinkComponent>
          , qui met gratuitement à disposition les ressources serveur pour le fonctionnement du site
          web et de l&apos;application.
        </>
      );
    }
    default: {
      return (
        <>
          Danke an dieser Stelle auch an{' '}
          <LinkComponent
            href="https://www.hosttech.ch"
            className="font-semibold text-green-900 underline underline-offset-2"
            hideExternalIcon
            openInNewTab
          >
            hosttech
          </LinkComponent>
          , welche die Serverressourcen für den Betrieb von Webseite und App kostenlos zur Verfügung
          stellt.
        </>
      );
    }
  }
};

export const AboutSettings: React.FC<AboutSettingsProperties> = ({ locale, webBuild }) => {
  const nativeApp = useNativeAppInfo();

  let platformName = nativeApp?.platform;
  if (nativeApp?.platform.toLowerCase() === 'ios') {
    platformName = 'iOS';
  } else if (nativeApp?.platform.toLowerCase() === 'android') {
    platformName = 'Android';
  }

  return (
    <div className="space-y-6">
      <section>
        <SectionLabel className="mb-2 px-1">{aboutTitle[locale]}</SectionLabel>
        <SettingsCard>
          {/* Author & Contribution Row */}
          <div className="flex items-start gap-3 px-3.5 py-3">
            <IconTile icon={Heart} />
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] leading-5 font-semibold text-green-900">
                {authorTitle[locale]}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-green-700">
                {renderAuthorDescription(locale)}
              </p>
            </div>
          </div>

          {/* Hosting Sponsor Row */}
          <div className="flex items-start gap-3 px-3.5 py-3">
            <IconTile icon={Server} />
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-green-700">
              {renderHosttechDescription(locale)}
            </p>
          </div>

          {/* Contact Row */}
          <LinkComponent
            href="mailto:info@cevi.tools"
            className="hover:bg-quiet block transition-colors"
            hideExternalIcon
          >
            <SettingsRow
              icon={Mail}
              title={contactTitle[locale]}
              subtitle="Fachgruppe Informatik (info@cevi.tools)"
              subtitleClassName="whitespace-normal text-balance"
              action={<ExternalLink className="h-5 w-5 text-green-500" aria-hidden="true" />}
            />
          </LinkComponent>
        </SettingsCard>
      </section>

      {/* Build Information */}
      {(webBuild !== undefined || Boolean(nativeApp)) && (
        <section>
          <SectionLabel className="mb-2 px-1">{buildInfoTitle[locale]}</SectionLabel>
          <SettingsCard>
            {webBuild && (
              <SettingsRow
                icon={Laptop}
                title={webBuildLabel[locale]}
                subtitle={`v${webBuild.version} (${webBuild.git.hash})`}
                subtitleClassName="font-mono text-xs"
              />
            )}

            {nativeApp && (
              <SettingsRow
                icon={Smartphone}
                title={`${nativeBuildLabel[locale]} (${platformName})`}
                subtitle={`v${nativeApp.version} (${nativeApp.buildNumber})`}
                subtitleClassName="font-mono text-xs"
              />
            )}

            {webBuild?.timestamp && (
              <SettingsRow
                icon={Calendar}
                title={buildDateLabel[locale]}
                subtitle={webBuild.timestamp}
              />
            )}
          </SettingsCard>
        </section>
      )}
    </div>
  );
};
